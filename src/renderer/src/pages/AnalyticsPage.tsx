import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig } from '@shared/board.types'
import type { WeeklyUserStats, LabelUserStats } from '@shared/analytics.types'
import { api } from '../hooks/useApi'
import styles from './AnalyticsPage.module.css'

interface Props {
  board: BoardConfig
}

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

export default function AnalyticsPage({ board }: Props): JSX.Element {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyUserStats[]>([])
  const [labelStats, setLabelStats] = useState<LabelUserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [weeklyResult, labelResult] = await Promise.all([
      api.analytics.weeklyUserStats(board.boardId),
      api.analytics.labelUserStats(board.boardId)
    ])

    if (!weeklyResult.success) {
      setError(weeklyResult.error ?? 'Failed to load weekly stats.')
    } else {
      setWeeklyStats(weeklyResult.data ?? [])
    }

    if (!labelResult.success) {
      setError((prev) => prev ?? (labelResult.error ?? 'Failed to load label stats.'))
    } else {
      setLabelStats(labelResult.data ?? [])
    }

    setLoading(false)
  }, [board.boardId])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // ── Derived data ────────────────────────────────────────────────────────────

  // Aggregate weekly stats by user (sum across weeks)
  const userTotals = weeklyStats.reduce<Record<string, { userName: string; count: number }>>(
    (acc, row) => {
      if (!acc[row.userId]) {
        acc[row.userId] = { userName: row.userName, count: 0 }
      }
      acc[row.userId].count += row.closedCount
      return acc
    },
    {}
  )
  const sortedUsers = Object.entries(userTotals).sort((a, b) => b[1].count - a[1].count)
  const maxUserCount = sortedUsers[0]?.[1].count ?? 1

  // Group label stats by label for the drill-down table
  const labelGroups = labelStats.reduce<
    Record<string, { color: string; users: { userId: string; userName: string; count: number }[] }>
  >((acc, row) => {
    if (!acc[row.labelName]) {
      acc[row.labelName] = { color: row.labelColor, users: [] }
    }
    acc[row.labelName].users.push({ userId: row.userId, userName: row.userName, count: row.closedCount })
    return acc
  }, {})

  const totalCompleted = sortedUsers.reduce((s, [, u]) => s + u.count, 0)

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
                          <tr key={u.userId}>
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
        </>
      )}
    </div>
  )
}