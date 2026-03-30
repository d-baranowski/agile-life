import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig } from '../../lib/board.types'
import type { WeeklyUserStats, LabelUserStats, WeeklyHistory } from './analytics.types'
import { api } from '../api/useApi'
import { labelColor } from '../../lib/label-colors'
import {
  Container,
  Header,
  Title,
  Hint,
  ErrorBanner,
  Loading,
  Empty,
  SectionTitle
} from './analytics-layout.styled'
import {
  StatStrip,
  StatCard,
  StatValue,
  StatLabel,
  UserList,
  UserRow,
  UserName,
  BarWrap,
  BarFill,
  UserCount
} from './analytics-stats.styled'
import {
  LabelList,
  LabelGroup,
  LabelHeader,
  LabelDot,
  LabelName,
  LabelTotal
} from './analytics-labels.styled'
import {
  ChartWrapper,
  ChartHeader,
  ChartNav,
  ChartNavBtn,
  ChartNavLabel
} from './analytics-chart.styled'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

interface Props {
  board: BoardConfig
}

// Palette for line chart — cycle through these colours per user
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

const HISTORY_PAGE_SIZE = 13

export default function AnalyticsPage(props: Props): JSX.Element {
  const { board } = props
  const [weeklyStats, setWeeklyStats] = useState<WeeklyUserStats[]>([])
  const [labelStats, setLabelStats] = useState<LabelUserStats[]>([])
  const [historyStats, setHistoryStats] = useState<WeeklyHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyOffset, setHistoryOffset] = useState(0)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [weeklyResult, labelResult, historyResult] = await Promise.all([
      api.analytics.weeklyUserStats(board.boardId),
      api.analytics.labelUserStats(board.boardId),
      api.analytics.weeklyHistory(board.boardId, board.storyPointsConfig)
    ])

    if (!weeklyResult.success) {
      setError(weeklyResult.error ?? 'Failed to load weekly stats.')
    } else {
      setWeeklyStats(weeklyResult.data ?? [])
    }

    if (!labelResult.success) {
      setError((prev) => prev ?? labelResult.error ?? 'Failed to load label stats.')
    } else {
      setLabelStats(labelResult.data ?? [])
    }

    if (historyResult.success) {
      setHistoryStats(historyResult.data ?? [])
    }

    setLoading(false)
  }, [board.boardId, board.storyPointsConfig])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Reset page offset when data reloads
  useEffect(() => {
    setHistoryOffset(0)
  }, [historyStats])

  // ── Derived data ────────────────────────────────────────────────────────────

  // Aggregate weekly stats by user (sum across weeks)
  const userTotals = weeklyStats.reduce<Record<string, { userName: string; count: number }>>(
    (acc, row) => {
      const key = row.userId ?? 'unassigned'
      if (!acc[key]) {
        acc[key] = { userName: row.userName, count: 0 }
      }
      acc[key].count += row.closedCount
      return acc
    },
    {}
  )
  const sortedUsers = Object.entries(userTotals).sort((a, b) => b[1].count - a[1].count)
  const maxUserCount = sortedUsers[0]?.[1].count ?? 1

  // Group label stats by label for the drill-down table
  const labelGroups = labelStats.reduce<
    Record<
      string,
      { color: string; users: { userId: string | null; userName: string; count: number }[] }
    >
  >((acc, row) => {
    if (!acc[row.labelName]) {
      acc[row.labelName] = { color: row.labelColor, users: [] }
    }
    acc[row.labelName].users.push({
      userId: row.userId,
      userName: row.userName,
      count: row.closedCount
    })
    return acc
  }, {})

  const totalCompleted = sortedUsers.reduce((s, [, u]) => s + u.count, 0)

  // ── 12-month history chart data with paging ─────────────────────────────────

  // Collect all unique weeks (sorted) and all unique users from history
  const allHistoryWeeks = [...new Set(historyStats.map((r) => r.week))].sort()
  const historyUserMap = new Map<string, { userName: string; idx: number }>()
  historyStats.forEach((r) => {
    const key = r.userId ?? 'unassigned'
    if (!historyUserMap.has(key)) {
      historyUserMap.set(key, { userName: r.userName, idx: historyUserMap.size })
    }
  })

  // Compute page window
  const totalWeeks = allHistoryWeeks.length
  const maxOffset = Math.max(0, Math.ceil(totalWeeks / HISTORY_PAGE_SIZE) - 1)
  const clampedOffset = Math.min(historyOffset, maxOffset)
  const pageEndIdx = totalWeeks - clampedOffset * HISTORY_PAGE_SIZE
  const pageStartIdx = Math.max(0, pageEndIdx - HISTORY_PAGE_SIZE)
  const pageWeeks = allHistoryWeeks.slice(pageStartIdx, pageEndIdx)

  // Build a lookup: week → userId → story points
  const historyLookup = new Map<string, Map<string, number>>()
  historyStats.forEach((r) => {
    const key = r.userId ?? 'unassigned'
    if (!historyLookup.has(r.week)) historyLookup.set(r.week, new Map())
    historyLookup.get(r.week)!.set(key, r.closedCount)
  })

  const historyChartData = {
    labels: pageWeeks,
    datasets: [...historyUserMap.entries()].map(([userId, { userName, idx }]) => {
      const color = USER_PALETTE[idx % USER_PALETTE.length]
      return {
        label: userName,
        data: pageWeeks.map((w) => historyLookup.get(w)?.get(userId) ?? 0),
        borderColor: color,
        backgroundColor: color + '33',
        fill: false,
        tension: 0.3,
        pointRadius: 2
      }
    })
  }

  const historyChartOptions = {
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

  // Human-readable range label for the current page
  const pageRangeLabel =
    pageWeeks.length > 0
      ? pageWeeks[0] === pageWeeks[pageWeeks.length - 1]
        ? pageWeeks[0]
        : `${pageWeeks[0]} – ${pageWeeks[pageWeeks.length - 1]}`
      : ''

  return (
    <Container>
      {/* ── Header ── */}
      <Header>
        <Title>{board.boardName} — Analytics</Title>
        <Hint>Last 7 days · synced data</Hint>
      </Header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <Loading>
          <div className="spinner" />
          <span>Loading analytics…</span>
        </Loading>
      ) : weeklyStats.length === 0 && labelStats.length === 0 ? (
        <Empty>
          <p>No completed tickets found in the last 7 days.</p>
          <p className="text-muted mt-2">
            Sync your board first, then make sure your &ldquo;Done&rdquo; list names match the
            settings configured for this board.
          </p>
        </Empty>
      ) : (
        <>
          {/* ── Summary strip ── */}
          <StatStrip>
            <StatCard>
              <StatValue>{totalCompleted}</StatValue>
              <StatLabel>Tickets Completed</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{sortedUsers.length}</StatValue>
              <StatLabel>Contributors</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{Object.keys(labelGroups).length}</StatValue>
              <StatLabel>Labels</StatLabel>
            </StatCard>
          </StatStrip>

          {/* ── Per-user section ── */}
          <section>
            <SectionTitle>Tickets Completed per User</SectionTitle>
            {sortedUsers.length === 0 ? (
              <p className="text-muted">No data.</p>
            ) : (
              <UserList>
                {sortedUsers.map(([userId, { userName, count }]) => {
                  const pct = (count / maxUserCount) * 100
                  return (
                    <UserRow key={userId}>
                      <UserName>{userName}</UserName>
                      <BarWrap>
                        <BarFill style={{ width: `${pct}%` }} />
                      </BarWrap>
                      <UserCount>{count}</UserCount>
                    </UserRow>
                  )
                })}
              </UserList>
            )}
          </section>

          {/* ── Label drill-down ── */}
          <section>
            <SectionTitle>Tickets by Label</SectionTitle>
            {Object.keys(labelGroups).length === 0 ? (
              <p className="text-muted">
                No labelled tickets found. Labels are required for this breakdown.
              </p>
            ) : (
              <LabelList>
                {Object.entries(labelGroups).map(([labelName, { color, users }]) => (
                  <LabelGroup key={labelName}>
                    <LabelHeader>
                      <LabelDot style={{ background: labelColor(color) }} />
                      <LabelName>{labelName || '(no name)'}</LabelName>
                      <LabelTotal>{users.reduce((s, u) => s + u.count, 0)} total</LabelTotal>
                    </LabelHeader>
                    <table>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th style={{ textAlign: 'right' }}>Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.userId ?? 'unassigned'}>
                            <td>{u.userName}</td>
                            <td style={{ textAlign: 'right' }}>{u.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </LabelGroup>
                ))}
              </LabelList>
            )}
          </section>

          {/* ── Story-point history chart ── */}
          <section>
            <ChartHeader>
              <SectionTitle>Story Point Trend — Past 12 Months</SectionTitle>
              {allHistoryWeeks.length > 0 && (
                <ChartNav>
                  <ChartNavBtn
                    onClick={() => setHistoryOffset((o) => Math.min(o + 1, maxOffset))}
                    disabled={clampedOffset >= maxOffset}
                    title="Older"
                  >
                    ◀
                  </ChartNavBtn>
                  <ChartNavLabel>{pageRangeLabel}</ChartNavLabel>
                  <ChartNavBtn
                    onClick={() => setHistoryOffset((o) => Math.max(o - 1, 0))}
                    disabled={clampedOffset === 0}
                    title="Newer"
                  >
                    ▶
                  </ChartNavBtn>
                </ChartNav>
              )}
            </ChartHeader>
            {allHistoryWeeks.length === 0 ? (
              <p className="text-muted">
                No historical data yet. Sync your board to populate this chart — the sync now
                fetches all cards (including archived ones) so historical completions will appear
                here.
              </p>
            ) : (
              <ChartWrapper>
                <Line data={historyChartData} options={historyChartOptions} />
              </ChartWrapper>
            )}
          </section>
        </>
      )}
    </Container>
  )
}
