export interface CardTimerEntry {
  id: string
  boardId: string
  cardId: string
  startedAt: string
  stoppedAt: string | null
  durationSeconds: number
  note: string
  trelloCommentId: string | null
  createdAt: string
  updatedAt: string
}

export interface TimerEntryEdit {
  startedAt: string
  stoppedAt: string | null
  durationSeconds: number
  note: string
}
