/** Returns a relative age label for an ISO date (e.g. "3w", "2d", "today"). */
export function weeksAgo(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'today'
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}
