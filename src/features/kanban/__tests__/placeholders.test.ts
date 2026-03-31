import { resolvePlaceholders } from '../placeholders'

describe('resolvePlaceholders', () => {
  const fixedDate = new Date(2024, 2, 15) // March 15, 2024 (month is 0-indexed)

  it('replaces {{year}} with the full year', () => {
    expect(resolvePlaceholders('Year: {{year}}', fixedDate)).toBe('Year: 2024')
  })

  it('replaces {{month}} with zero-padded month number', () => {
    expect(resolvePlaceholders('Month: {{month}}', fixedDate)).toBe('Month: 03')
  })

  it('replaces {{month_name}} with the full month name', () => {
    expect(resolvePlaceholders('{{month_name}}', fixedDate)).toBe('March')
  })

  it('replaces {{date}} with YYYY-MM-DD formatted date', () => {
    expect(resolvePlaceholders('Date: {{date}}', fixedDate)).toBe('Date: 2024-03-15')
  })

  it('replaces {{week}} with zero-padded ISO-ish week number', () => {
    const result = resolvePlaceholders('Week {{week}}', fixedDate)
    expect(result).toMatch(/^Week \d{2}$/)
  })

  it('replaces multiple placeholders in a single string', () => {
    const result = resolvePlaceholders('Sprint {{year}}-{{week}} ({{month_name}})', fixedDate)
    expect(result).toContain('2024')
    expect(result).toContain('March')
  })

  it('leaves strings without placeholders unchanged', () => {
    expect(resolvePlaceholders('no placeholders here', fixedDate)).toBe('no placeholders here')
  })

  it('replaces all occurrences of the same placeholder', () => {
    const result = resolvePlaceholders('{{year}} and {{year}}', fixedDate)
    expect(result).toBe('2024 and 2024')
  })

  it('handles January (month 1, single digit padded)', () => {
    const jan = new Date(2024, 0, 5)
    expect(resolvePlaceholders('{{month}}', jan)).toBe('01')
    expect(resolvePlaceholders('{{month_name}}', jan)).toBe('January')
    expect(resolvePlaceholders('{{date}}', jan)).toBe('2024-01-05')
  })

  it('handles December correctly', () => {
    const dec = new Date(2024, 11, 31)
    expect(resolvePlaceholders('{{month_name}}', dec)).toBe('December')
    expect(resolvePlaceholders('{{month}}', dec)).toBe('12')
  })
})
