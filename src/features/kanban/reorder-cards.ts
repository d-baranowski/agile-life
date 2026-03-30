import type { KanbanCard } from '../../trello/trello.types'

/** Reorder cards within the same column by moving a card from one index to another. */
export function reorderCards(
  cards: KanbanCard[],
  fromIndex: number,
  toIndex: number
): KanbanCard[] {
  const result = [...cards]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result
}
