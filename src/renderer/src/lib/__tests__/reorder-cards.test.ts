/**
 * Tests for reorderCards — reorders cards within the same column.
 */
import { reorderCards } from '../reorder-cards'
import type { KanbanCard } from '@shared/trello.types'

function makeCard(id: string): KanbanCard {
  return {
    id,
    name: `Card ${id}`,
    desc: '',
    listId: 'col1',
    pos: 0,
    shortUrl: '',
    labels: [],
    members: [],
    dateLastActivity: new Date().toISOString(),
    epicCardId: null,
    epicCardName: null,
    enteredAt: null
  }
}

describe('reorderCards', () => {
  it('moves a card from one position to another', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')]
    const result = reorderCards(cards, 0, 2)
    expect(result.map((c) => c.id)).toEqual(['b', 'c', 'a'])
  })

  it('moves a card backward', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')]
    const result = reorderCards(cards, 2, 0)
    expect(result.map((c) => c.id)).toEqual(['c', 'a', 'b'])
  })

  it('returns an identical order when from equals to', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')]
    const result = reorderCards(cards, 1, 1)
    expect(result.map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the original array', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')]
    const copy = [...cards]
    reorderCards(cards, 0, 2)
    expect(cards).toEqual(copy)
  })
})
