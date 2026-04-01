jest.mock('../confetti/sound', () => ({
  playCoinSound: jest.fn()
}))

import { playCoinSound } from '../confetti/sound'
import { gamificationSoundMiddleware } from '../gamification-sound.middleware'
import { fetchGamificationStats } from '../kanbanSlice'

const mockPlayCoinSound = playCoinSound as jest.Mock

const makeMiddleware = (prevPoints: number | null) => {
  const fakeStore = {
    getState: () => ({
      kanban: {
        gamificationStats: prevPoints !== null ? { currentWeekPoints: prevPoints } : null
      }
    }),
    dispatch: jest.fn()
  }
  const next = jest.fn()
  const invoke = (action: unknown) => gamificationSoundMiddleware(fakeStore)(next)(action)
  return { next, invoke }
}

describe('gamificationSoundMiddleware', () => {
  beforeEach(() => {
    mockPlayCoinSound.mockClear()
  })

  it('plays coin sound when currentWeekPoints increases', () => {
    const { invoke } = makeMiddleware(5)
    invoke(
      fetchGamificationStats.fulfilled(
        {
          currentWeekPoints: 8,
          prevWeekPoints: 3,
          yearlyHighScore: 10,
          currentWeek: 'w',
          prevWeek: 'p'
        },
        'req',
        { boardId: 'b', myMemberId: 'm', storyPointsConfig: [] }
      )
    )
    expect(mockPlayCoinSound).toHaveBeenCalledTimes(1)
  })

  it('does not play sound when score stays the same', () => {
    const { invoke } = makeMiddleware(5)
    invoke(
      fetchGamificationStats.fulfilled(
        {
          currentWeekPoints: 5,
          prevWeekPoints: 3,
          yearlyHighScore: 10,
          currentWeek: 'w',
          prevWeek: 'p'
        },
        'req',
        { boardId: 'b', myMemberId: 'm', storyPointsConfig: [] }
      )
    )
    expect(mockPlayCoinSound).not.toHaveBeenCalled()
  })

  it('does not play sound when score decreases', () => {
    const { invoke } = makeMiddleware(5)
    invoke(
      fetchGamificationStats.fulfilled(
        {
          currentWeekPoints: 3,
          prevWeekPoints: 3,
          yearlyHighScore: 10,
          currentWeek: 'w',
          prevWeek: 'p'
        },
        'req',
        { boardId: 'b', myMemberId: 'm', storyPointsConfig: [] }
      )
    )
    expect(mockPlayCoinSound).not.toHaveBeenCalled()
  })

  it('plays sound when going from 0 to any positive score', () => {
    const { invoke } = makeMiddleware(0)
    invoke(
      fetchGamificationStats.fulfilled(
        {
          currentWeekPoints: 1,
          prevWeekPoints: 0,
          yearlyHighScore: 1,
          currentWeek: 'w',
          prevWeek: 'p'
        },
        'req',
        { boardId: 'b', myMemberId: 'm', storyPointsConfig: [] }
      )
    )
    expect(mockPlayCoinSound).toHaveBeenCalledTimes(1)
  })

  it('does not play sound when stats are freshly loaded after tab/board switch', () => {
    const { invoke } = makeMiddleware(null)
    invoke(
      fetchGamificationStats.fulfilled(
        {
          currentWeekPoints: 10,
          prevWeekPoints: 3,
          yearlyHighScore: 10,
          currentWeek: 'w',
          prevWeek: 'p'
        },
        'req',
        { boardId: 'b', myMemberId: 'm', storyPointsConfig: [] }
      )
    )
    expect(mockPlayCoinSound).not.toHaveBeenCalled()
  })

  it('does not play sound for unrelated actions', () => {
    const { invoke } = makeMiddleware(5)
    invoke({ type: 'kanban/columnsUpdated', payload: [] })
    expect(mockPlayCoinSound).not.toHaveBeenCalled()
  })

  it('calls next with the action', () => {
    const { next, invoke } = makeMiddleware(5)
    const action = { type: 'some/action' }
    invoke(action)
    expect(next).toHaveBeenCalledWith(action)
  })
})
