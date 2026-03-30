/**
 * Tests for parseCardNames — splits multiline textarea input into card names.
 */
import { parseCardNames } from '../renderer/src/lib/parse-card-names'

describe('parseCardNames', () => {
  it('splits multiple lines into card names', () => {
    expect(parseCardNames('Task A\nTask B\nTask C')).toEqual(['Task A', 'Task B', 'Task C'])
  })

  it('trims whitespace from each line', () => {
    expect(parseCardNames('  Task A  \n  Task B  ')).toEqual(['Task A', 'Task B'])
  })

  it('filters out blank lines', () => {
    expect(parseCardNames('Task A\n\n\nTask B\n')).toEqual(['Task A', 'Task B'])
  })

  it('filters out whitespace-only lines', () => {
    expect(parseCardNames('Task A\n   \nTask B')).toEqual(['Task A', 'Task B'])
  })

  it('returns an empty array for empty input', () => {
    expect(parseCardNames('')).toEqual([])
  })

  it('returns an empty array for whitespace-only input', () => {
    expect(parseCardNames('   \n   \n   ')).toEqual([])
  })

  it('handles a single line', () => {
    expect(parseCardNames('Just one task')).toEqual(['Just one task'])
  })
})
