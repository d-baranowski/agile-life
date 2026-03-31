import { labelColor, labelTextColor } from '../label-colors'

describe('labelColor', () => {
  it('returns correct hex for known Trello label colours', () => {
    expect(labelColor('green')).toBe('#61bd4f')
    expect(labelColor('yellow')).toBe('#f2d600')
    expect(labelColor('orange')).toBe('#ff9f1a')
    expect(labelColor('red')).toBe('#eb5a46')
    expect(labelColor('purple')).toBe('#c377e0')
    expect(labelColor('blue')).toBe('#0079bf')
    expect(labelColor('sky')).toBe('#00c2e0')
    expect(labelColor('lime')).toBe('#51e898')
    expect(labelColor('pink')).toBe('#ff78cb')
    expect(labelColor('black')).toBe('#344563')
  })

  it('returns grey fallback for unknown colour names', () => {
    expect(labelColor('unknown')).toBe('#8892a4')
    expect(labelColor('')).toBe('#8892a4')
    expect(labelColor('magenta')).toBe('#8892a4')
  })
})

describe('labelTextColor', () => {
  it('returns dark text for light backgrounds', () => {
    // lime (#51e898) is a bright light colour
    expect(labelTextColor('#51e898')).toBe('#222')
    // yellow (#f2d600)
    expect(labelTextColor('#f2d600')).toBe('#222')
  })

  it('returns light text for dark backgrounds', () => {
    // black (#344563) is dark
    expect(labelTextColor('#344563')).toBe('#fff')
    // blue (#0079bf) is dark
    expect(labelTextColor('#0079bf')).toBe('#fff')
  })

  it('handles hex strings with # prefix', () => {
    expect(labelTextColor('#ffffff')).toBe('#222')
    expect(labelTextColor('#000000')).toBe('#fff')
  })

  it('handles 3-character hex shorthand', () => {
    expect(labelTextColor('#fff')).toBe('#222')
    expect(labelTextColor('#000')).toBe('#fff')
  })

  it('returns #fff for invalid hex strings', () => {
    expect(labelTextColor('notacolor')).toBe('#fff')
    expect(labelTextColor('#gg0000')).toBe('#fff')
    expect(labelTextColor('#12345')).toBe('#fff')
  })

  it('treats 6-char hex strings without # as valid (# is stripped if present)', () => {
    // 'ffffff' without # passes the regex since all chars are valid hex digits
    expect(labelTextColor('ffffff')).toBe('#222') // white bg → dark text
    expect(labelTextColor('000000')).toBe('#fff') // black bg → light text
  })
})
