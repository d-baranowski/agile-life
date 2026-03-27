import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig } from '@shared/board.types'
import type {
  ColumnCount,
  WeeklyUserStats,
  LabelUserStats,
  WeeklyHistory
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

// Show at most 13 tick labels on the x-axis (≈ 12 months + 1 buffer)
const MAX_HISTORY_TICKS = 13
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [colResult, weeklyResult, labelResult, historyResult] = await Promise.all([
      api.analytics.columnCounts(board.boardId),
      api.analytics.weeklyUserStats(board.boardId),
      api.analytics.labelUserStats(board.boardId),
      api.analytics.weeklyHistory(board.boardId)
    ])

    if (colResult.success && colResult.data) setColumns(colResult.data)
    else if (!colResult.success) setError(colResult.error ?? 'Failed to load column counts.')
    if (weeklyResult.success) setWeeklyStats(weeklyResult.data ?? [])
    else setError((prev) => prev ?? weeklyResult.error ?? 'Failed to load weekly stats.')
    if (labelResult.success) setLabelStats(labelResult.data ?? [])
    else setError((prev) => prev ?? labelResult.error ?? 'Failed to load label stats.')
    if (historyResult.success) setHistoryStats(historyResult.data ?? [])

    setLoading(false)
  }, [board.boardId])

  useEffect(() => {
    loadAll()
  }, [loadAll, syncVersion])

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

  // ── 12-month history chart ────────────────────────────────────────────────────

  const allHistoryWeeks = [...new Set(historyStats.map((r) => r.week))].sort()
  const historyUserMap = new Map<string, { userName: string; idx: number }>()
  historyStats.forEach((r) => {
    const key = r.userId ?? 'unassigned'
    if (!historyUserMap.has(key))
      historyUserMap.set(key, { userName: r.userName, idx: historyUserMap.size })
  })

  const historyLookup = new Map<string, Map<string, number>>()
  historyStats.forEach((r) => {
    const key = r.userId ?? 'unassigned'
    if (!historyLookup.has(r.week)) historyLookup.set(r.week, new Map())
    historyLookup.get(r.week)?.set(key, r.closedCount)
  })

  const historyChartData = {
    labels: allHistoryWeeks,
    datasets: [...historyUserMap.entries()].map(([userId, { userName, idx }]) => {
      const color = USER_PALETTE[idx % USER_PALETTE.length]
      return {
        label: userName,
        data: allHistoryWeeks.map((w) => historyLookup.get(w)?.get(userId) ?? 0),
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
      x: { ticks: { maxTicksLimit: MAX_HISTORY_TICKS } },
      y: { beginAtZero: true, ticks: { precision: 0 } }
    }
  }

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

          {/* ── Completion Trend ── */}
          <section>
            <h2 className={styles.sectionTitle}>Completion Trend — Past 12 Months</h2>
            {allHistoryWeeks.length === 0 ? (
              <p className="text-muted">
                No historical data yet. Sync your board to populate this chart.
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
