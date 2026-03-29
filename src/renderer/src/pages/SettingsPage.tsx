import { useState, useEffect } from 'react'
import type {
  BoardConfig,
  ArchiveResult,
  DoneCardPreview,
  DoneCardDebugInfo,
  StoryPointRule
} from '@shared/board.types'
import type { TrelloMember } from '@shared/trello.types'
import type { DbPathInfo, LogPathInfo } from '@shared/settings.types'
import { api } from '../hooks/useApi'
import styles from './SettingsPage.module.css'

interface Props {
  board: BoardConfig
  allBoards: BoardConfig[]
  onBoardUpdated: (board: BoardConfig) => void
  onBoardDeleted: (boardId: string) => void
}

export default function SettingsPage({
  board,
  allBoards,
  onBoardUpdated,
  onBoardDeleted
}: Props): JSX.Element {
  const [boardName, setBoardName] = useState(board.boardName)
  const [doneListNames, setDoneListNames] = useState(board.doneListNames.join(', '))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Story points configuration
  const [storyPoints, setStoryPoints] = useState<StoryPointRule[]>(board.storyPointsConfig)
  const [spSaving, setSpSaving] = useState(false)
  const [spSuccess, setSpSuccess] = useState<string | null>(null)
  const [spError, setSpError] = useState<string | null>(null)

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

  // Reset preview when weeks threshold changes
  useEffect(() => {
    setPreviewCards(null)
    setPreviewError(null)
    setArchiveResult(null)
    setArchiveError(null)
  }, [archiveWeeks])

  const [dbPathInfo, setDbPathInfo] = useState<DbPathInfo | null>(null)
  const [dbPathChanging, setDbPathChanging] = useState(false)
  const [dbPathError, setDbPathError] = useState<string | null>(null)
  const [dbPathChanged, setDbPathChanged] = useState(false)

  const [logPathInfo, setLogPathInfo] = useState<LogPathInfo | null>(null)
  const [logPathChanging, setLogPathChanging] = useState(false)
  const [logPathError, setLogPathError] = useState<string | null>(null)

  useEffect(() => {
    api.settings.getDbPath().then((result) => {
      if (result.success && result.data) setDbPathInfo(result.data)
    })
    api.logs.getPath().then((result) => {
      if (result.success && result.data) setLogPathInfo(result.data)
    })
    api.trello.getBoardMembers(board.boardId).then((result) => {
      if (result.success && result.data) setBoardMembers(result.data)
    })
  }, [])

  const [epicBoardSaving, setEpicBoardSaving] = useState(false)
  const [epicBoardError, setEpicBoardError] = useState<string | null>(null)

  const [boardMembers, setBoardMembers] = useState<TrelloMember[]>([])
  const [myMemberSaving, setMyMemberSaving] = useState(false)
  const [myMemberError, setMyMemberError] = useState<string | null>(null)

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

  const handleSetEpicBoard = async (epicBoardId: string | null): Promise<void> => {
    setEpicBoardSaving(true)
    setEpicBoardError(null)
    const result = await api.boards.setEpicBoard(board.boardId, epicBoardId)
    setEpicBoardSaving(false)
    if (result.success && result.data) {
      onBoardUpdated(result.data)
    } else {
      setEpicBoardError(result.error ?? 'Failed to update epic board.')
    }
  }

  const handleSetMyMember = async (myMemberId: string | null): Promise<void> => {
    setMyMemberSaving(true)
    setMyMemberError(null)
    const result = await api.boards.setMyMember(board.boardId, myMemberId)
    setMyMemberSaving(false)
    if (result.success && result.data) {
      onBoardUpdated(result.data)
    } else {
      setMyMemberError(result.error ?? 'Failed to update identity.')
    }
  }

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

  const handleSaveStoryPoints = async () => {
    setSpSaving(true)
    setSpError(null)
    setSpSuccess(null)

    const validRules = storyPoints
      .filter((r) => r.labelName.trim() !== '')
      .map((r) => ({ labelName: r.labelName.trim(), points: r.points }))

    const result = await api.boards.update(board.boardId, { storyPointsConfig: validRules })

    setSpSaving(false)

    if (result.success && result.data) {
      onBoardUpdated(result.data)
      setStoryPoints(result.data.storyPointsConfig)
      setSpSuccess('Story point rules saved.')
      setTimeout(() => setSpSuccess(null), 3000)
    } else {
      setSpError(result.error ?? 'Failed to save story point rules.')
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

  const handleChooseDbPath = async () => {
    setDbPathChanging(true)
    setDbPathError(null)
    const result = await api.settings.setDbPath(false)
    setDbPathChanging(false)
    if (result.success && result.data) {
      setDbPathInfo(result.data)
      if (result.data.isCustom) setDbPathChanged(true)
    } else {
      setDbPathError(result.error ?? 'Failed to change database location.')
    }
  }

  const handleResetDbPath = async () => {
    setDbPathChanging(true)
    setDbPathError(null)
    const result = await api.settings.setDbPath(true)
    setDbPathChanging(false)
    if (result.success && result.data) {
      setDbPathInfo(result.data)
      setDbPathChanged(true)
    } else {
      setDbPathError(result.error ?? 'Failed to reset database location.')
    }
  }

  const handleChooseLogPath = async () => {
    setLogPathChanging(true)
    setLogPathError(null)
    const result = await api.logs.setPath(false)
    setLogPathChanging(false)
    if (result.success && result.data) {
      setLogPathInfo(result.data)
    } else {
      setLogPathError(result.error ?? 'Failed to change log location.')
    }
  }

  const handleResetLogPath = async () => {
    setLogPathChanging(true)
    setLogPathError(null)
    const result = await api.logs.setPath(true)
    setLogPathChanging(false)
    if (result.success && result.data) {
      setLogPathInfo(result.data)
    } else {
      setLogPathError(result.error ?? 'Failed to reset log location.')
    }
  }

  const handleOpenLogFolder = async () => {
    await api.logs.openFolder()
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
            <input type="text" value={boardName} onChange={(e) => setBoardName(e.target.value)} />
          </label>
          <label className={styles.label}>
            &quot;Done&quot; List Names <span className={styles.hint}>(comma-separated)</span>
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

      {/* ── Epic Board ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>Epic Board</h2>
        <p className={styles.hint}>
          Link another board as the <strong>Epic Board</strong> for this board. Cards from the epic
          board can then be assigned as epics for cards on this board. On the epic board,
          double-click any card to see all stories assigned to it.
        </p>
        {epicBoardError && <div className={styles.errorBanner}>{epicBoardError}</div>}
        <div className={styles.form}>
          <label className={styles.label}>
            Epic Board
            <select
              value={board.epicBoardId ?? ''}
              onChange={(e) => handleSetEpicBoard(e.target.value || null)}
              disabled={epicBoardSaving}
            >
              <option value="">— None —</option>
              {allBoards
                .filter((b) => b.boardId !== board.boardId)
                .map((b) => (
                  <option key={b.boardId} value={b.boardId}>
                    {b.boardName}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {board.epicBoardId && (
          <p className={styles.hint}>
            ✓ Epics are sourced from{' '}
            <strong>
              {allBoards.find((b) => b.boardId === board.epicBoardId)?.boardName ??
                board.epicBoardId}
            </strong>
            .
          </p>
        )}
      </div>

      {/* ── My Identity ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>My Identity</h2>
        <p className={styles.hint}>
          Select which board member is <strong>you</strong>. When set, the Kanban board will show
          your weekly story-point progress in the top bar.
        </p>
        {myMemberError && <div className={styles.errorBanner}>{myMemberError}</div>}
        <div className={styles.form}>
          <label className={styles.label}>
            My Member
            {boardMembers.length === 0 ? (
              <p className={styles.hint}>
                No members found. Sync the board first to populate the member list.
              </p>
            ) : (
              <select
                value={board.myMemberId ?? ''}
                onChange={(e) => handleSetMyMember(e.target.value || null)}
                disabled={myMemberSaving}
              >
                <option value="">— None —</option>
                {boardMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} (@{m.username})
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
        {board.myMemberId && (
          <p className={styles.hint}>
            ✓ Tracking gamification stats for{' '}
            <strong>
              {boardMembers.find((m) => m.id === board.myMemberId)?.fullName ?? board.myMemberId}
            </strong>
            .
          </p>
        )}
      </div>

      {/* ── Story Points ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>Story Points</h2>
        <p className={styles.hint}>
          Assign story-point values to ticket labels. The analytics trend chart multiplies each
          completed ticket by the points of its first matching label. Tickets with no matching label
          count as <strong>1</strong> point.
        </p>

        {spError && <div className={styles.errorBanner}>{spError}</div>}
        {spSuccess && <div className={styles.successBanner}>{spSuccess}</div>}

        <table className={styles.spTable}>
          <thead>
            <tr>
              <th>Label Name</th>
              <th>Points</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {storyPoints.map((rule, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    value={rule.labelName}
                    placeholder="e.g. Large"
                    onChange={(e) => {
                      const next = [...storyPoints]
                      next[idx] = { ...next[idx], labelName: e.target.value }
                      setStoryPoints(next)
                    }}
                    className={styles.spInput}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    value={rule.points}
                    onChange={(e) => {
                      const next = [...storyPoints]
                      next[idx] = {
                        ...next[idx],
                        points: Math.max(0, parseInt(e.target.value, 10) || 0)
                      }
                      setStoryPoints(next)
                    }}
                    className={styles.spPointsInput}
                  />
                </td>
                <td>
                  <button
                    className="btn-ghost"
                    onClick={() => setStoryPoints(storyPoints.filter((_, i) => i !== idx))}
                    title="Remove rule"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.spActions}>
          <button
            className="btn-ghost"
            onClick={() => setStoryPoints([...storyPoints, { labelName: '', points: 1 }])}
          >
            + Add Rule
          </button>
          <button className="btn-primary" onClick={handleSaveStoryPoints} disabled={spSaving}>
            {spSaving ? 'Saving…' : '✓ Save Story Points'}
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
                <a href={`https://trello.com/b/${board.boardId}`} target="_blank" rel="noreferrer">
                  Open on Trello ↗
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Archive Done Cards ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>Archive Done Cards</h2>
        <p className={styles.hint}>
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

      {/* ── Database ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>Database</h2>
        {dbPathError && <div className={styles.errorBanner}>{dbPathError}</div>}
        {dbPathChanged && (
          <div className={styles.successBanner}>
            Database location updated. Restart the app for the change to take effect.
          </div>
        )}
        <div className={styles.form}>
          <label className={styles.label}>
            Database File Location
            <span className={styles.hint}>
              The SQLite file where all board data is stored locally.
              {dbPathInfo?.isCustom ? ' (custom)' : ' (default)'}
            </span>
            <input
              type="text"
              readOnly
              value={dbPathInfo?.currentPath ?? '…'}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </label>
        </div>
        <div className={styles.actions}>
          {dbPathInfo?.isCustom && (
            <button className="btn-ghost" onClick={handleResetDbPath} disabled={dbPathChanging}>
              Restore Default
            </button>
          )}
          <button className="btn-primary" onClick={handleChooseDbPath} disabled={dbPathChanging}>
            {dbPathChanging ? 'Choosing…' : '📂 Choose Location'}
          </button>
        </div>
      </div>

      {/* ── Logs ── */}
      <div className="card">
        <h2 className={styles.cardTitle}>Logs</h2>
        {logPathError && <div className={styles.errorBanner}>{logPathError}</div>}
        <div className={styles.form}>
          <label className={styles.label}>
            Log File Location
            <span className={styles.hint}>
              Structured application logs written by electron-log.
              {logPathInfo?.isCustom ? ' (custom)' : ' (default)'}
            </span>
            <input
              type="text"
              readOnly
              value={logPathInfo?.currentPath ?? '…'}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </label>
        </div>
        <div className={styles.actions}>
          {logPathInfo?.isCustom && (
            <button className="btn-ghost" onClick={handleResetLogPath} disabled={logPathChanging}>
              Restore Default
            </button>
          )}
          <button className="btn-ghost" onClick={handleOpenLogFolder}>
            📂 Open Log Folder
          </button>
          <button className="btn-primary" onClick={handleChooseLogPath} disabled={logPathChanging}>
            {logPathChanging ? 'Choosing…' : '📁 Choose Location'}
          </button>
        </div>
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
