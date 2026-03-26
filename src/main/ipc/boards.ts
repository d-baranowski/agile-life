import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type {
  BoardConfig,
  BoardConfigInput,
  SyncResult,
  ArchiveResult,
  DoneCardPreview,
  DoneCardDebugInfo
} from '@shared/board.types'
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
  upsertCardListEntry,
  setCardListEntryFallback,
  isCardListEntriesInitialized,
  setCardListEntriesInitialized,
  clearCardListEntriesForBoard,
  getDoneCardsOlderThan,
  getDoneColumnDebug,
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
  // Flow:
  //  1. Fetch all open lists and cards from Trello
  //  2. Upsert lists  →  mark lists absent from response as closed
  //  3. Upsert cards  →  mark cards absent from response as closed
  //  4. Determine whether a full or incremental action fetch is needed:
  //       • card_list_entries_initialized = 0  →  full fetch
  //         Delete ALL existing card_list_entries for the board first so stale
  //         "today" rows (written by old code that used synced_at as the
  //         fallback) cannot survive and block correct historical timestamps
  //         from being stored via MAX() semantics in the upsert.
  //       • card_list_entries_initialized = 1  →  incremental fetch since
  //         last_synced_at
  //  5. Upsert card_list_entries from actions (updateCard:idList, createCard)
  //  6. Fallback: for cards with no action history at all (older than Trello's
  //     retention window), insert date_last_activity as a lower-bound
  //  7. Mark the board as initialized (no-op on subsequent syncs)
  //  8. Stamp board row with last_synced_at
  //
  // Running this handler N times is safe — every step is fully idempotent once
  // initialized; the clear+full-fetch in step 4 only runs once per board.

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

        // Fetch card-movement actions.
        // On the first sync (or after an upgrade from a version that lacked this
        // flag): clear any stale entries and fetch the full board history so
        // entered_at reflects real Trello action dates, not today.
        // Subsequent syncs only fetch actions since last_synced_at.
        const needsFullHistory = !isCardListEntriesInitialized(boardId)
        if (needsFullHistory) {
          clearCardListEntriesForBoard(boardId)
        }
        const actions = await client.getActions(
          boardId,
          needsFullHistory ? {} : { since: config.lastSyncedAt ?? undefined }
        )

        // Upsert an entry for every action that placed a card in a list.
        // MAX() semantics in the SQL mean the most-recent move-into-column wins,
        // which is correct for tracking "when did the card last enter this column".
        for (const action of actions) {
          const cardId = action.data.card?.id
          if (!cardId) continue

          if (action.data.listAfter) {
            // updateCard:idList — card moved from one list to another
            upsertCardListEntry(cardId, action.data.listAfter.id, action.date)
          } else if (action.data.list) {
            // createCard — card was created directly in this list
            upsertCardListEntry(cardId, action.data.list.id, action.date)
          }
        }

        // Fallback: for cards with no action entry at all (predating Trello's
        // action history retention), use date_last_activity as a lower-bound.
        setCardListEntryFallback(boardId)

        // Mark this board as fully initialized so future syncs are incremental.
        setCardListEntriesInitialized(boardId)

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

  // ── Preview: which done cards would be archived? ────────────────────────────
  //
  // Dry-run version of TRELLO_ARCHIVE_DONE_CARDS: returns the list of cards
  // that *would* be archived without actually touching Trello.  The UI shows
  // this to the user before they confirm the destructive operation.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_PREVIEW_ARCHIVE_DONE_CARDS,
    async (_e, boardId: string, olderThanWeeks: number): Promise<IpcResult<DoneCardPreview[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board not found: ${boardId}` }

        const cutoffDate = new Date(
          Date.now() - olderThanWeeks * 7 * 24 * 60 * 60 * 1000
        ).toISOString()

        const candidates = getDoneCardsOlderThan(boardId, config.doneListNames, cutoffDate)
        return { success: true, data: candidates }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Debug: all done-column cards with raw timestamp data ───────────────────
  //
  // Returns every open card in the configured done list(s) without any time
  // filter, exposing enteredDoneAt, dateLastActivity, synced_at, and a flag
  // indicating whether the timestamp came from a real Trello action or the
  // date_last_activity fallback.  Lets the user diagnose why cards are (or are
  // not) picked up by the archive threshold.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_GET_DONE_COLUMN_DEBUG,
    async (_e, boardId: string): Promise<IpcResult<DoneCardDebugInfo[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board not found: ${boardId}` }
        const rows = getDoneColumnDebug(boardId, config.doneListNames)
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
