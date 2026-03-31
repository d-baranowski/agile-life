import reducer, {
  historyOffsetChanged,
  epicHistoryOffsetChanged,
  selectTotalCards,
  selectUserCompletions,
  selectLabelGroups,
  selectHistoryChart,
  selectEpicChart
} from '../dashboardSlice'

const initialState = () => reducer(undefined, { type: '@@INIT' })

describe('dashboardSlice', () => {
  describe('initial state', () => {
    it('has expected defaults', () => {
      const state = initialState()
      expect(state.columns).toEqual([])
      expect(state.weeklyStats).toEqual([])
      expect(state.labelStats).toEqual([])
      expect(state.historyStats).toEqual([])
      expect(state.storyPointStats).toEqual([])
      expect(state.epicHistoryStats).toEqual([])
      expect(state.loading).toBe(true)
      expect(state.error).toBeNull()
      expect(state.historyOffset).toBe(0)
      expect(state.epicHistoryOffset).toBe(0)
    })
  })

  describe('reducers', () => {
    it('historyOffsetChanged sets the offset', () => {
      const state = reducer(initialState(), historyOffsetChanged(3))
      expect(state.historyOffset).toBe(3)
    })

    it('epicHistoryOffsetChanged sets the epic offset', () => {
      const state = reducer(initialState(), epicHistoryOffsetChanged(2))
      expect(state.epicHistoryOffset).toBe(2)
    })
  })

  describe('extraReducers — fetchDashboardData', () => {
    it('pending sets loading and clears error', () => {
      let state = initialState()
      state = { ...state, error: 'old error', loading: false }
      state = reducer(state, { type: 'dashboard/fetchAll/pending' })
      expect(state.loading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('fulfilled populates all data and resets offsets', () => {
      let state = initialState()
      state = { ...state, historyOffset: 5, epicHistoryOffset: 3 }

      const payload = {
        columns: [{ listId: 'l1', listName: 'To Do', cardCount: 5 }],
        weeklyStats: [{ userId: 'u1', userName: 'Alice', closedCount: 3 }],
        labelStats: [],
        historyStats: [],
        storyPointStats: [],
        epicHistoryStats: [],
        error: null
      }

      state = reducer(state, {
        type: 'dashboard/fetchAll/fulfilled',
        payload
      })

      expect(state.loading).toBe(false)
      expect(state.columns).toEqual(payload.columns)
      expect(state.weeklyStats).toEqual(payload.weeklyStats)
      expect(state.error).toBeNull()
      expect(state.historyOffset).toBe(0)
      expect(state.epicHistoryOffset).toBe(0)
    })

    it('fulfilled passes through error from payload', () => {
      const state = reducer(initialState(), {
        type: 'dashboard/fetchAll/fulfilled',
        payload: {
          columns: [],
          weeklyStats: [],
          labelStats: [],
          historyStats: [],
          storyPointStats: [],
          epicHistoryStats: [],
          error: 'Failed to load column counts.'
        }
      })
      expect(state.error).toBe('Failed to load column counts.')
    })

    it('rejected sets error', () => {
      const state = reducer(initialState(), {
        type: 'dashboard/fetchAll/rejected',
        error: { message: 'Network error' }
      })
      expect(state.loading).toBe(false)
      expect(state.error).toBe('Network error')
    })

    it('rejected uses fallback message', () => {
      const state = reducer(initialState(), {
        type: 'dashboard/fetchAll/rejected',
        error: {}
      })
      expect(state.error).toBe('Failed to load dashboard data.')
    })
  })

  describe('memoized selectors', () => {
    const makeRoot = (overrides = {}) => ({
      dashboard: { ...initialState(), ...overrides }
    })

    describe('selectTotalCards', () => {
      it('returns 0 for empty columns', () => {
        expect(selectTotalCards(makeRoot())).toBe(0)
      })

      it('sums card counts across columns', () => {
        const columns = [
          { listId: 'l1', listName: 'To Do', cardCount: 5 },
          { listId: 'l2', listName: 'Doing', cardCount: 3 },
          { listId: 'l3', listName: 'Done', cardCount: 7 }
        ]
        expect(selectTotalCards(makeRoot({ columns }))).toBe(15)
      })
    })

    describe('selectUserCompletions', () => {
      it('returns empty data for no stats', () => {
        const result = selectUserCompletions(makeRoot())
        expect(result.sortedUsers).toEqual([])
        expect(result.totalCompleted).toBe(0)
      })

      it('aggregates and sorts users by completion count', () => {
        const weeklyStats = [
          { userId: 'u1', userName: 'Alice', closedCount: 5 },
          { userId: 'u2', userName: 'Bob', closedCount: 8 },
          { userId: 'u1', userName: 'Alice', closedCount: 3 }
        ]
        const result = selectUserCompletions(makeRoot({ weeklyStats }))
        expect(result.sortedUsers[0][0]).toBe('u1') // Alice total 8
        expect(result.sortedUsers[0][1].count).toBe(8)
        expect(result.sortedUsers[1][0]).toBe('u2') // Bob total 8
        expect(result.totalCompleted).toBe(16)
        expect(result.maxUserCount).toBe(8)
      })

      it('handles unassigned users', () => {
        const weeklyStats = [{ userId: null, userName: 'Unassigned', closedCount: 2 }]
        const result = selectUserCompletions(makeRoot({ weeklyStats }))
        expect(result.sortedUsers[0][0]).toBe('unassigned')
        expect(result.sortedUsers[0][1].userName).toBe('Unassigned')
      })
    })

    describe('selectLabelGroups', () => {
      it('returns empty object for no stats', () => {
        expect(selectLabelGroups(makeRoot())).toEqual({})
      })

      it('groups label stats by name', () => {
        const labelStats = [
          { labelName: 'Bug', labelColor: 'red', userId: 'u1', userName: 'Alice', closedCount: 3 },
          { labelName: 'Bug', labelColor: 'red', userId: 'u2', userName: 'Bob', closedCount: 1 },
          {
            labelName: 'Feature',
            labelColor: 'green',
            userId: 'u1',
            userName: 'Alice',
            closedCount: 5
          }
        ]
        const result = selectLabelGroups(makeRoot({ labelStats }))
        expect(result['Bug'].color).toBe('red')
        expect(result['Bug'].users).toHaveLength(2)
        expect(result['Feature'].color).toBe('green')
        expect(result['Feature'].users).toHaveLength(1)
      })
    })

    describe('selectHistoryChart', () => {
      it('returns empty chart for no data', () => {
        const result = selectHistoryChart(makeRoot())
        expect(result.allWeeks).toEqual([])
        expect(result.chartData.labels).toEqual([])
        expect(result.chartData.datasets).toEqual([])
        expect(result.maxOffset).toBe(0)
        expect(result.pageRangeLabel).toBe('')
      })

      it('builds chart data from history stats', () => {
        const historyStats = [
          { week: '2024-W01', userId: 'u1', userName: 'Alice', closedCount: 3 },
          { week: '2024-W01', userId: 'u2', userName: 'Bob', closedCount: 5 },
          { week: '2024-W02', userId: 'u1', userName: 'Alice', closedCount: 2 }
        ]
        const result = selectHistoryChart(makeRoot({ historyStats }))
        expect(result.allWeeks).toEqual(['2024-W01', '2024-W02'])
        expect(result.chartData.labels).toEqual(['2024-W01', '2024-W02'])
        expect(result.chartData.datasets).toHaveLength(2)
        expect(result.chartData.datasets[0].label).toBe('Alice')
        expect(result.chartData.datasets[0].data).toEqual([3, 2])
        expect(result.chartData.datasets[1].label).toBe('Bob')
        expect(result.chartData.datasets[1].data).toEqual([5, 0])
      })

      it('paginates with offset', () => {
        // Create 20 weeks of data
        const historyStats = Array.from({ length: 20 }, (_, i) => ({
          week: `2024-W${String(i + 1).padStart(2, '0')}`,
          userId: 'u1',
          userName: 'Alice',
          closedCount: i + 1
        }))
        // offset 1 should show the first page (earlier weeks)
        const result = selectHistoryChart(makeRoot({ historyStats, historyOffset: 1 }))
        // 20 weeks / 13 per page = maxOffset 1
        expect(result.maxOffset).toBe(1)
        expect(result.chartData.labels).toHaveLength(7) // 20 - 13 = 7
      })

      it('shows range label for single week', () => {
        const historyStats = [{ week: '2024-W01', userId: 'u1', userName: 'Alice', closedCount: 1 }]
        const result = selectHistoryChart(makeRoot({ historyStats }))
        expect(result.pageRangeLabel).toBe('2024-W01')
      })

      it('shows range label for multiple weeks', () => {
        const historyStats = [
          { week: '2024-W01', userId: 'u1', userName: 'Alice', closedCount: 1 },
          { week: '2024-W03', userId: 'u1', userName: 'Alice', closedCount: 2 }
        ]
        const result = selectHistoryChart(makeRoot({ historyStats }))
        expect(result.pageRangeLabel).toBe('2024-W01 – 2024-W03')
      })
    })

    describe('selectEpicChart', () => {
      it('returns empty chart for no data', () => {
        const result = selectEpicChart(makeRoot())
        expect(result.allWeeks).toEqual([])
        expect(result.chartData.labels).toEqual([])
        expect(result.chartData.datasets).toEqual([])
      })

      it('builds chart data from epic history stats', () => {
        const epicHistoryStats = [
          { week: '2024-W01', epicCardId: 'e1', epicCardName: 'Epic One', storyPoints: 10 },
          { week: '2024-W01', epicCardId: 'e2', epicCardName: 'Epic Two', storyPoints: 5 },
          { week: '2024-W02', epicCardId: 'e1', epicCardName: 'Epic One', storyPoints: 8 }
        ]
        const result = selectEpicChart(makeRoot({ epicHistoryStats }))
        expect(result.allWeeks).toEqual(['2024-W01', '2024-W02'])
        expect(result.chartData.datasets).toHaveLength(2)
        expect(result.chartData.datasets[0].label).toBe('Epic One')
        expect(result.chartData.datasets[0].data).toEqual([10, 8])
        expect(result.chartData.datasets[1].label).toBe('Epic Two')
        expect(result.chartData.datasets[1].data).toEqual([5, 0])
      })

      it('paginates with epicHistoryOffset', () => {
        const epicHistoryStats = Array.from({ length: 20 }, (_, i) => ({
          week: `2024-W${String(i + 1).padStart(2, '0')}`,
          epicCardId: 'e1',
          epicCardName: 'Epic One',
          storyPoints: i + 1
        }))
        const result = selectEpicChart(makeRoot({ epicHistoryStats, epicHistoryOffset: 1 }))
        expect(result.maxOffset).toBe(1)
        expect(result.chartData.labels).toHaveLength(7)
      })
    })
  })
})
