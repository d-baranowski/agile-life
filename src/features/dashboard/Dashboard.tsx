import { useEffect } from 'react'
import type { BoardConfig } from '../../lib/board.types'
import { labelColor } from '../../lib/label-colors'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchDashboardData,
  historyOffsetChanged,
  epicHistoryOffsetChanged
} from './dashboardSlice'
import {
  Container,
  Header,
  Title,
  LastSync,
  ErrorBanner,
  Loading,
  Empty,
  SectionTitle,
  AnalyticsHint
} from './dashboard-layout.styled'
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
} from './dashboard-stats.styled'
import {
  ColumnGrid,
  ColumnCard,
  ColumnHeader,
  ColumnName,
  ColumnCount as ColumnCountDisplay,
  ColumnBar,
  ColumnBarFill,
  ColumnPercent
} from './dashboard-columns.styled'
import {
  LabelList,
  LabelGroup,
  LabelHeader,
  LabelDot,
  LabelName,
  LabelTotal,
  LabelUserList,
  LabelUserRow,
  LabelUserName,
  LabelUserCount
} from './dashboard-labels.styled'
import {
  ChartWrapper,
  ChartHeader,
  ChartNav,
  ChartNavBtn,
  ChartNavLabel
} from './dashboard-chart.styled'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
)

interface Props {
  board: BoardConfig
  /** Incremented by App each time a Trello sync completes — triggers a data reload. */
  syncVersion: number
}

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

