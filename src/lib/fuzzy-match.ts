/** Returns true when every character of `needle` appears in `haystack` in order. */
export function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = needle.toLowerCase()
  const h = haystack.toLowerCase()
  const nLen = n.length
  let ni = 0
  for (let i = 0; i < h.length && ni < nLen; i++) {
    if (h[i] === n[ni]) ni++
  }
  return ni === nLen
}
