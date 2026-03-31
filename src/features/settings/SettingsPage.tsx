import { useEffect } from 'react'
import type { BoardConfig } from '../../lib/board.types'
import {
  isSoundEnabled,
  setSoundEnabled as persistSoundEnabled,
  getSoundVolume,
  setSoundVolume as persistSoundVolume
} from '../kanban/confetti/sound'
import { api } from '../api/useApi'
import ArchiveDoneCards from './ArchiveDoneCards'
import StoryPointsEditor from './StoryPointsEditor'
import { Container, Title, CardTitle, ErrorBanner, SuccessBanner } from './settings-layout.styled'
import { Form, Label, Hint, Actions } from './settings-form.styled'
import { DangerCard, DangerTitle, ConfirmDelete } from './settings-danger.styled'
import { InfoTable } from './settings-table.styled'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchSettingsData,
  chooseDbPath,
  chooseLogPath,
  settingsInitialised,
  boardNameChanged,
  doneListNamesChanged,
  savingStarted,
  savingFinished,
  deletingStarted,
  deletingFinished,
  confirmDeleteToggled,
  epicBoardSavingStarted,
  epicBoardSavingFinished,
  myMemberSavingStarted,
  myMemberSavingFinished,
  soundEnabledChanged,
  soundVolumeChanged
} from './settingsSlice'
import { updateBoard, deleteBoard, setEpicBoard, setMyMember } from '../board-switcher/boardsSlice'

interface Props {
  board: BoardConfig
  allBoards: BoardConfig[]
}

export default function SettingsPage(props: Props): JSX.Element {
  const { board, allBoards } = props
  const dispatch = useAppDispatch()

  // ── Redux state ──────────────────────────────────────────────────────────
  const boardName = useAppSelector((s) => s.settings.boardName)
  const doneListNames = useAppSelector((s) => s.settings.doneListNames)
  const saving = useAppSelector((s) => s.settings.saving)
  const deleting = useAppSelector((s) => s.settings.deleting)
  const confirmDelete = useAppSelector((s) => s.settings.confirmDelete)
  const error = useAppSelector((s) => s.settings.error)
  const success = useAppSelector((s) => s.settings.success)

  const dbPathInfo = useAppSelector((s) => s.settings.dbPathInfo)
  const dbPathChanging = useAppSelector((s) => s.settings.dbPathChanging)
  const dbPathError = useAppSelector((s) => s.settings.dbPathError)
  const dbPathChanged = useAppSelector((s) => s.settings.dbPathChanged)

  const logPathInfo = useAppSelector((s) => s.settings.logPathInfo)
  const logPathChanging = useAppSelector((s) => s.settings.logPathChanging)
  const logPathError = useAppSelector((s) => s.settings.logPathError)

  const epicBoardSaving = useAppSelector((s) => s.settings.epicBoardSaving)
  const epicBoardError = useAppSelector((s) => s.settings.epicBoardError)

  const boardMembers = useAppSelector((s) => s.settings.boardMembers)
  const myMemberSaving = useAppSelector((s) => s.settings.myMemberSaving)
  const myMemberError = useAppSelector((s) => s.settings.myMemberError)

  const soundEnabled = useAppSelector((s) => s.settings.soundEnabled)
  const soundVolume = useAppSelector((s) => s.settings.soundVolume)

  // ── Initialise form values on mount / board change ───────────────────────
  useEffect(() => {
    dispatch(
      settingsInitialised({
        boardName: board.boardName,
        doneListNames: board.doneListNames.join(', '),
        soundEnabled: isSoundEnabled(),
        soundVolume: getSoundVolume(),
        storyPointsRules: board.storyPointsConfig
      })
    )
    dispatch(fetchSettingsData(board.boardId))
  }, [dispatch, board.boardId])

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleToggleSound(enabled: boolean): void {
    persistSoundEnabled(enabled)
    dispatch(soundEnabledChanged(enabled))
  }

  function handleVolumeChange(volume: number): void {
    persistSoundVolume(volume)
    dispatch(soundVolumeChanged(volume))
  }

  const doneListLabel = (board.doneListNames ?? ['Done']).join(', ')

  const handleSetEpicBoard = async (epicBoardId: string | null): Promise<void> => {
    dispatch(epicBoardSavingStarted())
    try {
      await dispatch(setEpicBoard({ storyBoardId: board.boardId, epicBoardId })).unwrap()
      dispatch(epicBoardSavingFinished(null))
    } catch (err) {
      dispatch(epicBoardSavingFinished((err as Error).message))
    }
  }

  const handleSetMyMember = async (myMemberId: string | null): Promise<void> => {
    dispatch(myMemberSavingStarted())
    try {
      await dispatch(setMyMember({ boardId: board.boardId, myMemberId })).unwrap()
      dispatch(myMemberSavingFinished(null))
    } catch (err) {
      dispatch(myMemberSavingFinished((err as Error).message))
    }
  }

  const handleSave = async () => {
    dispatch(savingStarted())

    const parsedDoneNames = doneListNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      await dispatch(
        updateBoard({
          boardId: board.boardId,
          updates: {
            boardName: boardName.trim(),
            doneListNames: parsedDoneNames.length > 0 ? parsedDoneNames : ['Done']
          }
        })
      ).unwrap()
      dispatch(savingFinished({ success: 'Settings saved.' }))
      setTimeout(() => dispatch(savingFinished({ success: undefined })), 3000)
    } catch (err) {
      dispatch(savingFinished({ error: (err as Error).message }))
    }
  }

  const handleDelete = async () => {
    dispatch(deletingStarted())
    try {
      await dispatch(deleteBoard(board.boardId)).unwrap()
    } catch (err) {
      dispatch(savingFinished({ error: (err as Error).message }))
      dispatch(deletingFinished())
    }
  }

  const handleChooseDbPath = async () => {
    await dispatch(chooseDbPath(false))
  }

  const handleResetDbPath = async () => {
    await dispatch(chooseDbPath(true))
  }

  const handleChooseLogPath = async () => {
    await dispatch(chooseLogPath(false))
  }

  const handleResetLogPath = async () => {
    await dispatch(chooseLogPath(true))
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
            <input
              type="text"
              value={boardName}
              onChange={(e) => dispatch(boardNameChanged(e.target.value))}
            />
          </Label>
          <Label>
            &quot;Done&quot; List Names <Hint>(comma-separated)</Hint>
            <input
              type="text"
              value={doneListNames}
              onChange={(e) => dispatch(doneListNamesChanged(e.target.value))}
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

      <StoryPointsEditor />

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
                onClick={() => dispatch(confirmDeleteToggled(false))}
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
          <button className="btn-danger" onClick={() => dispatch(confirmDeleteToggled(true))}>
            Remove Board
          </button>
        )}
      </DangerCard>
    </Container>
  )
}
