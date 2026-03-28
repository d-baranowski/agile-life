/**
 * Typed wrapper around window.api.invoke for the renderer process.
 * Only exposes IPC channels that have a registered handler in the main process.
 */
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type {
  BoardConfig,
  BoardConfigInput,
  SyncResult,
  ArchiveResult,
  DoneCardPreview,
  DoneCardDebugInfo,
  EpicCardOption,
  EpicStory,
  StoryPointRule
} from '@shared/board.types'
import type { TrelloBoard, KanbanColumn, TrelloMember } from '@shared/trello.types'
import type {
  ColumnCount,
  WeeklyUserStats,
  LabelUserStats,
  CardAgeStats,
  WeeklyHistory,
  StoryPointsUserStats
} from '@shared/analytics.types'
import type {
  TicketNumberingConfig,
  UnnumberedCard,
  ApplyNumberingResult
} from '@shared/ticket.types'
import type { DbPathInfo, LogPathInfo } from '@shared/settings.types'

function invoke<T>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> {
  return window.api.invoke(channel as Parameters<typeof window.api.invoke>[0], ...args) as Promise<
    IpcResult<T>
  >
}

export const api = {
  boards: {
    getAll: () => invoke<BoardConfig[]>(IPC_CHANNELS.BOARDS_GET_ALL),
    add: (input: BoardConfigInput) => invoke<BoardConfig>(IPC_CHANNELS.BOARDS_ADD, input),
    update: (boardId: string, updates: Partial<BoardConfigInput>) =>
      invoke<BoardConfig>(IPC_CHANNELS.BOARDS_UPDATE, boardId, updates),
    delete: (boardId: string) => invoke<void>(IPC_CHANNELS.BOARDS_DELETE, boardId),
    fetchFromTrello: (apiKey: string, apiToken: string) =>
      invoke<TrelloBoard[]>(IPC_CHANNELS.BOARDS_FETCH_FROM_TRELLO, apiKey, apiToken),
    setEpicBoard: (storyBoardId: string, epicBoardId: string | null) =>
      invoke<BoardConfig>(IPC_CHANNELS.BOARDS_SET_EPIC_BOARD, storyBoardId, epicBoardId)
  },

  trello: {
    /** Syncs lists + cards for the board and returns a summary. */
    sync: (boardId: string) => invoke<SyncResult>(IPC_CHANNELS.TRELLO_SYNC, boardId),
    /** Returns columns with their cards from the local SQLite cache. */
    getBoardData: (boardId: string) =>
      invoke<KanbanColumn[]>(IPC_CHANNELS.TRELLO_GET_BOARD_DATA, boardId),
    /** Moves a card to a different list on Trello and updates the local cache. */
    moveCard: (boardId: string, cardId: string, toListId: string, pos: number) =>
      invoke<void>(IPC_CHANNELS.TRELLO_MOVE_CARD, boardId, cardId, toListId, pos),
    /** Updates the position of a card on Trello and in the local cache. */
    updateCardPos: (boardId: string, cardId: string, pos: number) =>
      invoke<void>(IPC_CHANNELS.TRELLO_UPDATE_CARD_POS, boardId, cardId, pos),
    /** Dry-run: returns cards that would be archived without touching Trello. */
    previewArchiveDoneCards: (boardId: string, olderThanWeeks: number) =>
      invoke<DoneCardPreview[]>(
        IPC_CHANNELS.TRELLO_PREVIEW_ARCHIVE_DONE_CARDS,
        boardId,
        olderThanWeeks
      ),
    /** Debug: all done-column cards with raw timestamp data (no threshold). */
    getDoneColumnDebug: (boardId: string) =>
      invoke<DoneCardDebugInfo[]>(IPC_CHANNELS.TRELLO_GET_DONE_COLUMN_DEBUG, boardId),
    /** Archives a single card on Trello and removes it from the local cache. */
    archiveCard: (boardId: string, cardId: string) =>
      invoke<void>(IPC_CHANNELS.TRELLO_ARCHIVE_CARD, boardId, cardId),
    /** Archives multiple cards on Trello and removes them from the local cache. */
    archiveCards: (boardId: string, cardIds: string[]) =>
      invoke<{ archivedCount: number; skippedCount: number }>(
        IPC_CHANNELS.TRELLO_ARCHIVE_CARDS,
        boardId,
        cardIds
      ),
    /** Returns the cached list of board members from the last sync. */
    getBoardMembers: (boardId: string) =>
      invoke<TrelloMember[]>(IPC_CHANNELS.TRELLO_GET_BOARD_MEMBERS, boardId),
    /** Adds or removes a member assignment on a card and returns the updated member list. */
    assignCardMember: (boardId: string, cardId: string, memberId: string, assign: boolean) =>
      invoke<TrelloMember[]>(
        IPC_CHANNELS.TRELLO_ASSIGN_CARD_MEMBER,
        boardId,
        cardId,
        memberId,
        assign
      ),
    /** Creates a new card on Trello and in the local cache, returns the new KanbanCard. */
    createCard: (boardId: string, listId: string, name: string) =>
      invoke<KanbanColumn['cards'][number]>(IPC_CHANNELS.TRELLO_CREATE_CARD, boardId, listId, name),
    /** Archives open cards in the "done" lists that have been in done for olderThanWeeks weeks. */
    archiveDoneCards: (boardId: string, olderThanWeeks: number) =>
      invoke<ArchiveResult>(IPC_CHANNELS.TRELLO_ARCHIVE_DONE_CARDS, boardId, olderThanWeeks)
  },

  analytics: {
    /** Returns card counts per open column, read from local cache. */
    columnCounts: (boardId: string) =>
      invoke<ColumnCount[]>(IPC_CHANNELS.ANALYTICS_COLUMN_COUNTS, boardId),
    /** Returns cards closed per user in the last 7 days, grouped by ISO week. */
    weeklyUserStats: (boardId: string) =>
      invoke<WeeklyUserStats[]>(IPC_CHANNELS.ANALYTICS_WEEKLY_USER_STATS, boardId),
    /** Returns closed cards grouped by label + user in the last 7 days. */
    labelUserStats: (boardId: string) =>
      invoke<LabelUserStats[]>(IPC_CHANNELS.ANALYTICS_LABEL_USER_STATS, boardId),
    /** Returns age in days for every open card. */
    cardAge: (boardId: string) => invoke<CardAgeStats[]>(IPC_CHANNELS.ANALYTICS_CARD_AGE, boardId),
    /** Returns story points completed per user per week for the past 12 months. */
    weeklyHistory: (boardId: string, storyPointsConfig: StoryPointRule[] = []) =>
      invoke<WeeklyHistory[]>(IPC_CHANNELS.ANALYTICS_WEEKLY_HISTORY, boardId, storyPointsConfig),
    /** Returns story points completed per user in the last 7 days. */
    storyPoints7d: (boardId: string, storyPointsConfig: StoryPointRule[] = []) =>
      invoke<StoryPointsUserStats[]>(
        IPC_CHANNELS.ANALYTICS_STORY_POINTS_7D,
        boardId,
        storyPointsConfig
      )
  },

  tickets: {
    getConfig: (boardId: string) =>
      invoke<TicketNumberingConfig>(IPC_CHANNELS.TICKETS_GET_CONFIG, boardId),
    previewUnnumbered: (boardId: string) =>
      invoke<UnnumberedCard[]>(IPC_CHANNELS.TICKETS_PREVIEW_UNNUMBERED, boardId),
    applyNumbering: (boardId: string) =>
      invoke<ApplyNumberingResult>(IPC_CHANNELS.TICKETS_APPLY_NUMBERING, boardId),
    applySingleCard: (boardId: string, cardId: string, newName: string) =>
      invoke<void>(IPC_CHANNELS.TICKETS_APPLY_SINGLE_CARD, boardId, cardId, newName),
    updateConfig: (boardId: string, updates: { projectCode?: string; nextTicketNumber?: number }) =>
      invoke<void>(IPC_CHANNELS.TICKETS_UPDATE_CONFIG, boardId, updates)
  },

  settings: {
    /** Returns the current database file path and whether it is a custom path. */
    getDbPath: () => invoke<DbPathInfo>(IPC_CHANNELS.SETTINGS_GET_DB_PATH),
    /**
     * Opens a native save dialog so the user can choose a new database
     * location, copies the existing DB file there, and persists the choice.
     * Pass `resetToDefault = true` to restore the built-in userData path.
     * Changes take effect after restarting the app.
     */
    setDbPath: (resetToDefault = false) =>
      invoke<DbPathInfo>(IPC_CHANNELS.SETTINGS_SET_DB_PATH, resetToDefault)
  },

  logs: {
    /** Returns the current log file path info (path, default path, isCustom). */
    getPath: () => invoke<LogPathInfo>(IPC_CHANNELS.LOGS_GET_PATH),
    /** Opens the log folder in the native file manager. */
    openFolder: () => invoke<void>(IPC_CHANNELS.LOGS_OPEN_FOLDER),
    /**
     * Opens a native folder-picker dialog and moves log output to the chosen
     * folder (as "main.log").  Pass `resetToDefault = true` to restore the
     * electron-log default location.  Takes effect immediately.
     */
    setPath: (resetToDefault = false) =>
      invoke<LogPathInfo>(IPC_CHANNELS.LOGS_SET_PATH, resetToDefault)
  },

  epics: {
    /** Returns all open cards from the linked epic board for assignment. */
    getCards: (storyBoardId: string) =>
      invoke<EpicCardOption[]>(IPC_CHANNELS.EPICS_GET_CARDS, storyBoardId),
    /** Assigns or clears the epic for a story card. */
    setCardEpic: (boardId: string, cardId: string, epicCardId: string | null) =>
      invoke<void>(IPC_CHANNELS.EPICS_SET_CARD_EPIC, boardId, cardId, epicCardId),
    /** Returns all story cards assigned to the given epic card. */
    getStories: (epicCardId: string) =>
      invoke<EpicStory[]>(IPC_CHANNELS.EPICS_GET_STORIES, epicCardId)
  }
}
