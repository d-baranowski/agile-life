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
