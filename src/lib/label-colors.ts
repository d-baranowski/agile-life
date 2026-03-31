/** Trello label colour name → hex colour map. */
const LABEL_COLORS: Record<string, string> = {
  green: '#61bd4f',
  yellow: '#f2d600',
  orange: '#ff9f1a',
  red: '#eb5a46',
  purple: '#c377e0',
  blue: '#0079bf',
  sky: '#00c2e0',
  lime: '#51e898',
  pink: '#ff78cb',
  black: '#344563'
}

/** Returns the hex colour for a Trello label colour name (defaults to grey). */
export function labelColor(color: string): string {
  return LABEL_COLORS[color] ?? '#8892a4'
}

/**
 * Returns '#fff' or '#222' depending on which gives better contrast against
 * the given hex background colour (e.g. '#61bd4f').
 * Uses the WCAG relative-luminance formula.
 */
export function labelTextColor(hex: string): string {
  // Normalise: strip '#', expand 3-char shorthand to 6-char full form
  let c = hex.replace('#', '')
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
  if (c.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(c)) return '#fff'
  const r = parseInt(c.substring(0, 2), 16) / 255
  const g = parseInt(c.substring(2, 4), 16) / 255
  const b = parseInt(c.substring(4, 6), 16) / 255
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.179 ? '#222' : '#fff'
}
