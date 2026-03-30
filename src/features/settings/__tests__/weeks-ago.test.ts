/**
 * Tests for weeksAgo — relative age label from ISO date.
 */
import { weeksAgo } from '../weeks-ago'

describe('weeksAgo', () => {
  it('returns "today" for current or future timestamps', () => {
    expect(weeksAgo(new Date().toISOString())).toBe('today')
  })

  it('returns days for timestamps less than a week ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString()
    expect(weeksAgo(threeDaysAgo)).toBe('3d')
  })

  it('returns weeks for timestamps a week or more ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60_000).toISOString()
    expect(weeksAgo(twoWeeksAgo)).toBe('2w')
  })

  it('returns weeks for timestamps several weeks ago', () => {
    const fiveWeeksAgo = new Date(Date.now() - 37 * 24 * 60 * 60_000).toISOString()
    expect(weeksAgo(fiveWeeksAgo)).toBe('5w')
  })
})
