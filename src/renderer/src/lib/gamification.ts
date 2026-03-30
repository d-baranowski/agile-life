/**
 * Returns the CSS width percentage string for a gamification progress bar.
 * When yearlyHighScore is 0 the bar is empty unless the user has points
 * (in which case they are the only data point, so fill 100%).
 */
export function gamificationBarWidth(points: number, yearlyHighScore: number): string {
  if (yearlyHighScore > 0) {
    return `${Math.min((points / yearlyHighScore) * 100, 100)}%`
  }
  return points > 0 ? '100%' : '0%'
}
