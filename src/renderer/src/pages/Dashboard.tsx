import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig } from '@shared/board.types'
import type {
  ColumnCount,
  WeeklyUserStats,
  LabelUserStats,
  WeeklyHistory,
  StoryPointsUserStats
} from '@shared/analytics.types'
import { api } from '../hooks/useApi'
import styles from './Dashboard.module.css'
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

// Map Trello label colours to CSS colour values
const LABEL_COLORS: Record<string, string> = {
  red: '#eb5a46',
  orange: '#ff9f1a',
  yellow: '#f2d600',
  green: '#61bd4f',
  blue: '#0079bf',
  purple: '#c377e0',
  pink: '#ff78cb',
  sky: '#00c2e0',
  lime: '#51e898',
  black: '#344563'
}

function resolveLabelColor(color: string): string {
  return LABEL_COLORS[color?.toLowerCase()] ?? '#8892a4'
}

export default function Dashboard({ board, syncVersion }: Props): JSX.Element {
  const [columns, setColumns] = useState<ColumnCount[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyUserStats[]>([])
  const [labelStats, setLabelStats] = useState<LabelUserStats[]>([])
  const [historyStats, setHistoryStats] = useState<WeeklyHistory[]>([])
  const [storyPointStats, setStoryPointStats] = useState<StoryPointsUserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyOffset, setHistoryOffset] = useState(0)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [colResult, weeklyResult, labelResult, historyResult, spResult] = await Promise.all([
      api.analytics.columnCounts(board.boardId),
      api.analytics.weeklyUserStats(board.boardId),
      api.analytics.labelUserStats(board.boardId),
      api.analytics.weeklyHistory(board.boardId, board.storyPointsConfig),
      api.analytics.storyPoints7d(board.boardId, board.storyPointsConfig)
    ])

    if (colResult.success && colResult.data) setColumns(colResult.data)
    else if (!colResult.success) setError(colResult.error ?? 'Failed to load column counts.')
    if (weeklyResult.success) setWeeklyStats(weeklyResult.data ?? [])
    else setError((prev) => prev ?? weeklyResult.error ?? 'Failed to load weekly stats.')
    if (labelResult.success) setLabelStats(labelResult.data ?? [])
    else setError((prev) => prev ?? labelResult.error ?? 'Failed to load label stats.')
    if (historyResult.success) setHistoryStats(historyResult.data ?? [])
    if (spResult.success) setStoryPointStats(spResult.data ?? [])

    setLoading(false)
  }, [board.boardId, board.storyPointsConfig])

  useEffect(() => {
    loadAll()
  }, [loadAll, syncVersion])

  // Reset page when history data changes
  useEffect(() => {
    setHistoryOffset(0)
  }, [historyStats])

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

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{board.boardName}</h1>
          {board.lastSyncedAt && (
            <span className={styles.lastSync}>
              Last synced {new Date(board.lastSyncedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.centred}>
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      ) : (
        <>
          {/* ── Combined summary strip ── */}
          {(columns.length > 0 || sortedUsers.length > 0) && (
            <div className={styles.statsStrip}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{totalCards}</span>
                <span className={styles.statLabel}>Total Active Cards</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{columns.length}</span>
                <span className={styles.statLabel}>Columns</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{totalCompleted}</span>
                <span className={styles.statLabel}>Completed (7 days)</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{sortedUsers.length}</span>
                <span className={styles.statLabel}>Contributors</span>
              </div>
            </div>
          )}

          {/* ── Cards per Column ── */}
          {columns.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No data yet.</p>
              <p className="text-muted">
                Click <strong>↻ Fetch from Trello</strong> in the top bar to import this
                board&apos;s data.
              </p>
            </div>
          ) : (
            <section>
              <h2 className={styles.sectionTitle}>Cards per Column</h2>
              <div className={styles.columnsGrid}>
                {columns.map((col) => {
                  const pct = totalCards > 0 ? (col.cardCount / totalCards) * 100 : 0
                  return (
                    <div key={col.listId} className={styles.columnCard}>
                      <div className={styles.columnHeader}>
                        <span className={styles.columnName}>{col.listName}</span>
                        <span className={styles.columnCount}>{col.cardCount}</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.columnPct}>{pct.toFixed(0)}% of total</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Tickets Completed per User ── */}
          {sortedUsers.length === 0 && columns.length > 0 && (
            <p className={`text-muted ${styles.analyticsHint}`}>
              No completions recorded in the last 7 days. Done list names configured as:{' '}
              <strong>{board.doneListNames.map((n) => `"${n}"`).join(', ')}</strong>. Update{' '}
              <strong>Done List Names</strong> in ⚙️&nbsp;Settings if this doesn&apos;t match your
              board.
            </p>
          )}
          {sortedUsers.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Tickets Completed per User (last 7 days)</h2>
              <div className={styles.userList}>
                {sortedUsers.map(([userId, { userName, count }]) => {
                  const pct = (count / maxUserCount) * 100
                  return (
                    <div key={userId} className={styles.userRow}>
                      <span className={styles.userName}>{userName}</span>
                      <div className={styles.barWrap}>
                        <div className={styles.barFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.userCount}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Story Points Completed per User (last 7 days) ── */}
          {storyPointStats.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>
                {'Story Points Completed per User (last 7 days)'}
              </h2>
              <div className={styles.userList}>
                {storyPointStats.map((row) => {
                  const maxSp = storyPointStats[0].storyPoints || 1
                  const pct = (row.storyPoints / maxSp) * 100
                  return (
                    <div key={row.userId ?? 'unassigned'} className={styles.userRow}>
                      <span className={styles.userName}>{row.userName}</span>
                      <div className={styles.barWrap}>
                        <div className={styles.barFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.userCount}>{row.storyPoints}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Story Point Trend ── */}
          <section>
            <div className={styles.chartHeader}>
              <h2 className={styles.sectionTitle}>Story Point Trend — Past 12 Months</h2>
              {allHistoryWeeks.length > 0 && (
                <div className={styles.chartNav}>
                  <button
                    className={styles.chartNavBtn}
                    onClick={() => setHistoryOffset((o) => Math.min(o + 1, maxOffset))}
                    disabled={clampedOffset >= maxOffset}
                    title="View older weeks"
                  >
                    ◀
                  </button>
                  <span className={styles.chartNavLabel}>{pageRangeLabel}</span>
                  <button
                    className={styles.chartNavBtn}
                    onClick={() => setHistoryOffset((o) => Math.max(o - 1, 0))}
                    disabled={clampedOffset === 0}
                    title="View newer weeks"
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
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
              <div className={styles.chartWrap}>
                <Line data={historyChartData} options={historyChartOptions} />
              </div>
            )}
          </section>

          {/* ── Tickets by Label ── */}
          {Object.keys(labelGroups).length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Tickets by Label</h2>
              <div className={styles.labelList}>
                {Object.entries(labelGroups).map(([labelName, { color, users }]) => (
                  <div key={labelName} className={styles.labelGroup}>
                    <div className={styles.labelHeader}>
                      <span
                        className={styles.labelDot}
                        style={{ background: resolveLabelColor(color) }}
                      />
                      <span className={styles.labelName}>{labelName || '(no name)'}</span>
                      <span className={styles.labelTotal}>
                        {users.reduce((s, u) => s + u.count, 0)} total
                      </span>
                    </div>
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
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
