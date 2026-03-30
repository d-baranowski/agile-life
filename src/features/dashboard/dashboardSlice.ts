import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type {
  ColumnCount,
  WeeklyUserStats,
  LabelUserStats,
  WeeklyHistory,
  StoryPointsUserStats,
  EpicWeeklyHistory
} from '../analytics/analytics.types'
import type { StoryPointRule } from '../../lib/board.types'
import { api } from '../api/useApi'

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchAll',
  async (args: { boardId: string; storyPointsConfig: StoryPointRule[] }) => {
    const [colResult, weeklyResult, labelResult, historyResult, spResult, epicResult] =
      await Promise.all([
        api.analytics.columnCounts(args.boardId),
        api.analytics.weeklyUserStats(args.boardId),
        api.analytics.labelUserStats(args.boardId),
        api.analytics.weeklyHistory(args.boardId, args.storyPointsConfig),
        api.analytics.storyPoints7d(args.boardId, args.storyPointsConfig),
        api.analytics.epicWeeklyHistory(args.boardId, args.storyPointsConfig)
      ])

    return {
      columns: colResult.success ? (colResult.data ?? []) : [],
      weeklyStats: weeklyResult.success ? (weeklyResult.data ?? []) : [],
      labelStats: labelResult.success ? (labelResult.data ?? []) : [],
      historyStats: historyResult.success ? (historyResult.data ?? []) : [],
      storyPointStats: spResult.success ? (spResult.data ?? []) : [],
      epicHistoryStats: epicResult.success ? (epicResult.data ?? []) : [],
      error: !colResult.success
        ? (colResult.error ?? 'Failed to load column counts.')
        : !weeklyResult.success
          ? (weeklyResult.error ?? 'Failed to load weekly stats.')
          : !labelResult.success
            ? (labelResult.error ?? 'Failed to load label stats.')
            : null
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

interface DashboardState {
  columns: ColumnCount[]
  weeklyStats: WeeklyUserStats[]
  labelStats: LabelUserStats[]
  historyStats: WeeklyHistory[]
  storyPointStats: StoryPointsUserStats[]
  epicHistoryStats: EpicWeeklyHistory[]
  loading: boolean
  error: string | null
  historyOffset: number
  epicHistoryOffset: number
}

const initialState: DashboardState = {
  columns: [],
  weeklyStats: [],
  labelStats: [],
  historyStats: [],
  storyPointStats: [],
  epicHistoryStats: [],
  loading: true,
  error: null,
  historyOffset: 0,
  epicHistoryOffset: 0
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    historyOffsetChanged(state, action: { payload: number }) {
      state.historyOffset = action.payload
    },
    epicHistoryOffsetChanged(state, action: { payload: number }) {
      state.epicHistoryOffset = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.columns = action.payload.columns
        state.weeklyStats = action.payload.weeklyStats
        state.labelStats = action.payload.labelStats
        state.historyStats = action.payload.historyStats
        state.storyPointStats = action.payload.storyPointStats
        state.epicHistoryStats = action.payload.epicHistoryStats
        state.error = action.payload.error
        state.loading = false
        state.historyOffset = 0
        state.epicHistoryOffset = 0
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to load dashboard data.'
        state.loading = false
      })
  }
})

export const { historyOffsetChanged, epicHistoryOffsetChanged } = dashboardSlice.actions
export default dashboardSlice.reducer
