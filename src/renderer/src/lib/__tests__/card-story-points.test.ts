/**
 * Tests for cardStoryPoints — maps card labels to story-point values.
 */
import { cardStoryPoints } from '../card-story-points'

const makeCard = (labelNames: string[]) =>
  ({
    id: '1',
    name: 'Test',
    desc: '',
    listId: 'l1',
    pos: 0,
    shortUrl: '',
    labels: labelNames.map((name) => ({ id: name, name, color: 'blue', idBoard: 'b1' })),
    members: [],
    dateLastActivity: new Date().toISOString(),
    epicCardId: null,
    epicCardName: null,
    enteredAt: null
  }) as const

describe('cardStoryPoints', () => {
  const config = [
    { labelName: 'S', points: 1 },
    { labelName: 'M', points: 3 },
    { labelName: 'L', points: 5 },
    { labelName: 'XL', points: 8 }
  ]

  it('returns configured points when a label matches', () => {
    expect(cardStoryPoints(makeCard(['M']), config)).toBe(3)
    expect(cardStoryPoints(makeCard(['L']), config)).toBe(5)
    expect(cardStoryPoints(makeCard(['XL']), config)).toBe(8)
  })

  it('returns the first matching label when multiple labels exist', () => {
    expect(cardStoryPoints(makeCard(['S', 'L']), config)).toBe(1)
    expect(cardStoryPoints(makeCard(['XL', 'M']), config)).toBe(8)
  })

  it('falls back to 1 when no label matches', () => {
    expect(cardStoryPoints(makeCard(['Bug']), config)).toBe(1)
    expect(cardStoryPoints(makeCard([]), config)).toBe(1)
  })

  it('falls back to 1 when config is empty', () => {
    expect(cardStoryPoints(makeCard(['M']), [])).toBe(1)
  })

  it('matches labels case-insensitively', () => {
    expect(cardStoryPoints(makeCard(['m']), config)).toBe(3)
    expect(cardStoryPoints(makeCard(['xl']), config)).toBe(8)
  })

  it('trims whitespace in label names', () => {
    expect(cardStoryPoints(makeCard([' M ']), config)).toBe(3)
  })

  it('trims whitespace in config label names', () => {
    const spaceyConfig = [{ labelName: '  S  ', points: 2 }]
    expect(cardStoryPoints(makeCard(['S']), spaceyConfig)).toBe(2)
  })
})
