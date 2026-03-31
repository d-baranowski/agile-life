import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
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

// ── Memoized selectors ────────────────────────────────────────────────────────

// Show at most 13 weeks per page on the trend chart
const HISTORY_PAGE_SIZE = 13
const USER_PALETTE = [
  '#0079bf',
  '#61bd4f',
  '#eb5a46',
  '#c377e0',
  '#ff9f1a',
  '#00c2e0',
  '#51e898',
  '#ff78cb',
  '#344563',
  '#f2d600'
]

const selectDashboard = (state: { dashboard: DashboardState }) => state.dashboard

const selectColumns = createSelector(selectDashboard, (d) => d.columns)
const selectWeeklyStats = createSelector(selectDashboard, (d) => d.weeklyStats)
const selectLabelStats = createSelector(selectDashboard, (d) => d.labelStats)
const selectHistoryStats = createSelector(selectDashboard, (d) => d.historyStats)
const selectEpicHistoryStats = createSelector(selectDashboard, (d) => d.epicHistoryStats)
const selectHistoryOffset = createSelector(selectDashboard, (d) => d.historyOffset)
const selectEpicHistoryOffset = createSelector(selectDashboard, (d) => d.epicHistoryOffset)

/** Total number of active cards across all columns. */
export const selectTotalCards = createSelector(selectColumns, (columns) =>
  columns.reduce((sum, c) => sum + c.cardCount, 0)
)

/** Aggregated user completion data for the 7-day view. */
export const selectUserCompletions = createSelector(selectWeeklyStats, (weeklyStats) => {
  const userTotals: Record<string, { userName: string; count: number }> = {}
  for (const row of weeklyStats) {
    const key = row.userId ?? 'unassigned'
    if (!userTotals[key]) userTotals[key] = { userName: row.userName, count: 0 }
    userTotals[key].count += row.closedCount
  }
  const sortedUsers = Object.entries(userTotals).sort((a, b) => b[1].count - a[1].count)
  const maxUserCount = sortedUsers[0]?.[1].count ?? 1
  const totalCompleted = sortedUsers.reduce((s, [, u]) => s + u.count, 0)
  return { sortedUsers, maxUserCount, totalCompleted }
})

/** Label stats grouped by label name with per-user breakdowns. */
export const selectLabelGroups = createSelector(selectLabelStats, (labelStats) => {
  const groups: Record<
    string,
    { color: string; users: { userId: string | null; userName: string; count: number }[] }
  > = {}
  for (const row of labelStats) {
    if (!groups[row.labelName]) groups[row.labelName] = { color: row.labelColor, users: [] }
    groups[row.labelName].users.push({
      userId: row.userId,
      userName: row.userName,
      count: row.closedCount
    })
  }
  return groups
})

/** Paged history chart data for the story-point trend line chart. */
export const selectHistoryChart = createSelector(
  [selectHistoryStats, selectHistoryOffset],
  (historyStats, historyOffset) => {
    const allWeeks = [...new Set(historyStats.map((r) => r.week))].sort()
    const userMap = new Map<string, { userName: string; idx: number }>()
    for (const r of historyStats) {
      const key = r.userId ?? 'unassigned'
      if (!userMap.has(key)) userMap.set(key, { userName: r.userName, idx: userMap.size })
    }

    const totalWeeks = allWeeks.length
    const maxOffset = Math.max(0, Math.ceil(totalWeeks / HISTORY_PAGE_SIZE) - 1)
    const clampedOffset = Math.min(historyOffset, maxOffset)
    const pageEndIdx = totalWeeks - clampedOffset * HISTORY_PAGE_SIZE
    const pageStartIdx = Math.max(0, pageEndIdx - HISTORY_PAGE_SIZE)
    const pageWeeks = allWeeks.slice(pageStartIdx, pageEndIdx)

    const lookup = new Map<string, Map<string, number>>()
    for (const r of historyStats) {
      const key = r.userId ?? 'unassigned'
      if (!lookup.has(r.week)) lookup.set(r.week, new Map())
      lookup.get(r.week)?.set(key, r.closedCount)
    }

    const chartData = {
      labels: pageWeeks,
      datasets: [...userMap.entries()].map(([userId, { userName, idx }]) => {
        const color = USER_PALETTE[idx % USER_PALETTE.length]
        return {
          label: userName,
          data: pageWeeks.map((w) => lookup.get(w)?.get(userId) ?? 0),
          borderColor: color,
          backgroundColor: color + '33',
          fill: false,
          tension: 0.3,
          pointRadius: 2
        }
      })
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
        tooltip: { mode: 'index' as const, intersect: false }
      },
      scales: {
        x: { ticks: { maxTicksLimit: HISTORY_PAGE_SIZE } },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }

    const pageRangeLabel =
      pageWeeks.length > 0
        ? pageWeeks[0] === pageWeeks[pageWeeks.length - 1]
          ? pageWeeks[0]
          : `${pageWeeks[0]} – ${pageWeeks[pageWeeks.length - 1]}`
        : ''

    return {
      allWeeks,
      maxOffset,
      clampedOffset,
      chartData,
      chartOptions,
      pageRangeLabel
    }
  }
)

/** Paged epic chart data for the story-points-by-epic bar chart. */
export const selectEpicChart = createSelector(
  [selectEpicHistoryStats, selectEpicHistoryOffset],
  (epicHistoryStats, epicHistoryOffset) => {
    const allWeeks = [...new Set(epicHistoryStats.map((r) => r.week))].sort()
    const epicMap = new Map<string, { epicCardName: string; idx: number }>()
    for (const r of epicHistoryStats) {
      if (!epicMap.has(r.epicCardId))
        epicMap.set(r.epicCardId, { epicCardName: r.epicCardName, idx: epicMap.size })
    }

    const totalWeeks = allWeeks.length
    const maxOffset = Math.max(0, Math.ceil(totalWeeks / HISTORY_PAGE_SIZE) - 1)
    const clampedOffset = Math.min(epicHistoryOffset, maxOffset)
    const pageEndIdx = totalWeeks - clampedOffset * HISTORY_PAGE_SIZE
    const pageStartIdx = Math.max(0, pageEndIdx - HISTORY_PAGE_SIZE)
    const pageWeeks = allWeeks.slice(pageStartIdx, pageEndIdx)

    const lookup = new Map<string, Map<string, number>>()
    for (const r of epicHistoryStats) {
      if (!lookup.has(r.week)) lookup.set(r.week, new Map())
      lookup.get(r.week)?.set(r.epicCardId, r.storyPoints)
    }

    const chartData = {
      labels: pageWeeks,
      datasets: [...epicMap.entries()].map(([epicCardId, { epicCardName, idx }]) => {
        const color = USER_PALETTE[idx % USER_PALETTE.length]
        return {
          label: epicCardName,
          data: pageWeeks.map((w) => lookup.get(w)?.get(epicCardId) ?? 0),
          backgroundColor: color + 'bb',
          borderColor: color,
          borderWidth: 1
        }
      })
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
        tooltip: { mode: 'index' as const, intersect: false }
      },
      scales: {
        x: { stacked: false, ticks: { maxTicksLimit: HISTORY_PAGE_SIZE } },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }

    const pageRangeLabel =
      pageWeeks.length > 0
        ? pageWeeks[0] === pageWeeks[pageWeeks.length - 1]
          ? pageWeeks[0]
          : `${pageWeeks[0]} – ${pageWeeks[pageWeeks.length - 1]}`
        : ''

    return {
      allWeeks,
      maxOffset,
      clampedOffset,
      chartData,
      chartOptions,
      pageRangeLabel
    }
  }
)
