export interface BoardConfig {
  id: number
  boardId: string
  boardName: string
  apiKey: string
  apiToken: string
  projectCode: string
  nextTicketNumber: number
  doneListNames: string[]
  createdAt: string
  updatedAt: string
}

export type BoardConfigInput = Omit<BoardConfig, 'id' | 'createdAt' | 'updatedAt'>
