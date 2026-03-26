/**
 * Ticket Numbering page — assigns JIRA-style prefixes (e.g. AGI-000001) to
 * every open Trello card that does not already have one.
 */
import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig } from '@shared/board.types'
import type { TicketNumberingConfig, UnnumberedCard } from '@shared/ticket.types'
import { api } from '../hooks/useApi'
import styles from './TicketNumberingPage.module.css'

interface Props {
  board: BoardConfig
}

type CardStatus = 'queued' | 'in-progress' | 'success' | 'error'

interface CardState {
  card: UnnumberedCard
  status: CardStatus
  error?: string
  showError: boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function TicketNumberingPage({ board }: Props): JSX.Element {
  const [config, setConfig] = useState<TicketNumberingConfig | null>(null)
  const [projectCode, setProjectCode] = useState('')
  const [nextTicketNumber, setNextTicketNumber] = useState(1)
  const [configError, setConfigError] = useState<string | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)

  const [preview, setPreview] = useState<UnnumberedCard[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Per-card apply state — populated once the user clicks Apply
  const [cardStates, setCardStates] = useState<CardState[] | null>(null)
  const [applying, setApplying] = useState(false)

  const loadConfig = useCallback(async () => {
    const result = await api.tickets.getConfig(board.boardId)
    if (result.success && result.data) {
      setConfig(result.data)
      setProjectCode(result.data.projectCode)
      setNextTicketNumber(result.data.nextTicketNumber)
    }
  }, [board.boardId])

  useEffect(() => {
    setConfig(null)
    setPreview(null)
    setCardStates(null)
    setConfigError(null)
    setPreviewError(null)
    loadConfig()
  }, [loadConfig])

  const handleSaveConfig = async () => {
    const code = projectCode.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(code)) {
      setConfigError('Project code must be exactly 3 uppercase letters (e.g. AGI).')
      return
    }
    setSavingConfig(true)
    setConfigError(null)
    const result = await api.tickets.updateConfig(board.boardId, {
      projectCode: code,
      nextTicketNumber
    })
    setSavingConfig(false)
    if (!result.success) {
      setConfigError(result.error ?? 'Failed to save configuration.')
    } else {
      await loadConfig()
      setPreview(null)
      setCardStates(null)
    }
  }

  const handlePreview = async () => {
    setLoadingPreview(true)
    setPreviewError(null)
    setCardStates(null)
    const result = await api.tickets.previewUnnumbered(board.boardId)
    setLoadingPreview(false)
    if (result.success && result.data) {
      setPreview(result.data)
    } else {
      setPreviewError(result.error ?? 'Failed to load preview.')
      setPreview(null)
    }
  }

  const handleApply = async () => {
    if (!preview || preview.length === 0) return

    // Initialise every card as "queued"
    const initial: CardState[] = preview.map((card) => ({
      card,
      status: 'queued',
      showError: false
    }))
    setCardStates(initial)
    setPreview(null)
    setApplying(true)

    for (let i = 0; i < initial.length; i++) {
      // Mark as in-progress
      setCardStates((prev) =>
        prev ? prev.map((cs, idx) => (idx === i ? { ...cs, status: 'in-progress' } : cs)) : prev
      )

      const { cardId, proposedName } = initial[i].card
      const result = await api.tickets.applySingleCard(board.boardId, cardId, proposedName)

      if (result.success) {
        setCardStates((prev) =>
          prev ? prev.map((cs, idx) => (idx === i ? { ...cs, status: 'success' } : cs)) : prev
        )
      } else {
        setCardStates((prev) =>
          prev
            ? prev.map((cs, idx) =>
                idx === i ? { ...cs, status: 'error', error: result.error } : cs
              )
            : prev
        )
      }

      // Respect Trello's rate limit between calls
      if (i < initial.length - 1) {
        await sleep(200)
      }
    }

    setApplying(false)
    await loadConfig()
  }

  const toggleErrorDetail = (idx: number) => {
    setCardStates((prev) =>
      prev ? prev.map((cs, i) => (i === idx ? { ...cs, showError: !cs.showError } : cs)) : prev
    )
  }

  // Derived counts for the summary line shown after/during apply
  const successCount = cardStates?.filter((cs) => cs.status === 'success').length ?? 0
  const errorCount = cardStates?.filter((cs) => cs.status === 'error').length ?? 0
  const remainingCount =
    cardStates?.filter((cs) => cs.status === 'queued' || cs.status === 'in-progress').length ?? 0

