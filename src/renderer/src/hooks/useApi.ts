/**
 * Typed wrapper around window.api.invoke for the renderer process.
 * Only exposes IPC channels that have a registered handler in the main process.
 */
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type { BoardConfig, BoardConfigInput, SyncResult } from '@shared/board.types'
import type { TrelloBoard } from '@shared/trello.types'
import type { ColumnCount } from '@shared/analytics.types'
import type { TicketNumberingConfig, UnnumberedCard, ApplyNumberingResult } from '@shared/ticket.types'

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
      invoke<ColumnCount[]>(IPC_CHANNELS.ANALYTICS_COLUMN_COUNTS, boardId)
  },

  tickets: {
    getConfig: (boardId: string) =>
      invoke<TicketNumberingConfig>(IPC_CHANNELS.TICKETS_GET_CONFIG, boardId),
    previewUnnumbered: (boardId: string) =>
      invoke<UnnumberedCard[]>(IPC_CHANNELS.TICKETS_PREVIEW_UNNUMBERED, boardId),
    applyNumbering: (boardId: string) =>
      invoke<ApplyNumberingResult>(IPC_CHANNELS.TICKETS_APPLY_NUMBERING, boardId),
    updateConfig: (
      boardId: string,
      updates: { projectCode?: string; nextTicketNumber?: number }
    ) => invoke<void>(IPC_CHANNELS.TICKETS_UPDATE_CONFIG, boardId, updates)
  }
}
