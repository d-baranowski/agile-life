/**
 * Tests for moveCard — moves a card between columns.
 */
import { moveCard } from '../move-card'
import type { KanbanColumn, KanbanCard } from '../../trello/trello.types'

function makeCard(id: string, listId: string): KanbanCard {
  return {
    id,
    name: `Card ${id}`,
    desc: '',
    listId,
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

function makeCols(): KanbanColumn[] {
  return [
    { id: 'col1', name: 'To Do', pos: 0, cards: [makeCard('a', 'col1'), makeCard('b', 'col1')] },
    { id: 'col2', name: 'Doing', pos: 1, cards: [makeCard('c', 'col2')] },
    { id: 'col3', name: 'Done', pos: 2, cards: [] }
  ]
}

describe('moveCard', () => {
  it('moves a card from one column to another', () => {
    const result = moveCard(makeCols(), 'col1', 'col2', 0, 1)
    const col1 = result.find((c) => c.id === 'col1')!
    const col2 = result.find((c) => c.id === 'col2')!
    expect(col1.cards.map((c) => c.id)).toEqual(['b'])
    expect(col2.cards.map((c) => c.id)).toEqual(['c', 'a'])
  })

  it('updates the moved card listId to the destination column', () => {
    const result = moveCard(makeCols(), 'col1', 'col2', 0, 0)
    const col2 = result.find((c) => c.id === 'col2')!
    expect(col2.cards[0].listId).toBe('col2')
  })

  it('moves a card to an empty column', () => {
    const result = moveCard(makeCols(), 'col1', 'col3', 0, 0)
    const col3 = result.find((c) => c.id === 'col3')!
    expect(col3.cards).toHaveLength(1)
    expect(col3.cards[0].id).toBe('a')
  })

  it('returns the same columns if fromColId does not exist', () => {
    const cols = makeCols()
    const result = moveCard(cols, 'nonexistent', 'col2', 0, 0)
    expect(result).toBe(cols)
  })

  it('returns the same columns if toColId does not exist', () => {
    const cols = makeCols()
    const result = moveCard(cols, 'col1', 'nonexistent', 0, 0)
    expect(result).toBe(cols)
  })

  it('does not mutate the original columns', () => {
    const cols = makeCols()
    const origCol1Cards = [...cols[0].cards]
    moveCard(cols, 'col1', 'col2', 0, 0)
    expect(cols[0].cards).toEqual(origCol1Cards)
  })

  it('leaves unrelated columns untouched', () => {
    const result = moveCard(makeCols(), 'col1', 'col2', 0, 0)
    const col3 = result.find((c) => c.id === 'col3')!
    expect(col3.cards).toEqual([])
  })
})
