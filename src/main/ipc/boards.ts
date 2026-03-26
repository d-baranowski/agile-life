import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type { BoardConfig, BoardConfigInput, SyncResult } from '@shared/board.types'
import type { TrelloBoard } from '@shared/trello.types'
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
  getDb
} from '../database/db'
import { TrelloClient } from '../trello/client'

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
        const rows = getDb()
          .prepare(
            `SELECT l.id   AS listId,
                    l.name AS listName,
                    COUNT(c.id) AS cardCount
             FROM trello_lists l
             LEFT JOIN trello_cards c
               ON c.list_id = l.id AND c.closed = 0
             WHERE l.board_id = ? AND l.closed = 0
             GROUP BY l.id, l.name
             ORDER BY l.pos ASC`
          )
          .all(boardId) as ColumnCount[]
        return { success: true, data: rows }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
