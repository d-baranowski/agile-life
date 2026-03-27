import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig } from '@shared/board.types'
import type { WeeklyUserStats, LabelUserStats, WeeklyHistory } from '@shared/analytics.types'
import { api } from '../hooks/useApi'
import styles from './AnalyticsPage.module.css'
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

const HISTORY_PAGE_SIZE = 13

export default function AnalyticsPage({ board }: Props): JSX.Element {
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
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h1>{board.boardName} — Analytics</h1>
        <span className={styles.hint}>Last 7 days · synced data</span>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>
          <div className="spinner" />
          <span>Loading analytics…</span>
        </div>
      ) : weeklyStats.length === 0 && labelStats.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No completed tickets found in the last 7 days.</p>
          <p className="text-muted mt-2">
            Sync your board first, then make sure your &ldquo;Done&rdquo; list names match the
            settings configured for this board.
          </p>
        </div>
      ) : (
        <>
          {/* ── Summary strip ── */}
          <div className={styles.statsStrip}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalCompleted}</span>
              <span className={styles.statLabel}>Tickets Completed</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{sortedUsers.length}</span>
              <span className={styles.statLabel}>Contributors</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{Object.keys(labelGroups).length}</span>
              <span className={styles.statLabel}>Labels</span>
            </div>
          </div>

          {/* ── Per-user section ── */}
          <section>
            <h2 className={styles.sectionTitle}>Tickets Completed per User</h2>
            {sortedUsers.length === 0 ? (
              <p className="text-muted">No data.</p>
            ) : (
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
            )}
          </section>

          {/* ── Label drill-down ── */}
          <section>
            <h2 className={styles.sectionTitle}>Tickets by Label</h2>
            {Object.keys(labelGroups).length === 0 ? (
              <p className="text-muted">
                No labelled tickets found. Labels are required for this breakdown.
              </p>
            ) : (
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
            )}
          </section>

          {/* ── Story-point history chart ── */}
          <section>
            <div className={styles.chartHeader}>
              <h2 className={styles.sectionTitle}>Story Point Trend — Past 12 Months</h2>
              {allHistoryWeeks.length > 0 && (
                <div className={styles.chartNav}>
                  <button
                    className={styles.chartNavBtn}
                    onClick={() => setHistoryOffset((o) => Math.min(o + 1, maxOffset))}
                    disabled={clampedOffset >= maxOffset}
                    title="Older"
                  >
                    ◀
                  </button>
                  <span className={styles.chartNavLabel}>{pageRangeLabel}</span>
                  <button
                    className={styles.chartNavBtn}
                    onClick={() => setHistoryOffset((o) => Math.max(o - 1, 0))}
                    disabled={clampedOffset === 0}
                    title="Newer"
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
            {allHistoryWeeks.length === 0 ? (
              <p className="text-muted">
                No historical data yet. Sync your board to populate this chart — the sync now
                fetches all cards (including archived ones) so historical completions will appear
                here.
              </p>
            ) : (
              <div className={styles.chartWrap}>
                <Line data={historyChartData} options={historyChartOptions} />
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