  return (
    <div className={styles.container}>
      {/* ── Title ── */}
      <h1 className={styles.title}>🎫 Ticket Numbering — {board.boardName}</h1>
      <p className={styles.description}>
        Assigns a unique <code>AGI-000001</code>-style prefix to every open card that doesn&apos;t
        already have one. Cards already prefixed are left untouched.
      </p>

      {/* ── Config card ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>Configuration</h2>

        <div className={styles.configGrid}>
          <label className={styles.label}>
            Project Code
            <span className={styles.hint}>Exactly 3 uppercase letters</span>
            <input
              className="input"
              value={projectCode}
              maxLength={3}
              placeholder="AGI"
              onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
            />
          </label>

          <label className={styles.label}>
            Next Ticket Number
            <span className={styles.hint}>Never lower than the current value</span>
            <input
              className="input"
              type="number"
              min={config?.nextTicketNumber ?? 1}
              value={nextTicketNumber}
              onChange={(e) => setNextTicketNumber(Number(e.target.value))}
            />
          </label>
        </div>

        {/* Preview of upcoming prefix */}
        <div className={styles.previewBox}>
          Next card will be prefixed:{' '}
          <span className={styles.code}>
            {projectCode.length === 3
              ? `${projectCode.toUpperCase()}-${String(nextTicketNumber).padStart(6, '0')} `
              : '???-000001 '}
          </span>
        </div>

        {configError && <div className={styles.errorBanner}>{configError}</div>}

        <button className="btn-primary" onClick={handleSaveConfig} disabled={savingConfig}>
          {savingConfig ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>

      {/* ── Status card ── */}
      {config && (
        <div className="card">
          <h2 className={styles.cardTitle}>Status</h2>
          <div className={styles.statusRow}>
            <span
              className={`${styles.statusBadge} ${config.unnumberedCount === 0 ? styles.statusOk : styles.statusWarn}`}
            >
              {config.unnumberedCount === 0
                ? '✅ All open cards are numbered'
                : `⚠️ ${config.unnumberedCount} card${config.unnumberedCount !== 1 ? 's' : ''} need numbering`}
            </span>
          </div>
        </div>
      )}

      {/* ── Preview + Apply card ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>Apply Numbering</h2>

        {previewError && <div className={styles.errorBanner}>{previewError}</div>}

        {/* Progress summary while applying or after completion */}
        {cardStates && (
          <div
            className={`${styles.progressSummary} ${
              !applying && errorCount === 0
                ? styles.summarySuccess
                : !applying && errorCount > 0
                  ? styles.summaryPartial
                  : styles.summaryRunning
            }`}
          >
            {applying ? (
              <>
                <span className={styles.summarySpinner} />
                Applying… {successCount + errorCount} / {cardStates.length} done
                {errorCount > 0 && ` · ${errorCount} failed`}
              </>
            ) : errorCount === 0 ? (
              <>
                ✅ All {successCount} card{successCount !== 1 ? 's' : ''} updated successfully.
              </>
            ) : (
              <>
                ⚠️ {successCount} updated, {errorCount} failed
                {remainingCount > 0 && `, ${remainingCount} skipped`}.
              </>
            )}
          </div>
        )}

        {/* Empty state */}
        {preview && preview.length === 0 && !cardStates && (
          <p className={styles.description}>No unnumbered cards found — nothing to do.</p>
        )}

        {/* Card table — preview mode (before apply) */}
        {preview && preview.length > 0 && !cardStates && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>List</th>
                <th>Current Name</th>
                <th>Proposed Name</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((card) => (
                <tr key={card.cardId}>
                  <td className={styles.cellMuted}>{card.listName}</td>
                  <td>{card.cardName}</td>
                  <td>
                    <span className={styles.proposedName}>{card.proposedName}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Card table — apply mode (while running or after completion) */}
        {cardStates && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.statusCol}>Status</th>
                <th>List</th>
                <th>Current Name</th>
                <th>Proposed Name</th>
              </tr>
            </thead>
            <tbody>
              {cardStates.map((cs, idx) => (
                <>
                  <tr
                    key={cs.card.cardId}
                    className={`${styles.cardRow} ${styles[`row-${cs.status}`]}`}
                  >
                    <td className={styles.statusCell}>
                      {cs.status === 'queued' && (
                        <span className={styles.badgeQueued}>⏳ Queued</span>
                      )}
                      {cs.status === 'in-progress' && (
                        <span className={styles.badgeInProgress}>
                          <span className={styles.spinner} /> Updating…
                        </span>
                      )}
                      {cs.status === 'success' && (
                        <span className={styles.badgeSuccess}>✅ Done</span>
                      )}
                      {cs.status === 'error' && (
                        <span className={styles.badgeError}>
                          ❌ Failed
                          <button
                            className={styles.errorToggle}
                            onClick={() => toggleErrorDetail(idx)}
                          >
                            {cs.showError ? 'Hide' : 'Details'}
                          </button>
                        </span>
                      )}
                    </td>
                    <td className={styles.cellMuted}>{cs.card.listName}</td>
                    <td>{cs.card.cardName}</td>
                    <td>
                      <span className={styles.proposedName}>{cs.card.proposedName}</span>
                    </td>
                  </tr>
                  {cs.status === 'error' && cs.showError && cs.error && (
                    <tr key={`${cs.card.cardId}-err`} className={styles.errorDetailRow}>
                      <td colSpan={4}>
                        <span className={styles.errorDetail}>{cs.error}</span>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}

        <div className={styles.actions}>
          <button
            className="btn-secondary"
            onClick={handlePreview}
            disabled={loadingPreview || applying}
          >
            {loadingPreview ? 'Loading…' : '🔍 Preview'}
          </button>
          {preview && preview.length > 0 && !cardStates && (
            <button className="btn-primary" onClick={handleApply} disabled={applying}>
              ▶ Apply to {preview.length} card{preview.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
