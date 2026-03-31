import type { Middleware } from '@reduxjs/toolkit'
import type { RootState } from '../../store/store'
import { fetchGamificationStats, levelUpAchieved } from './kanbanSlice'
import { playLevelUpSound } from './confetti/sound'

function isCurrentWeekBeatingPrev(currentWeekPoints: number, prevWeekPoints: number): boolean {
  return currentWeekPoints > prevWeekPoints && currentWeekPoints > 0
}

/**
 * Detects when the user's current-week score crosses above their previous week's
 * total for the first time in a session.  On that transition the middleware:
 *   1. Plays the 8-bit JRPG level-up fanfare.
 *   2. Dispatches `levelUpAchieved` so `GamificationBar` can fire confetti
 *      from the correct DOM position.
 */
export const gamificationMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  if (fetchGamificationStats.fulfilled.match(action)) {
    const prevStats = (storeAPI.getState() as RootState).kanban.gamificationStats
    const newStats = action.payload

    const wasBeating = prevStats
      ? isCurrentWeekBeatingPrev(prevStats.currentWeekPoints, prevStats.prevWeekPoints)
      : false
    const nowBeating = newStats
      ? isCurrentWeekBeatingPrev(newStats.currentWeekPoints, newStats.prevWeekPoints)
      : false

    const result = next(action)

    if (!wasBeating && nowBeating) {
      playLevelUpSound()
      storeAPI.dispatch(levelUpAchieved())
    }

    return result
  }

  return next(action)
}
