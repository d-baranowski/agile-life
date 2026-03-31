import type { Middleware } from '@reduxjs/toolkit'
import type { GamificationStats } from '../analytics/analytics.types'
import { fetchGamificationStats, levelUpAchieved } from './kanbanSlice'

function isCurrentWeekBeatingPrev(currentWeekPoints: number, prevWeekPoints: number): boolean {
  return currentWeekPoints > prevWeekPoints && currentWeekPoints > 0
}

/**
 * Detects when the user's current-week score crosses above their previous week's
 * total for the first time in a session.  On that transition the middleware
 * dispatches `levelUpAchieved` so `GamificationBar` can fire confetti and play
 * the level-up fanfare from the correct DOM position.
 *
 * The sound is intentionally NOT played here — `GamificationBar` handles it in
 * its `useEffect` so that audio only fires after a genuine user interaction
 * (e.g. completing a card) rather than on initial load or board switch.
 *
 * We also guard against `prevStats` being `null`: when the app first launches
 * or the user switches board there is no prior baseline, so we skip the
 * celebration to avoid false positives.
 */
export const gamificationMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  if (fetchGamificationStats.fulfilled.match(action)) {
    const state = storeAPI.getState() as { kanban: { gamificationStats: GamificationStats | null } }
    const prevStats = state.kanban.gamificationStats
    const newStats = action.payload

    const wasBeating = prevStats
      ? isCurrentWeekBeatingPrev(prevStats.currentWeekPoints, prevStats.prevWeekPoints)
      : false
    const nowBeating = newStats
      ? isCurrentWeekBeatingPrev(newStats.currentWeekPoints, newStats.prevWeekPoints)
      : false

    const result = next(action)

    if (prevStats !== null && !wasBeating && nowBeating) {
      storeAPI.dispatch(levelUpAchieved())
    }

    return result
  }

  return next(action)
}
