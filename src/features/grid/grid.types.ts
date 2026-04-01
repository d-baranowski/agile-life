import type { KanbanCard } from '../../trello/trello.types'

export interface GridRow extends KanbanCard {
  columnId: string
  columnName: string
  storyPoints: number | null
}
