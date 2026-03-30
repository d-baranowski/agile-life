/** Returns a compact human-readable age string for the given ISO timestamp (e.g. "3d", "2h", "45m"). */
export function formatAge(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime()
  if (ms < 0) return '—'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 365) return `${days}d`
  return `${Math.floor(days / 365)}y`
}

/** Returns a relative age label for an ISO date (e.g. "3w", "2d", "today"). */
export function weeksAgo(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'today'
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

/** Formats an ISO date string into a localised short date (e.g. "Jan 15, 2025"). */
export function fmtDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return isoDate
  }
}
