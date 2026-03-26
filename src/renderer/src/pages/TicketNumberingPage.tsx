/**
 * Ticket Numbering page — assigns JIRA-style prefixes (e.g. AGI-000001) to
 * every open Trello card that does not already have one.
 */
import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig } from '@shared/board.types'
import type { TicketNumberingConfig, UnnumberedCard, ApplyNumberingResult } from '@shared/ticket.types'
import { api } from '../hooks/useApi'
import styles from './TicketNumberingPage.module.css'

interface Props {
  board: BoardConfig
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

  const [applyResult, setApplyResult] = useState<ApplyNumberingResult | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

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
    setApplyResult(null)
    setConfigError(null)
    setPreviewError(null)
    setApplyError(null)
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
      setApplyResult(null)
    }
  }

  const handlePreview = async () => {
    setLoadingPreview(true)
    setPreviewError(null)
    setApplyResult(null)
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
    setApplying(true)
    setApplyError(null)
    const result = await api.tickets.applyNumbering(board.boardId)
    setApplying(false)
    if (result.success && result.data) {
      setApplyResult(result.data)
      setPreview(null)
      await loadConfig()
    } else {
      setApplyError(result.error ?? 'Numbering failed.')
    }
  }

  return (
    <div className={styles.container}>
      {/* ── Title ── */}
      <h1 className={styles.title}>🎫 Ticket Numbering — {board.boardName}</h1>
      <p className={styles.description}>
        Assigns a unique <code>AGI-000001</code>-style prefix to every open card that
        doesn&apos;t already have one. Cards already prefixed are left untouched.
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
        {applyError && <div className={styles.errorBanner}>{applyError}</div>}

        {applyResult && (
          <div className={styles.applyResult}>
            ✅ Done — {applyResult.updated} card{applyResult.updated !== 1 ? 's' : ''} updated
            {applyResult.failed > 0 && `, ${applyResult.failed} failed`}.
            {applyResult.errors.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {applyResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {preview && preview.length === 0 && (
          <p className={styles.description}>No unnumbered cards found — nothing to do.</p>
        )}

        {preview && preview.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '6px 8px' }}>List</th>
                <th style={{ padding: '6px 8px' }}>Current Name</th>
                <th style={{ padding: '6px 8px' }}>Proposed Name</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((card) => (
                <tr key={card.cardId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--color-text-muted)' }}>
                    {card.listName}
                  </td>
                  <td style={{ padding: '6px 8px' }}>{card.cardName}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span className={styles.proposedName}>{card.proposedName}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className={styles.actions}>
          <button className="btn-secondary" onClick={handlePreview} disabled={loadingPreview || applying}>
            {loadingPreview ? 'Loading…' : '🔍 Preview'}
          </button>
          {preview && preview.length > 0 && (
            <button className="btn-primary" onClick={handleApply} disabled={applying}>
              {applying ? 'Applying…' : `▶ Apply to ${preview.length} card${preview.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
