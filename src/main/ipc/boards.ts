import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type { BoardConfig, BoardConfigInput, SyncResult, ArchiveResult } from '@shared/board.types'
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
  updateCardMovedToDone,
  clearMovedToDoneForNonDone,
  setMovedToDoneFallback,
  getDoneCardsOlderThan,
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

  // ── Archive done cards older than N weeks ───────────────────────────────────
  //
  // 1. Look up the board's configured "done" list names.
  // 2. Query local cache for open cards in those lists whose last activity
  //    is older than the requested number of weeks.
  // 3. Archive each matching card on Trello via PUT /cards/{id}?closed=true.
  // 4. Run a full sync so the local cache reflects the new archived state.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_ARCHIVE_DONE_CARDS,
    async (_e, boardId: string, olderThanWeeks: number): Promise<IpcResult<ArchiveResult>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board not found: ${boardId}` }

        const cutoffDate = new Date(
          Date.now() - olderThanWeeks * 7 * 24 * 60 * 60 * 1000
        ).toISOString()

        const candidates = getDoneCardsOlderThan(boardId, config.doneListNames, cutoffDate)

        const client = new TrelloClient(config.apiKey, config.apiToken)

        let archivedCount = 0
        let skippedCount = 0

        for (const card of candidates) {
          try {
            await client.archiveCard(card.id)
            archivedCount++
          } catch (err) {
            console.error(`Failed to archive card ${card.id} ("${card.name}"):`, String(err))
            skippedCount++
          }
        }

        // Re-sync so the local cache reflects archived state
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

        return {
          success: true,
          data: { archivedCount, skippedCount, syncedAt: new Date().toISOString() }
        }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
