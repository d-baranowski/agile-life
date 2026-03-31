import { useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from './store/hooks'
import {
  fetchBoards,
  syncBoard,
  selectSelectedBoard,
  selectSelectedBoardId,
  selectBoardsLoading,
  selectSyncing,
  selectSyncVersion,
  selectSyncError,
  selectBoards,
  syncErrorDismissed
} from './features/board-switcher/boardsSlice'
import {
  tabChanged,
  registrationOpened,
  selectActiveTab,
  selectShowRegistration
} from './store/uiSlice'
import { api } from './features/api/useApi'
import BoardSwitcher from './features/board-switcher/BoardSwitcher'
import BoardRegistration from './features/board-registration/BoardRegistration'
import Toast from './features/toast/Toast'
import Dashboard from './features/dashboard/Dashboard'
import SettingsPage from './features/settings/SettingsPage'
import KanbanPage from './features/kanban/KanbanPage'
import TemplatesPage from './features/templates/TemplatesPage'
import { AppContainer, LoadingScreen, Main, EmptyState } from './features/app-layout.styled'
import {
  Header,
  HeaderLeft,
  Logo,
  SyncBtn,
  SyncingLabel,
  Nav,
  NavBtn
} from './features/app-header/app-header.styled'

type Tab = 'kanban' | 'dashboard' | 'templates' | 'settings'

export default function App(): JSX.Element {
  const dispatch = useAppDispatch()

  const boards = useAppSelector(selectBoards)
  const selectedBoardId = useAppSelector(selectSelectedBoardId)
  const selectedBoard = useAppSelector(selectSelectedBoard)
  const loading = useAppSelector(selectBoardsLoading)
  const syncing = useAppSelector(selectSyncing)
  const syncVersion = useAppSelector(selectSyncVersion)
  const syncError = useAppSelector(selectSyncError)
  const activeTab = useAppSelector(selectActiveTab)
  const showRegistration = useAppSelector(selectShowRegistration)

  useEffect(() => {
    dispatch(fetchBoards())
  }, [dispatch])

  const handleSync = () => {
    if (!selectedBoardId) return
    dispatch(syncBoard(selectedBoardId))
  }

  const handleOpenLogs = useCallback(() => {
    api.logs.openFolder()
  }, [])

  if (loading) {
    return (
      <LoadingScreen>
        <div className="spinner" />
        <p>Loading Agile Life…</p>
      </LoadingScreen>
    )
  }

  return (
    <AppContainer>
      {/* ── Top Bar ── */}
      <Header>
        <HeaderLeft>
          <Logo>🚀 Agile Life</Logo>
          <BoardSwitcher />
          <SyncBtn
            className="btn-primary"
            onClick={handleSync}
            disabled={!selectedBoard || syncing}
            title="Fetch latest data from Trello"
          >
            {syncing ? (
              <SyncingLabel>
                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                Syncing…
              </SyncingLabel>
            ) : (
              '↻ Fetch from Trello'
            )}
          </SyncBtn>
        </HeaderLeft>
        <Nav>
          {(['kanban', 'dashboard', 'templates', 'settings'] as Tab[]).map((tab) => (
            <NavBtn key={tab} $active={activeTab === tab} onClick={() => dispatch(tabChanged(tab))}>
              {tab === 'kanban' && '📋 '}
              {tab === 'dashboard' && '📊 '}
              {tab === 'templates' && '🗂️ '}
              {tab === 'settings' && '⚙️ '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </NavBtn>
          ))}
        </Nav>
      </Header>

      {/* ── Main Content ── */}
      <Main $kanban={activeTab === 'kanban'}>
        {showRegistration ? (
          <BoardRegistration />
        ) : !selectedBoard ? (
          <EmptyState>
            <h2>No boards registered</h2>
            <p className="text-muted">Get started by registering a Trello board.</p>
            <button className="btn-primary" onClick={() => dispatch(registrationOpened())}>
              + Register a Board
            </button>
          </EmptyState>
        ) : (
          <>
            {activeTab === 'kanban' && (
              <KanbanPage board={selectedBoard} allBoards={boards} syncVersion={syncVersion} />
            )}
            {activeTab === 'dashboard' && (
              <Dashboard board={selectedBoard} syncVersion={syncVersion} />
            )}
            {activeTab === 'templates' && <TemplatesPage board={selectedBoard} />}
            {activeTab === 'settings' && <SettingsPage board={selectedBoard} allBoards={boards} />}
          </>
        )}
      </Main>

      <Toast
        message={syncError}
        onDismiss={() => dispatch(syncErrorDismissed())}
        onOpenLogs={handleOpenLogs}
      />
    </AppContainer>
  )
}
