import { fuzzyMatch } from '../fuzzy-match'

describe('fuzzyMatch', () => {
  it('returns true when needle is empty', () => {
    expect(fuzzyMatch('', 'anything')).toBe(true)
  })

  it('returns true when needle equals haystack', () => {
    expect(fuzzyMatch('hello', 'hello')).toBe(true)
  })

  it('returns true when all needle characters appear in order in haystack', () => {
    expect(fuzzyMatch('abc', 'aXbYcZ')).toBe(true)
  })

  it('returns false when needle has characters not in haystack', () => {
    expect(fuzzyMatch('xyz', 'abcdef')).toBe(false)
  })

  it('returns false when needle characters appear out of order', () => {
    expect(fuzzyMatch('ba', 'ab')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(fuzzyMatch('ABC', 'axbxcx')).toBe(true)
    expect(fuzzyMatch('abc', 'AXBXCX')).toBe(true)
  })

  it('returns false when haystack is empty but needle is not', () => {
    expect(fuzzyMatch('a', '')).toBe(false)
  })

  it('returns true when needle is a prefix of haystack', () => {
    expect(fuzzyMatch('fix', 'fix the bug')).toBe(true)
  })

  it('handles repeated characters in needle', () => {
    expect(fuzzyMatch('aaa', 'abacaba')).toBe(true)
    expect(fuzzyMatch('aaaa', 'aaa')).toBe(false)
  })
})
