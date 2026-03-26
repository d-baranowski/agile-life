export interface BoardConfig {
  id: number
  boardId: string
  boardName: string
  apiKey: string
  apiToken: string
  projectCode: string
  nextTicketNumber: number
  doneListNames: string[]
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

export type BoardConfigInput = Omit<BoardConfig, 'id' | 'lastSyncedAt' | 'createdAt' | 'updatedAt'>

/** Returned by the TRELLO_SYNC IPC handler. */
export interface SyncResult {
  listCount: number
  cardCount: number
  syncedAt: string
}

/** Returned by the TRELLO_ARCHIVE_DONE_CARDS IPC handler. */
export interface ArchiveResult {
  archivedCount: number
  skippedCount: number
  syncedAt: string
}
