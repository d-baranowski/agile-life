import { useEffect } from 'react'
import type { BoardConfig } from '../../lib/board.types'
import { labelColor } from '../../lib/label-colors'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchDashboardData,
  historyOffsetChanged,
  epicHistoryOffsetChanged,
  selectTotalCards,
  selectUserCompletions,
  selectLabelGroups,
  selectHistoryChart,
  selectEpicChart
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

export default function Dashboard(props: Props): JSX.Element {
  const { board, syncVersion } = props
  const dispatch = useAppDispatch()

  // ── Redux state ──────────────────────────────────────────────────────────
  const columns = useAppSelector((s) => s.dashboard.columns)
  const storyPointStats = useAppSelector((s) => s.dashboard.storyPointStats)
  const loading = useAppSelector((s) => s.dashboard.loading)
  const error = useAppSelector((s) => s.dashboard.error)
  const historyOffset = useAppSelector((s) => s.dashboard.historyOffset)
  const epicHistoryOffset = useAppSelector((s) => s.dashboard.epicHistoryOffset)

  // ── Memoized selectors ───────────────────────────────────────────────────
  const totalCards = useAppSelector(selectTotalCards)
  const { sortedUsers, maxUserCount, totalCompleted } = useAppSelector(selectUserCompletions)
  const labelGroups = useAppSelector(selectLabelGroups)
  const history = useAppSelector(selectHistoryChart)
  const epic = useAppSelector(selectEpicChart)

  useEffect(() => {
    dispatch(
      fetchDashboardData({
        boardId: board.boardId,
        storyPointsConfig: board.storyPointsConfig
      })
    )
  }, [dispatch, board.boardId, board.storyPointsConfig, syncVersion])

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
              {history.allWeeks.length > 0 && (
                <ChartNav>
                  <ChartNavBtn
                    onClick={() =>
                      dispatch(historyOffsetChanged(Math.min(historyOffset + 1, history.maxOffset)))
                    }
                    disabled={history.clampedOffset >= history.maxOffset}
                    title="View older weeks"
                  >
                    ◀
                  </ChartNavBtn>
                  <ChartNavLabel>{history.pageRangeLabel}</ChartNavLabel>
                  <ChartNavBtn
                    onClick={() => dispatch(historyOffsetChanged(Math.max(historyOffset - 1, 0)))}
                    disabled={history.clampedOffset === 0}
                    title="View newer weeks"
                  >
                    ▶
                  </ChartNavBtn>
                </ChartNav>
              )}
            </ChartHeader>
            {history.allWeeks.length === 0 ? (
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
                <Line data={history.chartData} options={history.chartOptions} />
              </ChartWrapper>
            )}
          </section>

          {/* ── Story Points by Epic per Week ── */}
          {board.epicBoardId && (
            <section>
              <ChartHeader>
                <SectionTitle>Story Points by Epic — Past 12 Months</SectionTitle>
                {epic.allWeeks.length > 0 && (
                  <ChartNav>
                    <ChartNavBtn
                      onClick={() =>
                        dispatch(
                          epicHistoryOffsetChanged(Math.min(epicHistoryOffset + 1, epic.maxOffset))
                        )
                      }
                      disabled={epic.clampedOffset >= epic.maxOffset}
                      title="View older weeks"
                    >
                      ◀
                    </ChartNavBtn>
                    <ChartNavLabel>{epic.pageRangeLabel}</ChartNavLabel>
                    <ChartNavBtn
                      onClick={() =>
                        dispatch(epicHistoryOffsetChanged(Math.max(epicHistoryOffset - 1, 0)))
                      }
                      disabled={epic.clampedOffset === 0}
                      title="View newer weeks"
                    >
                      ▶
                    </ChartNavBtn>
                  </ChartNav>
                )}
              </ChartHeader>
              {epic.allWeeks.length === 0 ? (
                <p className="text-muted">
                  No epic data yet. Click ↻ Fetch from Trello to import your board data.
                </p>
              ) : (
                <ChartWrapper>
                  <Bar data={epic.chartData} options={epic.chartOptions} />
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
