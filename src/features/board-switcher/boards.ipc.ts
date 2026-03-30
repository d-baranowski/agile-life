import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../ipc/ipc.types'
import type { IpcResult } from '../ipc/ipc.types'
import type {
  BoardConfig,
  BoardConfigInput,
  SyncResult,
  ArchiveResult,
  DoneCardPreview,
  DoneCardDebugInfo,
  EpicCardOption,
  EpicStory,
  SavedCredentials
} from '../../lib/board.types'
import type { TrelloBoard, KanbanColumn, TrelloMember, TrelloLabel } from '../../trello/trello.types'
import type { ColumnCount } from '../analytics/analytics.types'
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
  archiveCardLocally,
  insertCard,
  updateCardMembers,
  upsertBoardMembers,
  getBoardMembers,
  getCardMembersJson,
  updateCardLabels,
  getCardLabelsJson,
  getBoardLabels,
  upsertActions,
  getLatestActionDate,
  upsertCardListEntry,
  setCardListEntryFallback,
  isCardListEntriesInitialized,
  setCardListEntriesInitialized,
  clearCardListEntriesForBoard,
  getDoneCardsOlderThan,
  getDoneColumnDebug,
  getDb,
  setEpicBoard,
  setMyMember,
  setCardEpic,
  setBulkCardEpic,
  getEpicCardsForBoard,
  getStoriesForEpic,
  getLastSelectedBoardId,
  setLastSelectedBoardId
} from '../../database/db'
import { TrelloClient } from '../../trello/client'
import sqlColumnCounts from '../../database/sql/analytics/column-counts.sql?raw'
import log from '../../lib/logs/logger'

