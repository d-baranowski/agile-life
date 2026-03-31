import { gamificationBarWidth } from '../gamification-bar-width'

describe('gamificationBarWidth', () => {
  it('returns percentage when yearlyHighScore > 0', () => {
    expect(gamificationBarWidth(50, 100)).toBe('50%')
  })

  it('caps at 100% when points exceed yearlyHighScore', () => {
    expect(gamificationBarWidth(150, 100)).toBe('100%')
  })

  it('returns exactly 100% when points equal yearlyHighScore', () => {
    expect(gamificationBarWidth(100, 100)).toBe('100%')
  })

  it('returns 0% when points are 0 and yearlyHighScore > 0', () => {
    expect(gamificationBarWidth(0, 100)).toBe('0%')
  })

  it('returns 100% when yearlyHighScore is 0 but user has points', () => {
    expect(gamificationBarWidth(5, 0)).toBe('100%')
  })

  it('returns 0% when both points and yearlyHighScore are 0', () => {
    expect(gamificationBarWidth(0, 0)).toBe('0%')
  })

  it('computes fractional percentages correctly', () => {
    expect(gamificationBarWidth(1, 4)).toBe('25%')
    expect(gamificationBarWidth(3, 4)).toBe('75%')
  })
})
