import React, { useState, useEffect, useCallback } from 'react'
import type { BoardConfig, WeeklyUserStats, LabelUserStats, CardAgeStats } from '@shared/types'
import { api } from '../hooks/useApi'
import styles from './AnalyticsPage.module.css'

interface Props {
  board: BoardConfig
}

type AnalyticsTab = 'weekly' | 'labels' | 'age'

const LABEL_COLORS: Record<string, string> = {
  green: '#27ae60',
  yellow: '#f39c12',
  orange: '#e67e22',
  red: '#e74c3c',
  purple: '#9b59b6',
  blue: '#3498db',
  sky: '#5dade2',
  lime: '#82e0aa',
  pink: '#e91e63',
  black: '#333',
  null: '#666'
}

export default function AnalyticsPage({ board }: Props): JSX.Element {
  const [tab, setTab] = useState<AnalyticsTab>('weekly')
  const [weeklyStats, setWeeklyStats] = useState<WeeklyUserStats[]>([])
  const [labelStats, setLabelStats] = useState<LabelUserStats[]>([])
  const [cardAges, setCardAges] = useState<CardAgeStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [weekly, labels, ages] = await Promise.all([
      api.analytics.weeklyUserStats(board.boardId),
      api.analytics.labelUserStats(board.boardId),
      api.analytics.cardAge(board.boardId)
    ])

    if (weekly.success) setWeeklyStats(weekly.data ?? [])
    if (labels.success) setLabelStats(labels.data ?? [])
    if (ages.success) setCardAges(ages.data ?? [])

    const firstError = [weekly, labels, ages].find((r) => !r.success)
    if (firstError) setError(firstError.error ?? 'Unknown error')

    setLoading(false)
  }, [board.boardId])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Analytics — {board.boardName}</h1>
        <button className="btn-secondary" onClick={loadAnalytics} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <p className={styles.hint}>
        Analytics are computed from locally cached data. Use the Dashboard to sync the latest
        data from Trello first.
      </p>

      {/* ── Tab Bar ── */}
      <div className={styles.tabs}>
        {([
          ['weekly', '📅 Closed per Week'],
          ['labels', '🏷️ By Label'],
          ['age', '⏳ Card Age']
        ] as [AnalyticsTab, string][]).map(([t, label]) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className="spinner" /> Loading analytics…
        </div>
      ) : (
        <>
          {/* ── Weekly Stats ── */}
          {tab === 'weekly' && (
            <div>
              <h2 className={styles.sectionTitle}>Cards Closed per Week per User</h2>
              {weeklyStats.length === 0 ? (
                <EmptyState />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>User</th>
                      <th>Cards Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyStats.map((s, i) => (
                      <tr key={i}>
                        <td className="font-mono">{s.week}</td>
                        <td>{s.userName}</td>
                        <td>
                          <span className="badge badge-info">{s.closedCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Label Stats ── */}
          {tab === 'labels' && (
            <div>
              <h2 className={styles.sectionTitle}>Cards Closed by Label & User</h2>
              {labelStats.length === 0 ? (
                <EmptyState />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>User</th>
                      <th>Cards Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labelStats.map((s, i) => (
                      <tr key={i}>
                        <td>
                          <span
                            className={styles.labelDot}
                            style={{
                              background:
                                LABEL_COLORS[s.labelColor] ?? LABEL_COLORS['null']
                            }}
                          />
                          {s.labelName}
                        </td>
                        <td>{s.userName}</td>
                        <td>
                          <span className="badge badge-info">{s.closedCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Card Age ── */}
          {tab === 'age' && (
            <div>
              <h2 className={styles.sectionTitle}>Card Age (by last activity)</h2>
              {cardAges.length === 0 ? (
                <EmptyState />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Card</th>
                      <th>Column</th>
                      <th>Assignees</th>
                      <th>Age (days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardAges.map((c, i) => (
                      <tr key={i}>
                        <td>{c.cardName}</td>
                        <td className="text-muted">{c.listName}</td>
                        <td className="text-muted">{c.assignees.join(', ') || '—'}</td>
                        <td>
                          <span
                            className={`badge ${
                              c.ageInDays > 30
                                ? 'badge-danger'
                                : c.ageInDays > 14
                                ? 'badge-warning'
                                : 'badge-success'
                            }`}
                          >
                            {c.ageInDays}d
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <p style={{ color: 'var(--color-text-muted)', padding: '24px 0' }}>
      No data available. Sync the board from the Dashboard first.
    </p>
  )
}
