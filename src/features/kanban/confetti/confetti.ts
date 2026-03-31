import confetti from 'canvas-confetti'
import { playCoinSound, playLevelUpSound } from './sound'

/**
 * Fires a confetti burst and plays a coin sound to celebrate completing a task.
 * The number of particles scales with the card's story-point value.
 * @param points  Story-point value of the completed card.
 * @param origin  Fractional viewport position {x, y} where the burst starts.
 *                Defaults to the centre of the screen when omitted.
 */
export function triggerDoneEffect(points: number, origin?: { x: number; y: number }): void {
  const particleCount = Math.min(points * 10, 150)
  const label = `+${points}`
  const textShape = confetti.shapeFromText({ text: label, scalar: 1, color: '#FFD700' })
  const textShape2 = confetti.shapeFromText({ text: label, scalar: 1, color: '#d0b209d4' })
  const textShape3 = confetti.shapeFromText({ text: label, scalar: 1, color: '#e7d10c' })

  confetti({
    particleCount,
    spread: 50,
    origin: origin ?? { x: 0.5, y: 0.55 },
    shapes: [textShape, textShape2, textShape3],
    scalar: 1.2,
    ticks: 70,
    gravity: 3,
    startVelocity: 25,
    drift: 0.5,
    flat: true
  })
  playCoinSound()
}

/**
 * Fires a standard confetti burst to celebrate beating last week's score.
 * Uses classic square/circle shapes (not text, not flat) so it looks like
 * a traditional confetti celebration.
 * @param origin  Fractional viewport position {x, y} where the burst starts.
 *                Defaults to the top-centre of the screen when omitted.
 */
export function triggerLevelUpEffect(origin?: { x: number; y: number }): void {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: origin ?? { x: 0.5, y: 0.1 },
    startVelocity: 40,
    gravity: 1.2,
    ticks: 250,
    colors: ['#FFD700', '#4caf50', '#2196f3', '#ff5722', '#9c27b0', '#ff9800', '#e91e63']
  })
  playLevelUpSound()
}
