export type QueueItemStatus = 'pending' | 'running' | 'done' | 'failed'

export interface QueueItem {
  id: string
  name: string
  status: QueueItemStatus
}

export interface ContextMenuState {
  x: number
  y: number
  card: import('@shared/trello.types').KanbanCard
}

export interface AddCardModal {
  listId: string
  listName: string
  text: string
  /** null = edit phase; non-null = queue/upload phase */
  queue: QueueItem[] | null
  uploading: boolean
}

export interface BulkLabelQueueItem {
  id: string
  cardId: string
  cardName: string
  status: QueueItemStatus
  notFound?: boolean
}

export interface BulkLabelModal {
  /** Labels selected to apply */
  selectedLabelIds: Set<string>
  text: string
  /** null = edit phase; non-null = queue/upload phase */
  queue: BulkLabelQueueItem[] | null
  uploading: boolean
  /** true when triggered from the multi-select bulk action bar (cards come from selectedCardIds) */
  fromSelection?: boolean
}

export interface BulkArchiveQueueItem {
  id: string
  cardId: string
  cardName: string
  status: QueueItemStatus
}

export interface BulkArchiveModal {
  /** null = confirm phase; non-null = progress phase */
  queue: BulkArchiveQueueItem[] | null
  running: boolean
}

export interface BulkMemberQueueItem {
  id: string
  cardId: string
  cardName: string
  status: QueueItemStatus
}

export interface BulkMemberModal {
  memberId: string
  memberName: string
  assign: boolean
  /** null = confirm phase; non-null = progress phase */
  queue: BulkMemberQueueItem[] | null
  running: boolean
}