export default function Dashboard(props: Props): JSX.Element {
  const { board, syncVersion } = props
  const dispatch = useAppDispatch()

  // ── Redux state ──────────────────────────────────────────────────────────
  const columns = useAppSelector((s) => s.dashboard.columns)
  const weeklyStats = useAppSelector((s) => s.dashboard.weeklyStats)
  const labelStats = useAppSelector((s) => s.dashboard.labelStats)
  const historyStats = useAppSelector((s) => s.dashboard.historyStats)
  const storyPointStats = useAppSelector((s) => s.dashboard.storyPointStats)
  const epicHistoryStats = useAppSelector((s) => s.dashboard.epicHistoryStats)
  const loading = useAppSelector((s) => s.dashboard.loading)
  const error = useAppSelector((s) => s.dashboard.error)
  const historyOffset = useAppSelector((s) => s.dashboard.historyOffset)
  const epicHistoryOffset = useAppSelector((s) => s.dashboard.epicHistoryOffset)

  useEffect(() => {
    dispatch(
      fetchDashboardData({
        boardId: board.boardId,
        storyPointsConfig: board.storyPointsConfig
      })
    )
  }, [dispatch, board.boardId, board.storyPointsConfig, syncVersion])

  // ── Derived data ─────────────────────────────────────────────────────────────

  const totalCards = columns.reduce((sum, c) => sum + c.cardCount, 0)

  const userTotals = weeklyStats.reduce<Record<string, { userName: string; count: number }>>(
    (acc, row) => {
      const key = row.userId ?? 'unassigned'
      if (!acc[key]) acc[key] = { userName: row.userName, count: 0 }
      acc[key].count += row.closedCount
      return acc
    },
    {}
  )
  const sortedUsers = Object.entries(userTotals).sort((a, b) => b[1].count - a[1].count)
  const maxUserCount = sortedUsers[0]?.[1].count ?? 1
  const totalCompleted = sortedUsers.reduce((s, [, u]) => s + u.count, 0)

  const labelGroups = labelStats.reduce<
    Record<
      string,
      { color: string; users: { userId: string | null; userName: string; count: number }[] }
    >
  >((acc, row) => {
    if (!acc[row.labelName]) acc[row.labelName] = { color: row.labelColor, users: [] }
    acc[row.labelName].users.push({
      userId: row.userId,
      userName: row.userName,
      count: row.closedCount
    })
    return acc
  }, {})

  // ── 12-month history chart with paging ────────────────────────────────────────

  const allHistoryWeeks = [...new Set(historyStats.map((r) => r.week))].sort()
  const historyUserMap = new Map<string, { userName: string; idx: number }>()
  historyStats.forEach((r) => {
    const key = r.userId ?? 'unassigned'
    if (!historyUserMap.has(key))
      historyUserMap.set(key, { userName: r.userName, idx: historyUserMap.size })
  })

  // Compute paged window (most recent page first)
  const totalWeeks = allHistoryWeeks.length
  const maxOffset = Math.max(0, Math.ceil(totalWeeks / HISTORY_PAGE_SIZE) - 1)
  const clampedOffset = Math.min(historyOffset, maxOffset)
  const pageEndIdx = totalWeeks - clampedOffset * HISTORY_PAGE_SIZE
  const pageStartIdx = Math.max(0, pageEndIdx - HISTORY_PAGE_SIZE)
  const pageWeeks = allHistoryWeeks.slice(pageStartIdx, pageEndIdx)

  const historyLookup = new Map<string, Map<string, number>>()
  historyStats.forEach((r) => {
    const key = r.userId ?? 'unassigned'
    if (!historyLookup.has(r.week)) historyLookup.set(r.week, new Map())
    historyLookup.get(r.week)?.set(key, r.closedCount)
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

  const pageRangeLabel =
    pageWeeks.length > 0
      ? pageWeeks[0] === pageWeeks[pageWeeks.length - 1]
        ? pageWeeks[0]
        : `${pageWeeks[0]} – ${pageWeeks[pageWeeks.length - 1]}`
      : ''

  // ── Epic chart derived data ───────────────────────────────────────────────

  const allEpicWeeks = [...new Set(epicHistoryStats.map((r) => r.week))].sort()
  const epicMap = new Map<string, { epicCardName: string; idx: number }>()
  epicHistoryStats.forEach((r) => {
    if (!epicMap.has(r.epicCardId))
      epicMap.set(r.epicCardId, { epicCardName: r.epicCardName, idx: epicMap.size })
  })

  const totalEpicWeeks = allEpicWeeks.length
  const maxEpicOffset = Math.max(0, Math.ceil(totalEpicWeeks / HISTORY_PAGE_SIZE) - 1)
  const clampedEpicOffset = Math.min(epicHistoryOffset, maxEpicOffset)
  const epicPageEndIdx = totalEpicWeeks - clampedEpicOffset * HISTORY_PAGE_SIZE
  const epicPageStartIdx = Math.max(0, epicPageEndIdx - HISTORY_PAGE_SIZE)
  const epicPageWeeks = allEpicWeeks.slice(epicPageStartIdx, epicPageEndIdx)

  const epicLookup = new Map<string, Map<string, number>>()
  epicHistoryStats.forEach((r) => {
    if (!epicLookup.has(r.week)) epicLookup.set(r.week, new Map())
    epicLookup.get(r.week)?.set(r.epicCardId, r.storyPoints)
  })

  const epicChartData = {
    labels: epicPageWeeks,
    datasets: [...epicMap.entries()].map(([epicCardId, { epicCardName, idx }]) => {
      const color = USER_PALETTE[idx % USER_PALETTE.length]
      return {
        label: epicCardName,
        data: epicPageWeeks.map((w) => epicLookup.get(w)?.get(epicCardId) ?? 0),
        backgroundColor: color + 'bb',
        borderColor: color,
        borderWidth: 1
      }
    })
  }

  const epicChartOptions = {
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

  const epicPageRangeLabel =
    epicPageWeeks.length > 0
      ? epicPageWeeks[0] === epicPageWeeks[epicPageWeeks.length - 1]
        ? epicPageWeeks[0]
        : `${epicPageWeeks[0]} – ${epicPageWeeks[epicPageWeeks.length - 1]}`
      : ''

  return (
    <Container>
      {/* ── Header ── */}
      <Header>
        <div>
          <Title>{board.boardName}</Title>
          {board.lastSyncedAt && (
            <LastSync>Last synced {new Date(board.lastSyncedAt).toLocaleString()}</LastSync>
          )}
        </div>
      </Header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <Loading>
          <div className="spinner" />
          <span>Loading…</span>
        </Loading>
      ) : (
        <>
          {/* ── Combined summary strip ── */}
          {(columns.length > 0 || sortedUsers.length > 0) && (
            <StatStrip>
              <StatCard>
                <StatValue>{totalCards}</StatValue>
                <StatLabel>Total Active Cards</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{columns.length}</StatValue>
                <StatLabel>Columns</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{totalCompleted}</StatValue>
                <StatLabel>Completed (7 days)</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{sortedUsers.length}</StatValue>
                <StatLabel>Contributors</StatLabel>
              </StatCard>
            </StatStrip>
          )}

          {/* ── Cards per Column ── */}
          {columns.length === 0 ? (
            <Empty>
              <p>No data yet.</p>
              <p className="text-muted">
                Click <strong>↻ Fetch from Trello</strong> in the top bar to import this
                board&apos;s data.
              </p>
            </Empty>
          ) : (
            <section>
              <SectionTitle>Cards per Column</SectionTitle>
              <ColumnGrid>
                {columns.map((col) => {
                  const pct = totalCards > 0 ? (col.cardCount / totalCards) * 100 : 0
                  return (
                    <ColumnCard key={col.listId}>
                      <ColumnHeader>
                        <ColumnName>{col.listName}</ColumnName>
                        <ColumnCountDisplay>{col.cardCount}</ColumnCountDisplay>
                      </ColumnHeader>
                      <ColumnBar>
                        <ColumnBarFill style={{ width: `${pct}%` }} />
                      </ColumnBar>
                      <ColumnPercent>{pct.toFixed(0)}% of total</ColumnPercent>
                    </ColumnCard>
                  )
                })}
              </ColumnGrid>
            </section>
          )}

          {/* ── Tickets Completed per User ── */}
          {sortedUsers.length === 0 && columns.length > 0 && (
            <AnalyticsHint className="text-muted">
              No completions recorded in the last 7 days. Done list names configured as:{' '}
              <strong>{board.doneListNames.map((n) => `"${n}"`).join(', ')}</strong>. Update{' '}
              <strong>Done List Names</strong> in ⚙️&nbsp;Settings if this doesn&apos;t match your
              board.
            </AnalyticsHint>
          )}
          {sortedUsers.length > 0 && (
            <section>
              <SectionTitle>Tickets Completed per User (last 7 days)</SectionTitle>
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
            </section>
          )}

          {/* ── Story Points Completed per User (last 7 days) ── */}
          {storyPointStats.length > 0 && (
            <section>
              <SectionTitle>{'Story Points Completed per User (last 7 days)'}</SectionTitle>
              <UserList>
                {storyPointStats.map((row) => {
                  const maxSp = storyPointStats[0].storyPoints || 1
                  const pct = (row.storyPoints / maxSp) * 100
                  return (
                    <UserRow key={row.userId ?? 'unassigned'}>
                      <UserName>{row.userName}</UserName>
                      <BarWrap>
                        <BarFill style={{ width: `${pct}%` }} />
                      </BarWrap>
                      <UserCount>{row.storyPoints}</UserCount>
                    </UserRow>
                  )
                })}
              </UserList>
            </section>
          )}

          {/* ── Story Point Trend ── */}
          <section>
            <ChartHeader>
              <SectionTitle>Story Point Trend — Past 12 Months</SectionTitle>
              {allHistoryWeeks.length > 0 && (
                <ChartNav>
                  <ChartNavBtn
                    onClick={() =>
                      dispatch(historyOffsetChanged(Math.min(historyOffset + 1, maxOffset)))
                    }
                    disabled={clampedOffset >= maxOffset}
                    title="View older weeks"
                  >
                    ◀
                  </ChartNavBtn>
                  <ChartNavLabel>{pageRangeLabel}</ChartNavLabel>
                  <ChartNavBtn
                    onClick={() => dispatch(historyOffsetChanged(Math.max(historyOffset - 1, 0)))}
                    disabled={clampedOffset === 0}
                    title="View newer weeks"
                  >
                    ▶
                  </ChartNavBtn>
                </ChartNav>
              )}
            </ChartHeader>
            {allHistoryWeeks.length === 0 ? (
              <p className="text-muted">
                {columns.length > 0 ? (
                  <>
                    No analytics data yet. Analytics counts cards moved to your done list&nbsp;—
                    currently configured as:{' '}
                    <strong>{board.doneListNames.map((n) => `"${n}"`).join(', ')}</strong>. If your
                    done column has a different name (e.g. &quot;Released&quot;), update{' '}
                    <strong>Done List Names</strong> in ⚙️&nbsp;Settings.
                  </>
                ) : (
                  'No historical data yet. Click ↻ Fetch from Trello to import your board data.'
                )}
              </p>
            ) : (
              <ChartWrapper>
                <Line data={historyChartData} options={historyChartOptions} />
              </ChartWrapper>
            )}
          </section>

          {/* ── Story Points by Epic per Week ── */}
          {board.epicBoardId && (
            <section>
              <ChartHeader>
                <SectionTitle>Story Points by Epic — Past 12 Months</SectionTitle>
                {allEpicWeeks.length > 0 && (
                  <ChartNav>
                    <ChartNavBtn
                      onClick={() =>
                        dispatch(
                          epicHistoryOffsetChanged(Math.min(epicHistoryOffset + 1, maxEpicOffset))
                        )
                      }
                      disabled={clampedEpicOffset >= maxEpicOffset}
                      title="View older weeks"
                    >
                      ◀
                    </ChartNavBtn>
                    <ChartNavLabel>{epicPageRangeLabel}</ChartNavLabel>
                    <ChartNavBtn
                      onClick={() =>
                        dispatch(epicHistoryOffsetChanged(Math.max(epicHistoryOffset - 1, 0)))
                      }
                      disabled={clampedEpicOffset === 0}
                      title="View newer weeks"
                    >
                      ▶
                    </ChartNavBtn>
                  </ChartNav>
                )}
              </ChartHeader>
              {allEpicWeeks.length === 0 ? (
                <p className="text-muted">
                  No epic data yet. Click ↻ Fetch from Trello to import your board data.
                </p>
              ) : (
                <ChartWrapper>
                  <Bar data={epicChartData} options={epicChartOptions} />
                </ChartWrapper>
              )}
            </section>
          )}

          {/* ── Tickets by Label ── */}
          {Object.keys(labelGroups).length > 0 && (
            <section>
              <SectionTitle>Tickets by Label</SectionTitle>
              <LabelList>
                {Object.entries(labelGroups).map(([labelName, { color, users }]) => (
                  <LabelGroup key={labelName}>
                    <LabelHeader>
                      <LabelDot style={{ background: labelColor(color) }} />
                      <LabelName>{labelName || '(no name)'}</LabelName>
                      <LabelTotal>{users.reduce((s, u) => s + u.count, 0)} total</LabelTotal>
                    </LabelHeader>
                    <LabelUserList>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th style={{ textAlign: 'right' }}>Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <LabelUserRow key={u.userId ?? 'unassigned'}>
                            <LabelUserName>{u.userName}</LabelUserName>
                            <LabelUserCount>{u.count}</LabelUserCount>
                          </LabelUserRow>
                        ))}
                      </tbody>
                    </LabelUserList>
                  </LabelGroup>
                ))}
              </LabelList>
            </section>
          )}
        </>
      )}
    </Container>
  )
}
