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
