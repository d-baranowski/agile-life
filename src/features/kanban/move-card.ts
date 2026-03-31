import type { KanbanColumn } from '../../trello/trello.types'

/** Move a card from one column to another. */
export function moveCard(
  columns: KanbanColumn[],
  fromColId: string,
  toColId: string,
  fromIndex: number,
  toIndex: number
): KanbanColumn[] {
  const fromCol = columns.find((c) => c.id === fromColId)
  const toCol = columns.find((c) => c.id === toColId)
  if (!fromCol || !toCol) return columns

  const card = { ...fromCol.cards[fromIndex], listId: toColId }

  const newFromCards = [...fromCol.cards]
  newFromCards.splice(fromIndex, 1)

  const newToCards = [...toCol.cards]
  newToCards.splice(toIndex, 0, card)

  return columns.map((c) => {
    if (c.id === fromColId) return { ...c, cards: newFromCards }
    if (c.id === toColId) return { ...c, cards: newToCards }
    return c
  })
}
