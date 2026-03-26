/**
 * Typed wrapper around `window.api.invoke` for the renderer process.
 * Provides type-safe helpers for each IPC channel.
 */
import { IPC_CHANNELS } from '@shared/types'
import type {
  BoardConfig,
  BoardConfigInput,
  TrelloBoard,
  TrelloList,
  TrelloCard,
  TrelloMember,
  ColumnCount,
  WeeklyUserStats,
  LabelUserStats,
  CardAgeStats,
  IpcResult
} from '@shared/types'
// These types are defined in the main process but we re-declare them here
// so the renderer doesn't need to import from the main process bundle.
export interface UnnumberedCard {
  cardId: string
  cardName: string
  listName: string
  proposedName: string
}

export interface TicketNumberingConfig {
  projectCode: string
  nextTicketNumber: number
  unnumberedCount: number
}

function invoke<T>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> {
  return window.api.invoke(channel as Parameters<typeof window.api.invoke>[0], ...args) as Promise<
    IpcResult<T>
  >
}

// ─── Boards ───────────────────────────────────────────────────────────────────
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
    sync: (boardId: string) => invoke<void>(IPC_CHANNELS.TRELLO_SYNC, boardId),
    getLists: (boardId: string) => invoke<TrelloList[]>(IPC_CHANNELS.TRELLO_GET_LISTS, boardId),
    getCards: (boardId: string) => invoke<TrelloCard[]>(IPC_CHANNELS.TRELLO_GET_CARDS, boardId),
    getMembers: (boardId: string) =>
      invoke<TrelloMember[]>(IPC_CHANNELS.TRELLO_GET_MEMBERS, boardId)
  },

  analytics: {
    columnCounts: (boardId: string) =>
      invoke<ColumnCount[]>(IPC_CHANNELS.ANALYTICS_COLUMN_COUNTS, boardId),
    weeklyUserStats: (boardId: string) =>
      invoke<WeeklyUserStats[]>(IPC_CHANNELS.ANALYTICS_WEEKLY_USER_STATS, boardId),
    labelUserStats: (boardId: string) =>
      invoke<LabelUserStats[]>(IPC_CHANNELS.ANALYTICS_LABEL_USER_STATS, boardId),
    cardAge: (boardId: string) =>
      invoke<CardAgeStats[]>(IPC_CHANNELS.ANALYTICS_CARD_AGE, boardId)
  },

  tickets: {
    getConfig: (boardId: string) =>
      invoke<TicketNumberingConfig>(IPC_CHANNELS.TICKETS_GET_CONFIG, boardId),
    previewUnnumbered: (boardId: string) =>
      invoke<UnnumberedCard[]>(IPC_CHANNELS.TICKETS_PREVIEW_UNNUMBERED, boardId),
    applyNumbering: (boardId: string) =>
      invoke<{ updated: number; failed: number; errors: string[] }>(
        IPC_CHANNELS.TICKETS_APPLY_NUMBERING,
        boardId
      ),
    updateConfig: (boardId: string, updates: { projectCode?: string; nextTicketNumber?: number }) =>
      invoke<void>(IPC_CHANNELS.TICKETS_UPDATE_CONFIG, boardId, updates)
  }
}
