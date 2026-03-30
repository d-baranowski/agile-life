/**
 * Tests for formatAge — compact human-readable age string from ISO timestamp.
 */
import { formatAge } from '../renderer/src/lib/format-age'

describe('formatAge', () => {
  it('returns minutes for timestamps less than 1 hour ago', () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60_000).toISOString()
    expect(formatAge(thirtyMinAgo)).toBe('30m')
  })

  it('returns 0m for a timestamp just now', () => {
    expect(formatAge(new Date().toISOString())).toBe('0m')
  })

  it('returns hours for timestamps between 1 and 24 hours ago', () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60_000).toISOString()
    expect(formatAge(fiveHoursAgo)).toBe('5h')
  })

  it('returns days for timestamps between 1 and 365 days ago', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60_000).toISOString()
    expect(formatAge(tenDaysAgo)).toBe('10d')
  })

  it('returns years for timestamps over 365 days ago', () => {
    const twoPlusYearsAgo = new Date(Date.now() - 800 * 24 * 60 * 60_000).toISOString()
    expect(formatAge(twoPlusYearsAgo)).toBe('2y')
  })

  it('returns — for future timestamps', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(formatAge(future)).toBe('—')
  })
})
