import type { KanbanColumn, KanbanCard } from '@shared/trello.types'
import type { StoryPointRule } from '@shared/board.types'

/**
 * Returns the story-point value for a card based on its labels.
 * Mirrors the server-side `cardStoryPoints` function in analytics.ts.
 * Falls back to 1 when no label matches any configured rule.
 */
export function cardStoryPoints(card: KanbanCard, config: StoryPointRule[]): number {
  if (!config || config.length === 0) return 1
  const rulesMap = new Map(config.map((r) => [r.labelName.trim().toLowerCase(), r.points]))
  for (const label of card.labels) {
    const pts = rulesMap.get((label.name || '').trim().toLowerCase())
    if (pts !== undefined) return pts
  }
  return 1
}

/** Parse card names from a multiline textarea value (one per non-blank line). */
export function parseCardNames(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

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
