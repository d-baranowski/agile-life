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
 *
 * When the previous stats are `null` (initial load or after switching
 * boards/tabs) the sound is suppressed — the score going from "unknown" to a
 * real value is not a genuine increase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gamificationSoundMiddleware: Middleware = (storeAPI) => (next) => (action: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevStats = (storeAPI.getState() as any).kanban?.gamificationStats ?? null

  const result = next(action)

  if (fetchGamificationStats.fulfilled.match(action)) {
    // Skip when stats are being loaded for the first time (null → populated).
    // This avoids playing the coin sound when the user switches tabs/boards
    // and the stats are re-fetched after being reset.
    if (prevStats === null) return result

    const prevPoints: number = prevStats.currentWeekPoints ?? 0
    const newPoints = (action.payload as { currentWeekPoints: number } | null)?.currentWeekPoints
    if (newPoints !== undefined && newPoints > prevPoints) {
      playCoinSound()
    }
  }

  return result
}
