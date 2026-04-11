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

function secondsToHms(total: number): { h: number; m: number; s: number } {
  const s = Math.max(0, Math.floor(total))
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

export function formatDuration(seconds: number): string {
  const { h, m, s } = secondsToHms(seconds)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Render a duration as a compact editable string: "1h 30m 45s", "45m", "12s".
 * Zero-valued units are omitted. Empty result (0 total) becomes "0s".
 */
export function formatDurationInput(seconds: number): string {
  const { h, m, s } = secondsToHms(seconds)
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0) parts.push(`${s}s`)
  return parts.length > 0 ? parts.join(' ') : '0s'
}

/**
 * Parse free-form duration strings into seconds. Returns null on unparseable input.
 *   "1h 30m 45s" / "1h30m" / "90m" / "5400s" / "2:30:00" / "30:00" / "45" (→ minutes)
 */
export function parseDurationString(input: string): number | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return 0

  // hh:mm:ss or mm:ss
  if (/^\d+(:\d+){1,2}$/.test(trimmed)) {
    const parts = trimmed.split(':').map(Number)
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
  }

  // "1h 2m 3s" style
  const re = /(\d+(?:\.\d+)?)\s*(h|m|s)/g
  let match: RegExpExecArray | null
  let total = 0
  let matched = false
  while ((match = re.exec(trimmed)) !== null) {
    matched = true
    const n = Number(match[1])
    if (match[2] === 'h') total += n * 3600
    else if (match[2] === 'm') total += n * 60
    else total += n
  }
  if (matched) return Math.round(total)

  // Plain number → treat as minutes (most common "I worked ~30 on this")
  const plain = Number(trimmed)
  if (!Number.isNaN(plain)) return Math.round(plain * 60)

  return null
}

/** ISO start + duration in seconds → ISO stop. */
export function addSecondsToIso(startIso: string, seconds: number): string {
  return new Date(new Date(startIso).getTime() + seconds * 1000).toISOString()
}
