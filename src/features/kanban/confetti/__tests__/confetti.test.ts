/**
 * Tests for confetti.ts — confetti burst + coin sound celebration effect.
 * We mock canvas-confetti and the sound module to avoid browser-only APIs.
 */

const mockConfetti = Object.assign(jest.fn(), {
  shapeFromText: jest.fn().mockReturnValue('mock-shape')
})

jest.mock('canvas-confetti', () => ({
  __esModule: true,
  default: mockConfetti
}))

jest.mock('../sound', () => ({
  playCoinSound: jest.fn()
}))

import { triggerDoneEffect } from '../confetti'
import { playCoinSound } from '../sound'

beforeEach(() => {
  jest.clearAllMocks()
  mockConfetti.shapeFromText.mockReturnValue('mock-shape')
})

describe('triggerDoneEffect', () => {
  it('calls confetti.shapeFromText three times with the story-point label', () => {
    triggerDoneEffect(5)
    expect(mockConfetti.shapeFromText).toHaveBeenCalledTimes(3)
    expect(mockConfetti.shapeFromText).toHaveBeenCalledWith(expect.objectContaining({ text: '+5' }))
  })

  it('calls confetti with the computed particle count and shapes', () => {
    triggerDoneEffect(10)
    expect(mockConfetti).toHaveBeenCalledTimes(1)
    const call = mockConfetti.mock.calls[0][0]
    expect(call.particleCount).toBe(100) // 10 * 10 = 100, capped at 150
    expect(call.shapes).toHaveLength(3)
  })

  it('caps particle count at 150', () => {
    triggerDoneEffect(20)
    const call = mockConfetti.mock.calls[0][0]
    expect(call.particleCount).toBe(150) // 20 * 10 = 200 → capped at 150
  })

  it('uses the provided origin', () => {
    triggerDoneEffect(3, { x: 0.3, y: 0.7 })
    const call = mockConfetti.mock.calls[0][0]
    expect(call.origin).toEqual({ x: 0.3, y: 0.7 })
  })

  it('defaults to centre origin when not provided', () => {
    triggerDoneEffect(3)
    const call = mockConfetti.mock.calls[0][0]
    expect(call.origin).toEqual({ x: 0.5, y: 0.55 })
  })

  it('does not call playCoinSound (sound is handled by gamificationSoundMiddleware)', () => {
    triggerDoneEffect(1)
    expect(playCoinSound).not.toHaveBeenCalled()
  })
})
