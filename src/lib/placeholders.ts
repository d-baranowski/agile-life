import { MONTH_NAMES } from './month-names'

/** Resolve date-based placeholders in a template string (mirrors server-side logic). */
export function resolvePlaceholders(template: string, now: Date): string {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthPadded = String(month).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const date = `${year}-${monthPadded}-${day}`
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000)
  const adjustedDow = (startOfYear.getDay() + 6) % 7
  const week = String(Math.floor((dayOfYear + adjustedDow) / 7) + 1).padStart(2, '0')
  return template
    .replace(/\{\{year\}\}/g, String(year))
    .replace(/\{\{month\}\}/g, monthPadded)
    .replace(/\{\{month_name\}\}/g, MONTH_NAMES[month - 1])
    .replace(/\{\{week\}\}/g, week)
    .replace(/\{\{date\}\}/g, date)
}
