import { useState, useEffect, useCallback } from 'react'
import type {
  BoardConfig,
  SyncResult,
  ArchiveResult,
  DoneCardPreview,
  DoneCardDebugInfo
} from '@shared/board.types'
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

  const [archiveWeeks, setArchiveWeeks] = useState(2)
  const [previewing, setPreviewing] = useState(false)
  const [previewCards, setPreviewCards] = useState<DoneCardPreview[] | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [archiveResult, setArchiveResult] = useState<ArchiveResult | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const [debugOpen, setDebugOpen] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugCards, setDebugCards] = useState<DoneCardDebugInfo[] | null>(null)
  const [debugError, setDebugError] = useState<string | null>(null)

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
    setPreviewCards(null)
    setPreviewError(null)
    setArchiveResult(null)
    setArchiveError(null)
    setDebugOpen(false)
    setDebugCards(null)
    setDebugError(null)
    loadCounts()
  }, [loadCounts])

  // Reset preview when weeks threshold changes
  useEffect(() => {
    setPreviewCards(null)
    setPreviewError(null)
    setArchiveResult(null)
    setArchiveError(null)
  }, [archiveWeeks])

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

  const handlePreview = async (): Promise<void> => {
    setPreviewing(true)
    setPreviewError(null)
    setPreviewCards(null)
    setArchiveResult(null)
    setArchiveError(null)
    const result = await api.trello.previewArchiveDoneCards(board.boardId, archiveWeeks)
    if (result.success && result.data) {
      setPreviewCards(result.data)
    } else {
      setPreviewError(result.error ?? 'Preview failed.')
    }
    setPreviewing(false)
  }

  const handleArchive = async (): Promise<void> => {
    setArchiving(true)
    setArchiveError(null)
    setArchiveResult(null)
    const result = await api.trello.archiveDoneCards(board.boardId, archiveWeeks)
    if (result.success && result.data) {
      setArchiveResult(result.data)
      setPreviewCards(null)
      setDebugCards(null)
      await loadCounts()
    } else {
      setArchiveError(result.error ?? 'Archive failed.')
    }
    setArchiving(false)
  }

  const handleDebugToggle = async (): Promise<void> => {
    if (debugOpen) {
      setDebugOpen(false)
      return
    }
    setDebugOpen(true)
    setDebugLoading(true)
    setDebugError(null)
    const result = await api.trello.getDoneColumnDebug(board.boardId)
    if (result.success && result.data) {
      setDebugCards(result.data)
    } else {
      setDebugError(result.error ?? 'Failed to load debug data.')
    }
    setDebugLoading(false)
  }

  const totalCards = columns.reduce((sum, c) => sum + c.cardCount, 0)

  const doneListLabel = (board.doneListNames ?? ['Done']).join(', ')

  function weeksAgo(isoDate: string): string {
    const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'today'
    if (days < 7) return `${days}d`
    const weeks = Math.floor(days / 7)
    return `${weeks}w`
  }

  function fmtDate(isoDate: string): string {
    try {
      return new Date(isoDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return isoDate
    }
  }

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

      {/* ── Archive done cards ── */}
      <div className="card">
        <h2 className={styles.sectionTitle}>Archive Done Cards</h2>
        <p className={styles.archiveHint}>
          Archive cards from the <strong>{doneListLabel}</strong>{' '}
          {board.doneListNames.length === 1 ? 'column' : 'columns'} on Trello that have been in the
          done column for the selected number of weeks. The cards will remain in your local database
          (marked as archived) so your history is preserved.
        </p>

        <div className={styles.archiveControls}>
          <label className={styles.weeksLabel}>
            In done for at least
            <input
              type="number"
              min={1}
              max={52}
              value={archiveWeeks}
              onChange={(e) => setArchiveWeeks(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={styles.weeksInput}
            />
            week{archiveWeeks !== 1 ? 's' : ''}
          </label>
          <button
            className="btn-secondary"
            onClick={handlePreview}
            disabled={previewing || archiving || syncing}
          >
            {previewing ? (
              <span className={styles.syncingLabel}>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Loading…
              </span>
            ) : (
              '🔍 Preview'
            )}
          </button>
        </div>

        {previewError && <div className={styles.errorBanner}>{previewError}</div>}
        {archiveError && <div className={styles.errorBanner}>{archiveError}</div>}

        {archiveResult && (
          <div className={styles.archiveSuccess}>
            ✓ Archived {archiveResult.archivedCount} card
            {archiveResult.archivedCount !== 1 ? 's' : ''}
            {archiveResult.skippedCount > 0 ? ` (${archiveResult.skippedCount} skipped)` : ''}.
          </div>
        )}

        {previewCards !== null && (
          <div className={styles.previewSection}>
            {previewCards.length === 0 ? (
              <p className={styles.previewEmpty}>
                No cards have been in the done column for {archiveWeeks} week
                {archiveWeeks !== 1 ? 's' : ''} or more.
              </p>
            ) : (
              <>
                <p className={styles.previewCount}>
                  {previewCards.length} card{previewCards.length !== 1 ? 's' : ''} will be archived:
                </p>
                <ul className={styles.previewList}>
                  {previewCards.map((card) => (
                    <li key={card.id} className={styles.previewItem}>
                      <span className={styles.previewCardName}>{card.name}</span>
                      <span className={styles.previewCardMeta}>
                        {card.listName} · {weeksAgo(card.enteredDoneAt)} in Done
                      </span>
                    </li>
                  ))}
                </ul>
                <div className={styles.previewActions}>
                  <button
                    className="btn-danger"
                    onClick={handleArchive}
                    disabled={archiving || syncing}
                  >
                    {archiving ? (
                      <span className={styles.syncingLabel}>
                        <span
                          className="spinner"
                          style={{ width: 14, height: 14, borderWidth: 2 }}
                        />
                        Archiving…
                      </span>
                    ) : (
                      `🗄 Archive ${previewCards.length} Card${previewCards.length !== 1 ? 's' : ''}`
                    )}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setPreviewCards(null)}
                    disabled={archiving}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Debug: Done column card data ── */}
      <div className="card">
        <div className={styles.debugHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Diagnostic: Done Column Data</h2>
            <p className={styles.archiveHint}>
              Shows the raw data stored for every card currently in the{' '}
              <strong>{doneListLabel}</strong>{' '}
              {board.doneListNames.length === 1 ? 'column' : 'columns'}. Use this to understand why
              a card is or is not being picked up by the archive threshold. The{' '}
              <em>Entered Done</em> timestamp is what the archive query compares against your
              threshold.
            </p>
          </div>
          <button
            className="btn-ghost"
            onClick={handleDebugToggle}
            disabled={debugLoading}
            style={{ flexShrink: 0 }}
          >
            {debugOpen ? '▲ Hide' : '▼ Show'}
          </button>
        </div>

        {debugOpen && (
          <>
            {debugError && <div className={styles.errorBanner}>{debugError}</div>}
            {debugLoading && (
              <div className={styles.centred}>
                <div className="spinner" />
                <span>Loading…</span>
              </div>
            )}
            {!debugLoading && debugCards !== null && (
              <>
                {debugCards.length === 0 ? (
                  <p className={styles.previewEmpty}>
                    No open cards found in the <strong>{doneListLabel}</strong>{' '}
                    {board.doneListNames.length === 1 ? 'column' : 'columns'}. Make sure you have
                    synced the board and that the done list name matches exactly.
                  </p>
                ) : (
                  <div className={styles.debugTableWrap}>
                    <table className={styles.debugTable}>
                      <thead>
                        <tr>
                          <th>Card</th>
                          <th>Column</th>
                          <th>Entered Done</th>
                          <th>Last Activity</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debugCards.map((card) => (
                          <tr key={card.id}>
                            <td className={styles.debugCardName}>{card.name}</td>
                            <td>{card.listName}</td>
                            <td>
                              {fmtDate(card.enteredDoneAt)}{' '}
                              <span className={styles.debugAge}>
                                ({weeksAgo(card.enteredDoneAt)})
                              </span>
                            </td>
                            <td>{fmtDate(card.dateLastActivity)}</td>
                            <td>
                              <span
                                className={
                                  card.hasActionEntry
                                    ? styles.debugBadgeAction
                                    : styles.debugBadgeFallback
                                }
                              >
                                {card.hasActionEntry ? 'move action' : 'fallback'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

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
