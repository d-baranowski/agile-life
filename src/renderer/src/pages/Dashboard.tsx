import React, { useState, useEffect, useCallback } from 'react'
import type { BoardConfig, ColumnCount } from '@shared/types'
import { api } from '../hooks/useApi'
import styles from './Dashboard.module.css'

interface Props {
  board: BoardConfig
}

export default function Dashboard({ board }: Props): JSX.Element {
  const [columns, setColumns] = useState<ColumnCount[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await api.analytics.columnCounts(board.boardId)
    if (result.success && result.data) {
      setColumns(result.data)
    } else {
      setError(result.error ?? 'Failed to load column data.')
    }
    setLoading(false)
  }, [board.boardId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    const result = await api.trello.sync(board.boardId)
    if (!result.success) {
      setError(result.error ?? 'Sync failed.')
    } else {
      setLastSync(new Date())
      await loadData()
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
          {board.projectCode && (
            <span className="badge badge-info" style={{ marginTop: 4 }}>
              {board.projectCode}
            </span>
          )}
        </div>
        <div className={styles.headerActions}>
          {lastSync && (
            <span className={styles.lastSync}>
              Last synced: {lastSync.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn-secondary"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />{' '}
                Syncing…
              </>
            ) : (
              '↻ Sync from Trello'
            )}
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* ── Stats Strip ── */}
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

      {/* ── Column Cards ── */}
      <h2 className={styles.sectionTitle}>Cards per Column</h2>
      {loading ? (
        <div className={styles.loadingState}>
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      ) : columns.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No data yet. Click <strong>Sync from Trello</strong> to import board data.</p>
        </div>
      ) : (
        <div className={styles.columnsGrid}>
          {columns.map((col) => {
            const fillPct = totalCards > 0 ? (col.cardCount / totalCards) * 100 : 0
            return (
              <div key={col.listId} className={styles.columnCard}>
                <div className={styles.columnHeader}>
                  <span className={styles.columnName}>{col.listName}</span>
                  <span className={styles.columnCount}>{col.cardCount}</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span className={styles.columnPct}>{fillPct.toFixed(0)}% of total</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
