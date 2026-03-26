import { useState } from 'react'
import type { BoardConfig } from '@shared/board.types'
import type { TrelloBoard } from '@shared/trello.types'
import { api } from '../hooks/useApi'
import styles from './BoardRegistration.module.css'

interface Props {
  onBoardAdded: (board: BoardConfig) => void
  onCancel?: () => void
}

type Step = 'credentials' | 'select-board' | 'configure'

export default function BoardRegistration({ onBoardAdded, onCancel }: Props): JSX.Element {
  const [step, setStep] = useState<Step>('credentials')
  const [apiKey, setApiKey] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [boards, setBoards] = useState<TrelloBoard[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [doneListNames, setDoneListNames] = useState('Done')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ── Step 1: Validate credentials & fetch boards ───────────────────────────
  const handleFetchBoards = async () => {
    if (!apiKey.trim() || !apiToken.trim()) {
      setError('API Key and Token are required.')
      return
    }
    setLoading(true)
    setError(null)

    const result = await api.boards.fetchFromTrello(apiKey.trim(), apiToken.trim())
    setLoading(false)

    if (!result.success || !result.data) {
      setError(result.error ?? 'Failed to connect to Trello.')
      return
    }

    setBoards(result.data)
    setStep('select-board')
  }

  // ── Step 2: Select a board ─────────────────────────────────────────────────
  const handleSelectBoard = () => {
    if (!selectedBoardId) {
      setError('Please select a board.')
      return
    }
    setError(null)
    setStep('configure')
  }

  // ── Step 3: Save configuration ─────────────────────────────────────────────
  const handleSave = async () => {
    const chosenBoard = boards.find((b) => b.id === selectedBoardId)
    if (!chosenBoard) {
      setError('Selected board not found.')
      return
    }

    if (projectCode && !/^[A-Z]{3}$/.test(projectCode.toUpperCase())) {
      setError('Project code must be exactly 3 uppercase letters (e.g. AGI).')
      return
    }

    const parsedDoneNames = doneListNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    setLoading(true)
    setError(null)

    const result = await api.boards.add({
      boardId: chosenBoard.id,
      boardName: chosenBoard.name,
      apiKey: apiKey.trim(),
      apiToken: apiToken.trim(),
      projectCode: projectCode.toUpperCase(),
      nextTicketNumber: 1,
      doneListNames: parsedDoneNames.length > 0 ? parsedDoneNames : ['Done']
    })

    setLoading(false)

    if (!result.success || !result.data) {
      setError(result.error ?? 'Failed to save board.')
      return
    }

    onBoardAdded(result.data)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <h2>Register a Trello Board</h2>
          {onCancel && (
            <button className="btn-ghost" onClick={onCancel}>
              ✕ Cancel
            </button>
          )}
        </div>

        {/* ── Step Indicator ── */}
        <div className={styles.steps}>
          {(['credentials', 'select-board', 'configure'] as Step[]).map((s, idx) => (
            <div
              key={s}
              className={`${styles.step} ${step === s ? styles.stepActive : ''} ${
                ['credentials', 'select-board', 'configure'].indexOf(step) > idx
                  ? styles.stepDone
                  : ''
              }`}
            >
              <span className={styles.stepNumber}>{idx + 1}</span>
              <span className={styles.stepLabel}>
                {s === 'credentials' && 'Credentials'}
                {s === 'select-board' && 'Select Board'}
                {s === 'configure' && 'Configure'}
              </span>
            </div>
          ))}
        </div>

        {/* ── Error Banner ── */}
        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* ── Step 1: Credentials ── */}
        {step === 'credentials' && (
          <div className={styles.form}>
            <p className={styles.hint}>
              You can find your API Key and Token at{' '}
              <a href="https://trello.com/app-key" target="_blank" rel="noreferrer">
                trello.com/app-key
              </a>
              .
            </p>
            <label className={styles.label}>
              Trello API Key
              <input
                type="text"
                placeholder="e.g. abcd1234..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className={styles.label}>
              Trello API Token
              <input
                type="password"
                placeholder="e.g. efgh5678..."
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                autoComplete="off"
              />
            </label>
            <div className={styles.actions}>
              <button className="btn-primary" onClick={handleFetchBoards} disabled={loading}>
                {loading ? 'Connecting…' : 'Connect to Trello →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Select Board ── */}
        {step === 'select-board' && (
          <div className={styles.form}>
            <p className={styles.hint}>
              {boards.length} board{boards.length !== 1 ? 's' : ''} found. Select the one you want
              to register.
            </p>
            <div className={styles.boardList}>
              {boards.map((board) => (
                <button
                  key={board.id}
                  className={`${styles.boardOption} ${
                    selectedBoardId === board.id ? styles.boardOptionSelected : ''
                  }`}
                  onClick={() => setSelectedBoardId(board.id)}
                >
                  <span className={styles.boardName}>{board.name}</span>
                  {board.desc && <span className={styles.boardDesc}>{board.desc}</span>}
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <button className="btn-ghost" onClick={() => setStep('credentials')}>
                ← Back
              </button>
              <button
                className="btn-primary"
                onClick={handleSelectBoard}
                disabled={!selectedBoardId}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Configure ── */}
        {step === 'configure' && (
          <div className={styles.form}>
            <p className={styles.hint}>
              Optionally set a project code for JIRA-style ticket numbering.
            </p>
            <label className={styles.label}>
              Project Code{' '}
              <span className={styles.optional}>(optional, 3 uppercase letters, e.g. AGI)</span>
              <input
                type="text"
                placeholder="AGI"
                maxLength={3}
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
              />
            </label>
            <label className={styles.label}>
              &quot;Done&quot; List Names{' '}
              <span className={styles.optional}>(comma-separated, e.g. Done, Shipped)</span>
              <input
                type="text"
                placeholder="Done"
                value={doneListNames}
                onChange={(e) => setDoneListNames(e.target.value)}
              />
            </label>
            <div className={styles.actions}>
              <button className="btn-ghost" onClick={() => setStep('select-board')}>
                ← Back
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving…' : '✓ Save Board'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
