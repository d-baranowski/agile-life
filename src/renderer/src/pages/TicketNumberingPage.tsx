import React, { useState, useEffect, useCallback } from 'react'
import type { BoardConfig } from '@shared/types'
import type { TicketNumberingConfig, UnnumberedCard } from '../hooks/useApi'
import { api } from '../hooks/useApi'
import styles from './TicketNumberingPage.module.css'

interface Props {
  board: BoardConfig
}

export default function TicketNumberingPage({ board }: Props): JSX.Element {
  const [config, setConfig] = useState<TicketNumberingConfig | null>(null)
  const [preview, setPreview] = useState<UnnumberedCard[]>([])
  const [editProjectCode, setEditProjectCode] = useState('')
  const [editNextNum, setEditNextNum] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [applying, setApplying] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [applyResult, setApplyResult] = useState<{ updated: number; failed: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const result = await api.tickets.getConfig(board.boardId)
    if (result.success && result.data) {
      setConfig(result.data)
      setEditProjectCode(result.data.projectCode)
      setEditNextNum(result.data.nextTicketNumber)
    } else {
      setError(result.error ?? 'Failed to load config.')
    }
    setLoading(false)
  }, [board.boardId])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleLoadPreview = async () => {
    setError(null)
    const result = await api.tickets.previewUnnumbered(board.boardId)
    if (result.success && result.data) {
      setPreview(result.data)
      setShowPreview(true)
    } else {
      setError(result.error ?? 'Failed to load preview.')
    }
  }

  const handleApply = async () => {
    setApplying(true)
    setError(null)
    setApplyResult(null)
    const result = await api.tickets.applyNumbering(board.boardId)
    if (result.success && result.data) {
      setApplyResult(result.data)
      setShowPreview(false)
      await loadConfig()
    } else {
      setError(result.error ?? 'Apply failed.')
    }
    setApplying(false)
  }

  const handleSaveConfig = async () => {
    if (editProjectCode && !/^[A-Z]{3}$/.test(editProjectCode)) {
      setError('Project code must be exactly 3 uppercase letters.')
      return
    }
    setSavingConfig(true)
    setError(null)
    const result = await api.tickets.updateConfig(board.boardId, {
      projectCode: editProjectCode.toUpperCase(),
      nextTicketNumber: editNextNum
    })
    if (result.success) {
      await loadConfig()
    } else {
      setError(result.error ?? 'Failed to save configuration.')
    }
    setSavingConfig(false)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner" /> Loading…
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🎫 Ticket Numbering — {board.boardName}</h1>

      <p className={styles.description}>
        Assign JIRA-style ticket numbers (<code>ABC-000001</code>) to Trello cards that don't yet
        follow the convention. Numbers are assigned in order of last activity (oldest first) and
        persisted back to Trello.
      </p>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* ── Config Card ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>Numbering Configuration</h2>
        <div className={styles.configGrid}>
          <label className={styles.label}>
            Project Code <span className={styles.hint}>(3 uppercase letters)</span>
            <input
              type="text"
              maxLength={3}
              placeholder="AGI"
              value={editProjectCode}
              onChange={(e) => setEditProjectCode(e.target.value.toUpperCase())}
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
            />
          </label>
          <label className={styles.label}>
            Next Ticket Number
            <input
              type="number"
              min={1}
              max={999999}
              value={editNextNum}
              onChange={(e) => setEditNextNum(Number(e.target.value))}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </label>
        </div>
        <div className={styles.previewBox}>
          Next card will be named:{' '}
          <code className={styles.code}>
            {editProjectCode || '???'}-{String(editNextNum).padStart(6, '0')}{' '}
            <span className="text-muted">Your Card Title</span>
          </code>
        </div>
        <button className="btn-primary" onClick={handleSaveConfig} disabled={savingConfig}>
          {savingConfig ? 'Saving…' : '✓ Save Configuration'}
        </button>
      </div>

      {/* ── Status ── */}
      {config && (
        <div className={styles.statusRow}>
          <div className={`${styles.statusBadge} ${config.unnumberedCount > 0 ? styles.statusWarn : styles.statusOk}`}>
            {config.unnumberedCount > 0
              ? `⚠ ${config.unnumberedCount} card${config.unnumberedCount !== 1 ? 's' : ''} missing ticket numbers`
              : '✓ All cards have ticket numbers'}
          </div>
        </div>
      )}

      {/* ── Apply Result ── */}
      {applyResult && (
        <div className={styles.applyResult}>
          <strong>✓ Done:</strong> {applyResult.updated} card{applyResult.updated !== 1 ? 's' : ''} renamed.
          {applyResult.failed > 0 && (
            <>
              {' '}
              <strong className="text-danger">{applyResult.failed} failed.</strong>
              <ul>
                {applyResult.errors.map((e, i) => (
                  <li key={i} className="text-sm">
                    {e}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ── Preview & Apply Buttons ── */}
      <div className={styles.actions}>
        <button className="btn-secondary" onClick={handleLoadPreview}>
          🔍 Preview Unnumbered Cards
        </button>
        {config && config.unnumberedCount > 0 && (
          <button className="btn-primary" onClick={handleApply} disabled={applying}>
            {applying ? 'Applying…' : `⚡ Apply to ${config.unnumberedCount} Card${config.unnumberedCount !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* ── Preview Table ── */}
      {showPreview && (
        <div className="card">
          <h2 className={styles.cardTitle}>Preview: Proposed Renames</h2>
          {preview.length === 0 ? (
            <p className="text-muted">No cards require renaming.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Current Name</th>
                  <th>Column</th>
                  <th>Proposed Name</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((card) => (
                  <tr key={card.cardId}>
                    <td className="text-muted">{card.cardName}</td>
                    <td className="text-muted">{card.listName}</td>
                    <td>
                      <code className={styles.proposedName}>{card.proposedName}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
