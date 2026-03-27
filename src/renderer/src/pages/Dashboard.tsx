import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig, SyncResult } from '@shared/board.types'
import type { ColumnCount } from '@shared/analytics.types'
import { api } from '../hooks/useApi'
import styles from './Dashboard.module.css'

interface Props {
  board: BoardConfig
}

export default function Dashboard({ board }: Props): JSX.Element {
  const [columns, setColumns] = useState<ColumnCount[]>([])
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCounts = useCallback(async () => {
    const result = await api.analytics.columnCounts(board.boardId)
    if (result.success && result.data) {
      setColumns(result.data)
    }
    setLoading(false)
  }, [board.boardId])

  // Load cached counts on board switch; also reset archive state
  useEffect(() => {
    setLoading(true)
    setError(null)
    setSyncResult(null)
    loadCounts()
  }, [loadCounts])

  const handleSync = async (): Promise<void> => {
    setSyncing(true)
    setError(null)
    const result = await api.trello.sync(board.boardId)
    if (result.success && result.data) {
      setSyncResult(result.data)
      await loadCounts()
    } else {
      setError(result.error ?? 'Sync failed.')
    }
    setSyncing(false)
  }

  const totalCards = columns.reduce((sum, c) => sum + c.cardCount, 0)

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{board.boardName}</h1>
          {board.lastSyncedAt && !syncResult && (
            <span className={styles.lastSync}>
              Last synced {new Date(board.lastSyncedAt).toLocaleString()}
            </span>
          )}
          {syncResult && (
            <span className={styles.lastSync}>
              Synced just now — {syncResult.cardCount} cards across {syncResult.listCount} columns
            </span>
          )}
        </div>
        <button className="btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <span className={styles.syncingLabel}>
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              Fetching from Trello…
            </span>
          ) : (
            '↻ Fetch from Trello'
          )}
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* ── Summary strip ── */}
      {!loading && columns.length > 0 && (
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
            <span className={styles.statValue}>
              {columns.length > 0
                ? Math.round(totalCards / columns.filter((c) => c.cardCount > 0).length || 1)
                : 0}
            </span>
            <span className={styles.statLabel}>Avg Cards / Column</span>
          </div>
        </div>
      )}

      {/* ── Column grid ── */}
      <h2 className={styles.sectionTitle}>Cards per Column</h2>

      {loading ? (
        <div className={styles.centred}>
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      ) : columns.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No data yet.</p>
          <p className="text-muted">
            Click <strong>Fetch from Trello</strong> to import this board&apos;s data.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
