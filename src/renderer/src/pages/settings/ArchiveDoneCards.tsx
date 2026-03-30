import { useState } from 'react'
import type { ArchiveResult, DoneCardPreview, DoneCardDebugInfo } from '@shared/board.types'
import { api } from '../../hooks/useApi'
import { weeksAgo } from '../../lib/weeks-ago'
import { fmtDate } from '../../lib/fmt-date'
import styles from '../SettingsPage.module.css'

interface Props {
  boardId: string
  doneListLabel: string
  doneListCount: number
}

export default function ArchiveDoneCards({
  boardId,
  doneListLabel,
  doneListCount
}: Props): JSX.Element {
  const [archiveWeeks, setArchiveWeeks] = useState(4)
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

  const handlePreview = async (): Promise<void> => {
    setPreviewing(true)
    setPreviewError(null)
    setPreviewCards(null)
    setArchiveResult(null)
    setArchiveError(null)
    const result = await api.trello.previewArchiveDoneCards(boardId, archiveWeeks)
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
    const result = await api.trello.archiveDoneCards(boardId, archiveWeeks)
    if (result.success && result.data) {
      setArchiveResult(result.data)
      setPreviewCards(null)
      setDebugCards(null)
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
    const result = await api.trello.getDoneColumnDebug(boardId)
    if (result.success && result.data) {
      setDebugCards(result.data)
    } else {
      setDebugError(result.error ?? 'Failed to load debug data.')
    }
    setDebugLoading(false)
  }

  return (
    <>
      {/* ── Archive Done Cards ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>Archive Done Cards</h2>
        <p className={styles.hint}>
          Archive cards from the <strong>{doneListLabel}</strong>{' '}
          {doneListCount === 1 ? 'column' : 'columns'} on Trello that have been in the done column
          for the selected number of weeks. The cards will remain in your local database (marked as
          archived) so your history is preserved.
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
            disabled={previewing || archiving}
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
                  <button className="btn-danger" onClick={handleArchive} disabled={archiving}>
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

      {/* ── Diagnostic: Done Column Data ── */}
      <div className="card">
        <div className={styles.debugHeader}>
          <div>
            <h2 className={styles.cardTitle}>Diagnostic: Done Column Data</h2>
            <p className={styles.hint}>
              Shows the raw data stored for every card currently in the{' '}
              <strong>{doneListLabel}</strong> {doneListCount === 1 ? 'column' : 'columns'}. Use
              this to understand why a card is or is not being picked up by the archive threshold.
              The <em>Entered Done</em> timestamp is what the archive query compares against your
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
                    {doneListCount === 1 ? 'column' : 'columns'}. Make sure you have synced the
                    board and that the done list name matches exactly.
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
                                {card.hasActionEntry ? '🟢 move action' : '🟡 fallback'}
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
    </>
  )
}