export function registerBoardHandlers(): void {
  // ── Board CRUD ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.BOARDS_GET_ALL, async (): Promise<IpcResult<BoardConfig[]>> => {
    try {
      const boards = getAllBoards()
      log.debug(`[boards] getAll → ${boards.length} board(s)`)
      return { success: true, data: boards }
    } catch (err) {
      log.error('[boards] getAll failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_ADD,
    async (_e, input: BoardConfigInput): Promise<IpcResult<BoardConfig>> => {
      try {
        log.info(`[boards] add boardId=${input.boardId} name="${input.boardName}"`)
        return { success: true, data: addBoard(input) }
      } catch (err) {
        log.error('[boards] add failed:', err)
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
        log.info(`[boards] update boardId=${boardId}`)
        return { success: true, data: updateBoard(boardId, updates) }
      } catch (err) {
        log.error(`[boards] update failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_DELETE,
    async (_e, boardId: string): Promise<IpcResult<void>> => {
      try {
        log.info(`[boards] delete boardId=${boardId}`)
        deleteBoard(boardId)
        return { success: true }
      } catch (err) {
        log.error(`[boards] delete failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Trello credential check + board list ────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_GET_LAST_SELECTED,
    async (): Promise<IpcResult<string | null>> => {
      try {
        const boardId = getLastSelectedBoardId()
        return { success: true, data: boardId ?? null }
      } catch (err) {
        log.error('[boards] getLastSelected failed:', err)
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_SET_LAST_SELECTED,
    async (_e, boardId: string): Promise<IpcResult<void>> => {
      try {
        setLastSelectedBoardId(boardId)
        return { success: true }
      } catch (err) {
        log.error(`[boards] setLastSelected failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_GET_SAVED_CREDENTIALS,
    async (): Promise<IpcResult<SavedCredentials | null>> => {
      try {
        const boards = getAllBoards()
        if (boards.length === 0) return { success: true, data: null }
        const { apiKey, apiToken } = boards[0]
        return { success: true, data: { apiKey, apiToken } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_FETCH_FROM_TRELLO,
    async (_e, apiKey: string, apiToken: string): Promise<IpcResult<TrelloBoard[]>> => {
      try {
        log.info('[boards] fetchFromTrello: validating credentials')
        const client = new TrelloClient(apiKey, apiToken)
        const validation = await client.validateCredentials()
        if (!validation.valid) {
          log.warn('[boards] fetchFromTrello: invalid credentials')
          return { success: false, error: 'Invalid Trello API credentials' }
        }
        const boards = await client.getMemberBoards()
        log.info(
          `[boards] fetchFromTrello: found ${boards.length} board(s) for member "${validation.memberName}"`
        )
        return { success: true, data: boards }
      } catch (err) {
        log.error('[boards] fetchFromTrello failed:', err)
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
        log.info(`[boards] sync start boardId=${boardId}`)
        const config = getBoardById(boardId)
        if (!config) {
          log.warn(`[boards] sync: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        const client = new TrelloClient(config.apiKey, config.apiToken)

        // ── Action fetch strategy ─────────────────────────────────────────────
        // For trello_actions (analytics): use the most recent stored action date
        // as `since`. Returns null when the table is empty → fetches full history.
        // This is independent of card_list_entries_initialized so that users who
        // already had card_list_entries populated by the archive feature still get
        // a full history fetch for analytics on their first sync.
        const latestActionDate = getLatestActionDate(boardId)

        // For card_list_entries (archive-age tracking): check the dedicated flag.
        const needsFullHistory = !isCardListEntriesInitialized(boardId)
        if (needsFullHistory) {
          clearCardListEntriesForBoard(boardId)
        }

        const [freshLists, freshCards, actions, freshMembers] = await Promise.all([
          client.getLists(boardId),
          client.getAllCards(boardId),
          client.getActions(boardId, { since: latestActionDate ?? undefined }),
          client.getMembers(boardId)
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

        upsertBoardMembers(boardId, freshMembers)

        // Persist all actions to trello_actions for analytics queries.
        upsertActions(boardId, actions)

        // Upsert card_list_entries for archive-age tracking.
        // MAX() semantics keep the most-recent move-into-column.
        // FK violations (archived/deleted cards or lists) are silently skipped.
        for (const action of actions) {
          const cardId = action.data.card?.id
          if (!cardId) continue

          try {
            if (action.data.listAfter) {
              // updateCard:idList — card moved from one list to another
              upsertCardListEntry(cardId, action.data.listAfter.id, action.date)
            } else if (action.data.list) {
              // createCard — card was created directly in this list
              upsertCardListEntry(cardId, action.data.list.id, action.date)
            }
          } catch {
            // FK violation: card or list not in local DB — skip this action.
          }
        }

        // Fallback: for cards with no action history at all (older than Trello's
        // retention window), insert date_last_activity as a lower-bound.
        setCardListEntryFallback(boardId)

        // Mark board as initialized so future syncs are incremental.
        setCardListEntriesInitialized(boardId)

        updateBoardSyncTime(boardId)

        const syncedAt = new Date().toISOString()
        log.info(
          `[boards] sync complete boardId=${boardId} lists=${freshLists.length} cards=${freshCards.length} actions=${actions.length}`
        )
        return {
          success: true,
          data: { listCount: freshLists.length, cardCount: freshCards.length, syncedAt }
        }
      } catch (err) {
        log.error(`[boards] sync failed boardId=${boardId}:`, err)
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
        log.debug(`[boards] columnCounts boardId=${boardId} → ${rows.length} row(s)`)
        return { success: true, data: rows }
      } catch (err) {
        log.error(`[boards] columnCounts failed boardId=${boardId}:`, err)
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
        log.debug(
          `[boards] getBoardData boardId=${boardId} lists=${lists.length} cards=${cards.length}`
        )

        const columns: KanbanColumn[] = lists.map((list) => ({
          id: list.id,
          name: list.name,
          pos: list.pos,
          cards: cards
            .filter((c) => c.list_id === list.id)
            .map((c) => ({
              id: c.id,
              name: c.name,
              desc: c.desc,
              listId: c.list_id,
              pos: c.pos,
              shortUrl: c.short_url,
              labels: JSON.parse(c.labels_json),
              members: JSON.parse(c.members_json),
              dateLastActivity: c.date_last_activity,
              epicCardId: c.epic_card_id,
              epicCardName: c.epic_card_name,
              enteredAt: c.entered_at
            }))
        }))

        return { success: true, data: columns }
      } catch (err) {
        log.error(`[boards] getBoardData failed boardId=${boardId}:`, err)
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
    async (
      _e,
      boardId: string,
      cardId: string,
      toListId: string,
      pos: number
    ): Promise<IpcResult<void>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) {
          log.warn(`[boards] moveCard: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        log.info(`[boards] moveCard cardId=${cardId} → listId=${toListId} pos=${pos}`)
        const client = new TrelloClient(config.apiKey, config.apiToken)
        await client.moveCard(cardId, toListId, pos)

        moveCardToList(cardId, toListId, pos)

        return { success: true }
      } catch (err) {
        log.error(`[boards] moveCard failed cardId=${cardId}:`, err)
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
        if (!config) {
          log.warn(`[boards] updateCardPos: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        log.debug(`[boards] updateCardPos cardId=${cardId} pos=${pos}`)
        // Persist locally first so the UI state is always consistent,
        // even if the Trello API call fails.
        updateCardPos(cardId, pos)

        const client = new TrelloClient(config.apiKey, config.apiToken)
        await client.reorderCard(cardId, pos)

        return { success: true }
      } catch (err) {
        log.error(`[boards] updateCardPos failed cardId=${cardId}:`, err)
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
        if (!config) {
          log.warn(`[boards] previewArchiveDoneCards: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        const cutoffDate = new Date(
          Date.now() - olderThanWeeks * 7 * 24 * 60 * 60 * 1000
        ).toISOString()

        const candidates = getDoneCardsOlderThan(boardId, config.doneListNames, cutoffDate)
        log.info(
          `[boards] previewArchiveDoneCards boardId=${boardId} olderThanWeeks=${olderThanWeeks} candidates=${candidates.length}`
        )
        return { success: true, data: candidates }
      } catch (err) {
        log.error(`[boards] previewArchiveDoneCards failed boardId=${boardId}:`, err)
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
        if (!config) {
          log.warn(`[boards] getDoneColumnDebug: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }
        const rows = getDoneColumnDebug(boardId, config.doneListNames)
        log.debug(`[boards] getDoneColumnDebug boardId=${boardId} → ${rows.length} row(s)`)
        return { success: true, data: rows }
      } catch (err) {
        log.error(`[boards] getDoneColumnDebug failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Epic / Story board linking ───────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_SET_EPIC_BOARD,
    async (
      _e,
      storyBoardId: string,
      epicBoardId: string | null
    ): Promise<IpcResult<BoardConfig>> => {
      try {
        const updated = setEpicBoard(storyBoardId, epicBoardId)
        return { success: true, data: updated }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Gamification: set member identity ───────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.BOARDS_SET_MY_MEMBER,
    async (_e, boardId: string, myMemberId: string | null): Promise<IpcResult<BoardConfig>> => {
      try {
        const updated = setMyMember(boardId, myMemberId)
        log.info(`[boards] setMyMember boardId=${boardId} myMemberId=${myMemberId}`)
        return { success: true, data: updated }
      } catch (err) {
        log.error('[boards] setMyMember failed:', err)
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.EPICS_GET_CARDS,
    async (_e, storyBoardId: string): Promise<IpcResult<EpicCardOption[]>> => {
      try {
        const rows = getEpicCardsForBoard(storyBoardId)
        const options: EpicCardOption[] = rows.map((r) => ({
          id: r.id,
          name: r.name,
          listId: r.list_id,
          listName: r.list_name
        }))
        return { success: true, data: options }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.EPICS_SET_CARD_EPIC,
    async (
      _e,
      _boardId: string,
      cardId: string,
      epicCardId: string | null
    ): Promise<IpcResult<void>> => {
      try {
        setCardEpic(cardId, epicCardId)
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.EPICS_SET_BULK_CARD_EPIC,
    async (
      _e,
      _boardId: string,
      cardIds: string[],
      epicCardId: string | null
    ): Promise<IpcResult<void>> => {
      try {
        setBulkCardEpic(cardIds, epicCardId)
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.EPICS_GET_STORIES,
    async (_e, epicCardId: string): Promise<IpcResult<EpicStory[]>> => {
      try {
        const rows = getStoriesForEpic(epicCardId)
        const stories: EpicStory[] = rows.map((r) => ({
          id: r.id,
          name: r.name,
          desc: r.desc,
          listId: r.list_id,
          listName: r.list_name,
          boardName: r.board_name,
          pos: r.pos,
          shortUrl: r.short_url,
          labelsJson: r.labels_json,
          membersJson: r.members_json
        }))
        return { success: true, data: stories }
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
        if (!config) {
          log.warn(`[boards] archiveDoneCards: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        const cutoffDate = new Date(
          Date.now() - olderThanWeeks * 7 * 24 * 60 * 60 * 1000
        ).toISOString()

        const candidates = getDoneCardsOlderThan(boardId, config.doneListNames, cutoffDate)
        log.info(
          `[boards] archiveDoneCards boardId=${boardId} olderThanWeeks=${olderThanWeeks} candidates=${candidates.length}`
        )

        const client = new TrelloClient(config.apiKey, config.apiToken)

        let archivedCount = 0
        let skippedCount = 0

        for (const card of candidates) {
          try {
            await client.archiveCard(card.id)
            log.debug(`[boards] archived card ${card.id} "${card.name}"`)
            archivedCount++
          } catch (err) {
            log.error(`[boards] failed to archive card ${card.id} ("${card.name}"):`, err)
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

        log.info(
          `[boards] archiveDoneCards complete boardId=${boardId} archived=${archivedCount} skipped=${skippedCount}`
        )
        return {
          success: true,
          data: { archivedCount, skippedCount, syncedAt: new Date().toISOString() }
        }
      } catch (err) {
        log.error(`[boards] archiveDoneCards failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Archive a single card (from the context menu) ───────────────────────────
  //
  // Archives the card on Trello and removes it from the local cache so it
  // disappears from the Kanban view immediately without a full re-sync.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_ARCHIVE_CARD,
    async (_e, boardId: string, cardId: string): Promise<IpcResult<void>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) {
          log.warn(`[boards] archiveCard: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        log.info(`[boards] archiveCard cardId=${cardId}`)
        const client = new TrelloClient(config.apiKey, config.apiToken)
        await client.archiveCard(cardId)

        archiveCardLocally(cardId)

        return { success: true }
      } catch (err) {
        log.error(`[boards] archiveCard failed cardId=${cardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Archive multiple cards at once (from the bulk-select action bar) ──────────
  //
  // Archives each card on Trello and removes it from the local cache.
  // Cards that fail individually are skipped; the others are still archived.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_ARCHIVE_CARDS,
    async (
      _e,
      boardId: string,
      cardIds: string[]
    ): Promise<IpcResult<{ archivedCount: number; skippedCount: number }>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) {
          log.warn(`[boards] archiveCards: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        log.info(`[boards] archiveCards boardId=${boardId} count=${cardIds.length}`)
        const client = new TrelloClient(config.apiKey, config.apiToken)

        let archivedCount = 0
        let skippedCount = 0
        for (const cardId of cardIds) {
          try {
            await client.archiveCard(cardId)
            archiveCardLocally(cardId)
            archivedCount++
          } catch (err) {
            log.warn(`[boards] archiveCards: failed to archive cardId=${cardId}:`, err)
            skippedCount++
          }
        }

        return { success: true, data: { archivedCount, skippedCount } }
      } catch (err) {
        log.error(`[boards] archiveCards failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Get board members (reads from local cache) ──────────────────────────────
  //
  // Returns the cached list of board members synced during the last TRELLO_SYNC.
  // Populated automatically on every sync — call TRELLO_SYNC first.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_GET_BOARD_MEMBERS,
    async (_e, boardId: string): Promise<IpcResult<TrelloMember[]>> => {
      try {
        const members = getBoardMembers(boardId)
        log.debug(`[boards] getBoardMembers boardId=${boardId} → ${members.length} member(s)`)
        return { success: true, data: members }
      } catch (err) {
        log.error(`[boards] getBoardMembers failed boardId=${boardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Toggle member assignment on a card ─────────────────────────────────────
  //
  // Adds or removes a member from a card on Trello and updates the local cache.
  // Returns the updated members list for the card.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_ASSIGN_CARD_MEMBER,
    async (
      _e,
      boardId: string,
      cardId: string,
      memberId: string,
      assign: boolean
    ): Promise<IpcResult<TrelloMember[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) {
          log.warn(`[boards] assignCardMember: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        log.info(`[boards] assignCardMember cardId=${cardId} memberId=${memberId} assign=${assign}`)
        const client = new TrelloClient(config.apiKey, config.apiToken)

        if (assign) {
          await client.addCardMember(cardId, memberId)
        } else {
          await client.removeCardMember(cardId, memberId)
        }

        // Read current card members from the local DB and apply the change.
        const membersJson = getCardMembersJson(cardId)
        if (membersJson === undefined) {
          log.warn(`[boards] assignCardMember: card not found cardId=${cardId}`)
          return { success: false, error: `Card not found: ${cardId}` }
        }

        const currentMembers: TrelloMember[] = JSON.parse(membersJson)
        const boardMembers = getBoardMembers(boardId)
        const assignedMember = boardMembers.find((m) => m.id === memberId)

        let updatedMembers: TrelloMember[]
        if (assign && assignedMember) {
          updatedMembers = currentMembers.some((m) => m.id === memberId)
            ? currentMembers
            : [...currentMembers, assignedMember]
        } else {
          updatedMembers = currentMembers.filter((m) => m.id !== memberId)
        }

        updateCardMembers(cardId, updatedMembers)

        return { success: true, data: updatedMembers }
      } catch (err) {
        log.error(`[boards] assignCardMember failed cardId=${cardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Bulk-assign a member to multiple cards ──────────────────────────────────
  //
  // Iterates over each cardId and calls addCardMember / removeCardMember on
  // Trello, then updates the local SQLite cache for each card.  Returns a
  // map of cardId → updated TrelloMember[] so the renderer can patch state.
  ipcMain.handle(
    IPC_CHANNELS.TRELLO_BULK_ASSIGN_MEMBER,
    async (
      _e,
      boardId: string,
      cardIds: string[],
      memberId: string,
      assign: boolean
    ): Promise<IpcResult<Record<string, TrelloMember[]>>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) {
          log.warn(`[boards] bulkAssignMember: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        const client = new TrelloClient(config.apiKey, config.apiToken)
        const boardMembers = getBoardMembers(boardId)
        const assignedMember = boardMembers.find((m) => m.id === memberId)

        const result: Record<string, TrelloMember[]> = {}

        for (const cardId of cardIds) {
          log.info(
            `[boards] bulkAssignMember cardId=${cardId} memberId=${memberId} assign=${assign}`
          )
          if (assign) {
            await client.addCardMember(cardId, memberId)
          } else {
            await client.removeCardMember(cardId, memberId)
          }

          const membersJson = getCardMembersJson(cardId)
          if (membersJson === undefined) {
            log.warn(`[boards] bulkAssignMember: card not found cardId=${cardId}`)
            continue
          }

          const currentMembers: TrelloMember[] = JSON.parse(membersJson)
          let updatedMembers: TrelloMember[]
          if (assign && assignedMember) {
            updatedMembers = currentMembers.some((m) => m.id === memberId)
              ? currentMembers
              : [...currentMembers, assignedMember]
          } else {
            updatedMembers = currentMembers.filter((m) => m.id !== memberId)
          }

          updateCardMembers(cardId, updatedMembers)
          result[cardId] = updatedMembers
        }

        return { success: true, data: result }
      } catch (err) {
        log.error(`[boards] bulkAssignMember failed memberId=${memberId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Create a new card in a list ─────────────────────────────────────────────
  //
  // Creates the card on Trello, then inserts it into the local SQLite cache.
  // Returns the KanbanCard representation so the renderer can add it to the UI.

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_CREATE_CARD,
    async (
      _e,
      boardId: string,
      listId: string,
      name: string
    ): Promise<IpcResult<KanbanColumn['cards'][number]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) {
          log.warn(`[boards] createCard: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        log.info(`[boards] createCard listId=${listId} name="${name}"`)
        const client = new TrelloClient(config.apiKey, config.apiToken)
        const trelloCard = await client.createCard(listId, name)

        insertCard(boardId, trelloCard)

        return {
          success: true,
          data: {
            id: trelloCard.id,
            name: trelloCard.name,
            desc: trelloCard.desc ?? '',
            listId: trelloCard.idList,
            pos: trelloCard.pos,
            shortUrl: trelloCard.shortUrl ?? '',
            labels: trelloCard.labels ?? [],
            members: trelloCard.members ?? [],
            dateLastActivity: trelloCard.dateLastActivity ?? new Date().toISOString(),
            epicCardId: null,
            epicCardName: null,
            enteredAt: null
          }
        }
      } catch (err) {
        log.error(`[boards] createCard failed listId=${listId} name="${name}":`, err)
        return { success: false, error: String(err) }
      }
    }
  )

  // ── Get board labels (fetches from Trello API + merges with local cache) ───

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_GET_BOARD_LABELS,
    async (_e, boardId: string): Promise<IpcResult<TrelloLabel[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) {
          log.warn(`[boards] getBoardLabels: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        const client = new TrelloClient(config.apiKey, config.apiToken)
        const labels = await client.getBoardLabels(boardId)

        // Merge with locally-aggregated labels to also show labels from archived cards.
        const localLabels = getBoardLabels(boardId)
        const seen = new Set<string>(labels.map((l) => l.id))
        for (const l of localLabels) {
          if (!seen.has(l.id)) {
            seen.add(l.id)
            labels.push(l)
          }
        }

        log.debug(`[boards] getBoardLabels boardId=${boardId} → ${labels.length} label(s)`)
        return { success: true, data: labels }
      } catch (err) {
        log.error(`[boards] getBoardLabels failed boardId=${boardId}:`, err)
        // Fall back to locally-aggregated labels if the API call fails.
        try {
          const localLabels = getBoardLabels(boardId)
          return { success: true, data: localLabels }
        } catch {
          return { success: false, error: String(err) }
        }
      }
    }
  )

  // ── Toggle label assignment on a card ──────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.TRELLO_ASSIGN_CARD_LABEL,
    async (
      _e,
      boardId: string,
      cardId: string,
      label: TrelloLabel,
      assign: boolean
    ): Promise<IpcResult<TrelloLabel[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) {
          log.warn(`[boards] assignCardLabel: board not found boardId=${boardId}`)
          return { success: false, error: `Board not found: ${boardId}` }
        }

        log.info(`[boards] assignCardLabel cardId=${cardId} labelId=${label.id} assign=${assign}`)
        const client = new TrelloClient(config.apiKey, config.apiToken)

        if (assign) {
          await client.addCardLabel(cardId, label.id)
        } else {
          await client.removeCardLabel(cardId, label.id)
        }

        // Read current card labels from the local DB and apply the change.
        const labelsJson = getCardLabelsJson(cardId)
        if (labelsJson === undefined) {
          log.warn(`[boards] assignCardLabel: card not found cardId=${cardId}`)
          return { success: false, error: `Card not found: ${cardId}` }
        }

        const currentLabels: TrelloLabel[] = JSON.parse(labelsJson)
        let updatedLabels: TrelloLabel[]
        if (assign) {
          updatedLabels = currentLabels.some((l) => l.id === label.id)
            ? currentLabels
            : [...currentLabels, label]
        } else {
          updatedLabels = currentLabels.filter((l) => l.id !== label.id)
        }

        updateCardLabels(cardId, updatedLabels)

        return { success: true, data: updatedLabels }
      } catch (err) {
        log.error(`[boards] assignCardLabel failed cardId=${cardId}:`, err)
        return { success: false, error: String(err) }
      }
    }
  )
}
