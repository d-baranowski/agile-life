import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig } from './lib/board.types'
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
  const [boards, setBoards] = useState<BoardConfig[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('kanban')
  const [showRegistration, setShowRegistration] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncVersion, setSyncVersion] = useState(0)
  const [syncError, setSyncError] = useState<string | null>(null)

  const loadBoards = useCallback(async () => {
    const [boardsResult, lastSelectedResult] = await Promise.all([
      api.boards.getAll(),
      api.boards.getLastSelected()
    ])
    if (boardsResult.success && boardsResult.data) {
      setBoards(boardsResult.data)
      if (boardsResult.data.length > 0 && !selectedBoardId) {
        const lastId = lastSelectedResult.success ? lastSelectedResult.data : null
        const validLast =
          lastId && boardsResult.data.some((b) => b.boardId === lastId) ? lastId : null
        setSelectedBoardId(validLast ?? boardsResult.data[0].boardId)
      }
    }
    setLoading(false)
  }, [selectedBoardId])

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  const selectedBoard = boards.find((b) => b.boardId === selectedBoardId) ?? null

  const handleSelectBoard = useCallback((boardId: string) => {
    setSelectedBoardId(boardId)
    api.boards.setLastSelected(boardId)
  }, [])

  const handleBoardAdded = (board: BoardConfig) => {
    setBoards((prev) => [...prev, board])
    setSelectedBoardId(board.boardId)
    api.boards.setLastSelected(board.boardId)
    setShowRegistration(false)
  }

  const handleBoardDeleted = (boardId: string) => {
    setBoards((prev) => prev.filter((b) => b.boardId !== boardId))
    if (selectedBoardId === boardId) {
      const next = boards.find((b) => b.boardId !== boardId)?.boardId ?? null
      setSelectedBoardId(next)
      if (next) api.boards.setLastSelected(next)
    }
  }

  const handleSync = async () => {
    if (!selectedBoardId) return
    setSyncing(true)
    setSyncError(null)
    const result = await api.trello.sync(selectedBoardId)
    if (result.success) {
      // Refresh board list so lastSyncedAt timestamp updates
      await loadBoards()
      setSyncVersion((v) => v + 1)
    } else {
      setSyncError(result.error ?? 'Sync failed. Please try again.')
    }
    setSyncing(false)
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
          <BoardSwitcher
            boards={boards}
            selectedBoardId={selectedBoardId}
            onSelect={handleSelectBoard}
            onAddNew={() => setShowRegistration(true)}
          />
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
            <NavBtn key={tab} $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
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
          <BoardRegistration
            onBoardAdded={handleBoardAdded}
            onCancel={boards.length > 0 ? () => setShowRegistration(false) : undefined}
          />
        ) : !selectedBoard ? (
          <EmptyState>
            <h2>No boards registered</h2>
            <p className="text-muted">Get started by registering a Trello board.</p>
            <button className="btn-primary" onClick={() => setShowRegistration(true)}>
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
            {activeTab === 'settings' && (
              <SettingsPage
                board={selectedBoard}
                allBoards={boards}
                onBoardUpdated={(updated) =>
                  setBoards((prev) =>
                    prev.map((b) => (b.boardId === updated.boardId ? updated : b))
                  )
                }
                onBoardDeleted={handleBoardDeleted}
              />
            )}
          </>
        )}
      </Main>

      <Toast message={syncError} onDismiss={() => setSyncError(null)} onOpenLogs={handleOpenLogs} />
    </AppContainer>
  )
}
