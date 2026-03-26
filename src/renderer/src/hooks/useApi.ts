/**
 * Typed wrapper around window.api.invoke for the renderer process.
 * Only exposes IPC channels that have a registered handler in the main process.
 */
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type { BoardConfig, BoardConfigInput, SyncResult } from '@shared/board.types'
import type { TrelloBoard } from '@shared/trello.types'
import type {
  ColumnCount,
  WeeklyUserStats,
  LabelUserStats,
  CardAgeStats,
  WeeklyHistory
} from '@shared/analytics.types'
import type {
  TicketNumberingConfig,
  UnnumberedCard,
  ApplyNumberingResult
} from '@shared/ticket.types'
import type { DbPathInfo } from '@shared/settings.types'

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
      invoke<TrelloBoard[]>(IPC_CHANNELS.BOARDS_FETCH_FROM_TRELLO, apiKey, apiToken)
  },

  trello: {
    /** Syncs lists + cards for the board and returns a summary. */
    sync: (boardId: string) => invoke<SyncResult>(IPC_CHANNELS.TRELLO_SYNC, boardId)
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
    /** Returns tickets completed per user per week for the past 12 months. */
    weeklyHistory: (boardId: string) =>
      invoke<WeeklyHistory[]>(IPC_CHANNELS.ANALYTICS_WEEKLY_HISTORY, boardId)
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
  }
}
