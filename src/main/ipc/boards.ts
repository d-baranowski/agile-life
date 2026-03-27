import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type { BoardConfig, BoardConfigInput, SyncResult } from '@shared/board.types'
import type { TrelloBoard, KanbanColumn } from '@shared/trello.types'
import type { ColumnCount } from '@shared/analytics.types'
import {
  getAllBoards,
  addBoard,
  updateBoard,
  deleteBoard,
  getBoardById,
  upsertLists,
  markRemovedLists,
  upsertCards,
  markRemovedCards,
  updateBoardSyncTime,
  getListsForBoard,
  getCardsForBoard,
  moveCardToList,
  updateCardPos,
  getDb
} from '../database/db'
import { TrelloClient } from '../trello/client'
import sqlColumnCounts from '../database/sql/analytics/column-counts.sql?raw'

export function registerBoardHandlers(): void {
  // ── Board CRUD ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.BOARDS_GET_ALL, async (): Promise<IpcResult<BoardConfig[]>> => {
    try {
      return { success: true, data: getAllBoards() }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_ADD,
    async (_e, input: BoardConfigInput): Promise<IpcResult<BoardConfig>> => {
      try {
        return { success: true, data: addBoard(input) }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_UPDATE,
    async (
      _e,
      boardId: string,
      updates: Partial<BoardConfigInput>
    ): Promise<IpcResult<BoardConfig>> => {
      try {
        return { success: true, data: updateBoard(boardId, updates) }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_DELETE,
    async (_e, boardId: string): Promise<IpcResult<void>> => {
      try {
        deleteBoard(boardId)
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Trello credential check + board list ────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_FETCH_FROM_TRELLO,
    async (_e, apiKey: string, apiToken: string): Promise<IpcResult<TrelloBoard[]>> => {
      try {
        const client = new TrelloClient(apiKey, apiToken)
        const validation = await client.validateCredentials()
        if (!validation.valid) {
          return { success: false, error: 'Invalid Trello API credentials' }
        }
        return { success: true, data: await client.getMemberBoards() }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Full board sync ─────────────────────────────────────────────────────────
  //
  // This is the core of the POC.  The flow is:
  //
  //  1. Fetch all open lists from Trello
  //  2. Fetch all open cards from Trello
  //  3. Upsert lists  →  mark lists absent from Trello response as closed
  //  4. Upsert cards  →  mark cards absent from Trello response as closed
  //  5. Stamp board row with last_synced_at
  //
  // Running this handler N times is safe — each run is fully idempotent.
  // A card that moves between columns gets its list_id updated by the upsert
  // so subsequent column-count queries automatically reflect the new position.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_SYNC,
    async (_e, boardId: string): Promise<IpcResult<SyncResult>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board not found: ${boardId}` }

        const client = new TrelloClient(config.apiKey, config.apiToken)

        const [freshLists, freshCards] = await Promise.all([
          client.getLists(boardId),
          client.getCards(boardId)
        ])

        upsertLists(boardId, freshLists)
        markRemovedLists(
          boardId,
          freshLists.map((l) => l.id)
        )

        upsertCards(boardId, freshCards)
        markRemovedCards(
          boardId,
          freshCards.map((c) => c.id)
        )

        updateBoardSyncTime(boardId)

        const syncedAt = new Date().toISOString()
        return {
          success: true,
          data: { listCount: freshLists.length, cardCount: freshCards.length, syncedAt }
        }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Column counts (reads from local cache) ──────────────────────────────────
  //
  // Returns the card count for every open list on the board.
  // Always reads from the local SQLite cache — call TRELLO_SYNC first.

  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_COLUMN_COUNTS,
    async (_e, boardId: string): Promise<IpcResult<ColumnCount[]>> => {
      try {
        const rows = getDb().prepare(sqlColumnCounts).all(boardId) as ColumnCount[]
        return { success: true, data: rows }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Kanban board data (reads from local cache) ───────────────────────────────
  //
  // Returns lists with their cards grouped, for rendering the kanban view.
  // Always reads from the local SQLite cache — call TRELLO_SYNC first.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_GET_BOARD_DATA,
    async (_e, boardId: string): Promise<IpcResult<KanbanColumn[]>> => {
      try {
        const lists = getListsForBoard(boardId)
        const cards = getCardsForBoard(boardId)

        const columns: KanbanColumn[] = lists.map((list) => ({
          id: list.id,
          name: list.name,
          pos: list.pos,
          cards: cards
            .filter((c) => c.list_id === list.id)
            .map((c) => ({
              id: c.id,
              name: c.name,
              listId: c.list_id,
              pos: c.pos,
              shortUrl: c.short_url,
              labels: JSON.parse(c.labels_json),
              members: JSON.parse(c.members_json),
              dateLastActivity: c.date_last_activity
            }))
        }))

        return { success: true, data: columns }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Move card (optimistic — caller has already updated the UI) ───────────────
  //
  // Calls the Trello API to move the card, then updates the local SQLite cache.
  // On any error the renderer must revert its optimistic update.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_MOVE_CARD,
    async (_e, boardId: string, cardId: string, toListId: string): Promise<IpcResult<void>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board not found: ${boardId}` }

        const client = new TrelloClient(config.apiKey, config.apiToken)
        await client.moveCard(cardId, toListId)

        moveCardToList(cardId, toListId)

        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Update card position (calls Trello API + persists to local DB) ──────────

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_UPDATE_CARD_POS,
    async (_e, boardId: string, cardId: string, pos: number): Promise<IpcResult<void>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board not found: ${boardId}` }

        // Persist locally first so the UI state is always consistent,
        // even if the Trello API call fails.
        updateCardPos(cardId, pos)

        const client = new TrelloClient(config.apiKey, config.apiToken)
        await client.reorderCard(cardId, pos)

        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
