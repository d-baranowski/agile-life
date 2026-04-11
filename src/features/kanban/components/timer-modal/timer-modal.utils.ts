/** Convert an ISO string to a `datetime-local` input value (local timezone). */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Convert a `datetime-local` input value back to an ISO string. */
export function localInputToIso(local: string): string {
  if (!local) return ''
  return new Date(local).toISOString()
}

export function secondsToHms(total: number): { h: number; m: number; s: number } {
  const s = Math.max(0, Math.floor(total))
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

export function hmsToSeconds(h: number, m: number, s: number): number {
  return Math.max(0, h * 3600 + m * 60 + s)
}

export function formatDuration(seconds: number): string {
  const { h, m, s } = secondsToHms(seconds)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
