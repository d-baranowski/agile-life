/**
 * Tests for fmtDate — localised short date from ISO string.
 */
import { fmtDate } from '../fmt-date'

describe('fmtDate', () => {
  it('formats a valid ISO date into a human-readable string', () => {
    const result = fmtDate('2025-01-15T00:00:00.000Z')
    // Locale-dependent, but should contain year, month abbreviation, and day
    expect(result).toContain('2025')
    expect(result).toContain('15')
  })

  it('returns "Invalid Date" for an unparseable date string', () => {
    expect(fmtDate('not-a-date')).toBe('Invalid Date')
  })

  it('handles edge-case dates', () => {
    const result = fmtDate('2000-06-15T12:00:00.000Z')
    expect(result).toContain('2000')
  })
})
