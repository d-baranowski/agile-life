import type { GamificationStats } from '../../analytics/analytics.types'
import { gamificationMiddleware } from '../gamification-middleware'
import { fetchGamificationStats, levelUpAchieved } from '../kanbanSlice'

/* ── helpers ─────────────────────────────────────────────────────────── */

function makeStats(overrides: Partial<GamificationStats> = {}): GamificationStats {
  return {
    currentWeekPoints: 0,
    prevWeekPoints: 0,
    yearlyHighScore: 0,
    currentWeek: '2026-W14',
    prevWeek: '2026-W13',
    ...overrides
  }
}

/**
 * Creates a minimal Redux-middleware harness so we can call the middleware
 * with controlled `getState`, `dispatch`, and `next` functions.
 */
function setup(gamificationStats: GamificationStats | null) {
  const dispatch = jest.fn()
  const getState = jest.fn(() => ({ kanban: { gamificationStats } }))
  const next = jest.fn((action: unknown) => action)

  const invoke = gamificationMiddleware({ dispatch, getState } as never)(next)

  return { dispatch, getState, next, invoke }
}

function fulfilledAction(stats: GamificationStats) {
  return {
    type: fetchGamificationStats.fulfilled.type,
    payload: stats,
    meta: { arg: {}, requestId: 'test', requestStatus: 'fulfilled' as const }
  }
}

/* ── tests ────────────────────────────────────────────────────────────── */

describe('gamificationMiddleware', () => {
  it('passes unrelated actions straight through', () => {
    const { next, invoke } = setup(null)
    const action = { type: 'some/otherAction' }

    invoke(action)

    expect(next).toHaveBeenCalledWith(action)
  })

  it('does NOT dispatch levelUpAchieved when prevStats is null (initial load)', () => {
    const { dispatch, invoke } = setup(null)
    const stats = makeStats({ currentWeekPoints: 10, prevWeekPoints: 5 })

    invoke(fulfilledAction(stats))

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does NOT dispatch levelUpAchieved when prevStats is null even if beating', () => {
    const { dispatch, invoke } = setup(null)
    const stats = makeStats({ currentWeekPoints: 20, prevWeekPoints: 3 })

    invoke(fulfilledAction(stats))

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches levelUpAchieved on genuine wasBeating=false → nowBeating=true transition', () => {
    const prev = makeStats({ currentWeekPoints: 3, prevWeekPoints: 10 })
    const { dispatch, invoke } = setup(prev)
    const newStats = makeStats({ currentWeekPoints: 11, prevWeekPoints: 10 })

    invoke(fulfilledAction(newStats))

    expect(dispatch).toHaveBeenCalledWith(levelUpAchieved())
  })

  it('does NOT dispatch levelUpAchieved when already beating (no transition)', () => {
    const prev = makeStats({ currentWeekPoints: 15, prevWeekPoints: 10 })
    const { dispatch, invoke } = setup(prev)
    const newStats = makeStats({ currentWeekPoints: 20, prevWeekPoints: 10 })

    invoke(fulfilledAction(newStats))

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does NOT dispatch levelUpAchieved when not beating in either state', () => {
    const prev = makeStats({ currentWeekPoints: 2, prevWeekPoints: 10 })
    const { dispatch, invoke } = setup(prev)
    const newStats = makeStats({ currentWeekPoints: 5, prevWeekPoints: 10 })

    invoke(fulfilledAction(newStats))

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does NOT dispatch levelUpAchieved when currentWeekPoints is 0', () => {
    const prev = makeStats({ currentWeekPoints: 0, prevWeekPoints: 0 })
    const { dispatch, invoke } = setup(prev)
    const newStats = makeStats({ currentWeekPoints: 0, prevWeekPoints: 0 })

    invoke(fulfilledAction(newStats))

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('always calls next() for fulfilled actions', () => {
    const { next, invoke } = setup(null)
    const action = fulfilledAction(makeStats({ currentWeekPoints: 10, prevWeekPoints: 5 }))

    invoke(action)

    expect(next).toHaveBeenCalledWith(action)
  })
})
