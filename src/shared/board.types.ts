/** Maps a label name to a story-point value for analytics calculations. */
export interface StoryPointRule {
  labelName: string
  points: number
}

export interface BoardConfig {
  id: number
  boardId: string
  boardName: string
  apiKey: string
  apiToken: string
  projectCode: string
  nextTicketNumber: number
  doneListNames: string[]
  storyPointsConfig: StoryPointRule[]
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

/** A single card candidate returned by the preview (dry-run) handler. */
export interface DoneCardPreview {
  id: string
  name: string
  listId: string
  listName: string
  enteredDoneAt: string
}

/** Raw debug info for a single done-column card (no threshold applied). */
export interface DoneCardDebugInfo {
  id: string
  name: string
  listId: string
  listName: string
  /** enteredDoneAt: action-based timestamp or date_last_activity fallback */
  enteredDoneAt: string
  /** Trello's own dateLastActivity field for the card */
  dateLastActivity: string
  /** When this app last synced the card (updated every sync) */
  cardSyncedAt: string
  /** 1 if enteredDoneAt came from a real Trello move-action, 0 if it is the fallback */
  hasActionEntry: 0 | 1
}
