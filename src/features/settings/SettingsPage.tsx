import { useState, useEffect } from 'react'
import type { BoardConfig } from '../../lib/board.types'
import type { TrelloMember } from '../../trello/trello.types'
import type { DbPathInfo, LogPathInfo } from './settings.types'
import { api } from '../api/useApi'
import {
  isSoundEnabled,
  setSoundEnabled,
  getSoundVolume,
  setSoundVolume
} from '../kanban/confetti/sound'
import ArchiveDoneCards from './ArchiveDoneCards'
import StoryPointsEditor from './StoryPointsEditor'
import { Container, Title, CardTitle, ErrorBanner, SuccessBanner } from './settings-layout.styled'
import { Form, Label, Hint, Actions } from './settings-form.styled'
import { DangerCard, DangerTitle, ConfirmDelete } from './settings-danger.styled'
import { InfoTable } from './settings-table.styled'

interface Props {
  board: BoardConfig
  allBoards: BoardConfig[]
  onBoardUpdated: (board: BoardConfig) => void
  onBoardDeleted: (boardId: string) => void
}

export default function SettingsPage(props: Props): JSX.Element {
  const { board, allBoards, onBoardUpdated, onBoardDeleted } = props
  const [boardName, setBoardName] = useState(board.boardName)
  const [doneListNames, setDoneListNames] = useState(board.doneListNames.join(', '))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  // Sound preference (stored in localStorage)
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled)
  const [soundVolume, setSoundVolumeState] = useState(getSoundVolume)

  function handleToggleSound(enabled: boolean): void {
    setSoundEnabled(enabled)
    setSoundEnabledState(enabled)
  }

  function handleVolumeChange(volume: number): void {
    setSoundVolume(volume)
    setSoundVolumeState(volume)
  }

  const doneListLabel = (board.doneListNames ?? ['Done']).join(', ')

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
    <Container>
      <Title>⚙️ Settings — {board.boardName}</Title>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {success && <SuccessBanner>{success}</SuccessBanner>}

      {/* ── General Settings ── */}
      <div className="card">
        <CardTitle>General</CardTitle>
        <Form>
          <Label>
            Board Display Name
            <input type="text" value={boardName} onChange={(e) => setBoardName(e.target.value)} />
          </Label>
          <Label>
            &quot;Done&quot; List Names <Hint>(comma-separated)</Hint>
            <input
              type="text"
              value={doneListNames}
              onChange={(e) => setDoneListNames(e.target.value)}
              placeholder="Done, Shipped, Closed"
            />
          </Label>
        </Form>
        <Actions>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '✓ Save Settings'}
          </button>
        </Actions>
      </div>

      {/* ── Epic Board ── */}
      <div className="card">
        <CardTitle>Epic Board</CardTitle>
        <Hint as="p">
          Link another board as the <strong>Epic Board</strong> for this board. Cards from the epic
          board can then be assigned as epics for cards on this board. On the epic board,
          double-click any card to see all stories assigned to it.
        </Hint>
        {epicBoardError && <ErrorBanner>{epicBoardError}</ErrorBanner>}
        <Form>
          <Label>
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
          </Label>
        </Form>
        {board.epicBoardId && (
          <Hint as="p">
            ✓ Epics are sourced from{' '}
            <strong>
              {allBoards.find((b) => b.boardId === board.epicBoardId)?.boardName ??
                board.epicBoardId}
            </strong>
            .
          </Hint>
        )}
      </div>

      {/* ── My Identity ── */}
      <div className="card">
        <CardTitle>My Identity</CardTitle>
        <Hint as="p">
          Select which board member is <strong>you</strong>. When set, the Kanban board will show
          your weekly story-point progress in the top bar.
        </Hint>
        {myMemberError && <ErrorBanner>{myMemberError}</ErrorBanner>}
        <Form>
          <Label>
            My Member
            {boardMembers.length === 0 ? (
              <Hint as="p">
                No members found. Sync the board first to populate the member list.
              </Hint>
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
          </Label>
        </Form>
        {board.myMemberId && (
          <Hint as="p">
            ✓ Tracking gamification stats for{' '}
            <strong>
              {boardMembers.find((m) => m.id === board.myMemberId)?.fullName ?? board.myMemberId}
            </strong>
            .
          </Hint>
        )}
      </div>

      <StoryPointsEditor board={board} onBoardUpdated={onBoardUpdated} />

      {/* ── Board Info ── */}
      <div className="card">
        <CardTitle>Board Info</CardTitle>
        <InfoTable>
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
        </InfoTable>
      </div>

      <ArchiveDoneCards
        boardId={board.boardId}
        doneListLabel={doneListLabel}
        doneListCount={board.doneListNames.length}
      />

      {/* ── Sound & Notifications ── */}
      <div className="card">
        <CardTitle>Sound &amp; Notifications</CardTitle>
        <Form>
          <Label $row>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => handleToggleSound(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            Play coin sound when a card is moved to a done column
          </Label>
          <Label style={{ marginTop: 8 }}>
            Volume
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 14 }}>🔇</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={soundVolume}
                disabled={!soundEnabled}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 14 }}>🔊</span>
              <span style={{ fontSize: 12, width: 34, textAlign: 'right' }}>
                {Math.round(soundVolume * 100)}%
              </span>
            </div>
          </Label>
          <Hint>
            An 8-bit Mario-inspired sound plays each time you complete a task. Disable it here if
            you prefer a quieter experience.
          </Hint>
        </Form>
      </div>

      {/* ── Database ── */}
      <div className="card">
        <CardTitle>Database</CardTitle>
        {dbPathError && <ErrorBanner>{dbPathError}</ErrorBanner>}
        {dbPathChanged && (
          <SuccessBanner>
            Database location updated. Restart the app for the change to take effect.
          </SuccessBanner>
        )}
        <Form>
          <Label>
            Database File Location
            <Hint>
              The SQLite file where all board data is stored locally.
              {dbPathInfo?.isCustom ? ' (custom)' : ' (default)'}
            </Hint>
            <input
              type="text"
              readOnly
              value={dbPathInfo?.currentPath ?? '…'}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </Label>
        </Form>
        <Actions>
          {dbPathInfo?.isCustom && (
            <button className="btn-ghost" onClick={handleResetDbPath} disabled={dbPathChanging}>
              Restore Default
            </button>
          )}
          <button className="btn-primary" onClick={handleChooseDbPath} disabled={dbPathChanging}>
            {dbPathChanging ? 'Choosing…' : '📂 Choose Location'}
          </button>
        </Actions>
      </div>

      {/* ── Logs ── */}
      <div className="card">
        <CardTitle>Logs</CardTitle>
        {logPathError && <ErrorBanner>{logPathError}</ErrorBanner>}
        <Form>
          <Label>
            Log File Location
            <Hint>
              Structured application logs written by electron-log.
              {logPathInfo?.isCustom ? ' (custom)' : ' (default)'}
            </Hint>
            <input
              type="text"
              readOnly
              value={logPathInfo?.currentPath ?? '…'}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </Label>
        </Form>
        <Actions>
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
        </Actions>
      </div>

      {/* ── Danger Zone ── */}
      <DangerCard className="card">
        <DangerTitle>Danger Zone</DangerTitle>
        <Hint as="p">
          Removing this board will delete all locally cached data (lists, cards, analytics). Your
          Trello board will <strong>not</strong> be modified.
        </Hint>
        {confirmDelete ? (
          <ConfirmDelete>
            <p>
              Are you sure you want to remove <strong>{board.boardName}</strong>?
            </p>
            <Actions>
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
            </Actions>
          </ConfirmDelete>
        ) : (
          <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
            Remove Board
          </button>
        )}
      </DangerCard>
    </Container>
  )
}
