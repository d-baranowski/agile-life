import React, { useState } from 'react'
import type { BoardConfig } from '@shared/types'
import { api } from '../hooks/useApi'
import styles from './SettingsPage.module.css'

interface Props {
  board: BoardConfig
  onBoardUpdated: (board: BoardConfig) => void
  onBoardDeleted: (boardId: string) => void
}

export default function SettingsPage({ board, onBoardUpdated, onBoardDeleted }: Props): JSX.Element {
  const [boardName, setBoardName] = useState(board.boardName)
  const [doneListNames, setDoneListNames] = useState(board.doneListNames.join(', '))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    const parsedDoneNames = doneListNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const result = await api.boards.update(board.boardId, {
      boardName: boardName.trim(),
      doneListNames: parsedDoneNames.length > 0 ? parsedDoneNames : ['Done']
    })

    setSaving(false)

    if (result.success && result.data) {
      onBoardUpdated(result.data)
      setSuccess('Settings saved.')
      setTimeout(() => setSuccess(null), 3000)
    } else {
      setError(result.error ?? 'Failed to save settings.')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await api.boards.delete(board.boardId)
    if (result.success) {
      onBoardDeleted(board.boardId)
    } else {
      setError(result.error ?? 'Failed to delete board.')
      setDeleting(false)
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>⚙️ Settings — {board.boardName}</h1>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {success && <div className={styles.successBanner}>{success}</div>}

      {/* ── General Settings ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>General</h2>
        <div className={styles.form}>
          <label className={styles.label}>
            Board Display Name
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
            />
          </label>
          <label className={styles.label}>
            "Done" List Names{' '}
            <span className={styles.hint}>(comma-separated)</span>
            <input
              type="text"
              value={doneListNames}
              onChange={(e) => setDoneListNames(e.target.value)}
              placeholder="Done, Shipped, Closed"
            />
          </label>
        </div>
        <div className={styles.actions}>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '✓ Save Settings'}
          </button>
        </div>
      </div>

      {/* ── Board Info ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>Board Info</h2>
        <table>
          <tbody>
            <tr>
              <th style={{ width: 160 }}>Board ID</th>
              <td>
                <code>{board.boardId}</code>
              </td>
            </tr>
            <tr>
              <th>Project Code</th>
              <td>
                <code>{board.projectCode || '(not set)'}</code>
              </td>
            </tr>
            <tr>
              <th>Next Ticket #</th>
              <td>
                <code>{String(board.nextTicketNumber).padStart(6, '0')}</code>
              </td>
            </tr>
            <tr>
              <th>Registered</th>
              <td>{new Date(board.createdAt).toLocaleDateString()}</td>
            </tr>
            <tr>
              <th>Trello URL</th>
              <td>
                <a
                  href={`https://trello.com/b/${board.boardId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open on Trello ↗
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Danger Zone ── */}
      <div className={`card ${styles.dangerCard}`}>
        <h2 className={styles.cardTitle} style={{ color: 'var(--color-danger)' }}>
          Danger Zone
        </h2>
        <p className={styles.hint}>
          Removing this board will delete all locally cached data (lists, cards, analytics). Your
          Trello board will <strong>not</strong> be modified.
        </p>
        {confirmDelete ? (
          <div className={styles.confirmDelete}>
            <p>
              Are you sure you want to remove <strong>{board.boardName}</strong>?
            </p>
            <div className={styles.actions}>
              <button
                className="btn-ghost"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Removing…' : 'Yes, remove board'}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
            Remove Board
          </button>
        )}
      </div>
    </div>
  )
}
