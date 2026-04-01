import type { Middleware } from '@reduxjs/toolkit'
import { fetchGamificationStats } from './kanbanSlice'
import { playCoinSound } from './confetti/sound'

/**
 * Detects when the gamification score increases after a card is moved to a done
 * column, and plays the coin sound effect as a pure side-effect of the state
 * change rather than coupling it to the drag-drop handler.
 *
 * Reads `currentWeekPoints` from state *before* the fulfilled action is
 * processed, then compares it to the incoming payload. If the score went up,
 * the sound plays.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gamificationSoundMiddleware: Middleware = (storeAPI) => (next) => (action: any) => {
  const prevPoints =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (storeAPI.getState() as any).kanban?.gamificationStats?.currentWeekPoints ?? 0

  const result = next(action)

  if (fetchGamificationStats.fulfilled.match(action)) {
    const newPoints = (action.payload as { currentWeekPoints: number } | null)?.currentWeekPoints
    if (newPoints !== undefined && newPoints > prevPoints) {
      playCoinSound()
    }
  }

  return result
}
