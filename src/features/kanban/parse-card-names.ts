/** Parse card names from a multiline textarea value (one per non-blank line). */
export function parseCardNames(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}
