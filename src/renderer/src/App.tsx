import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig } from '@shared/board.types'
import { api } from './hooks/useApi'
import BoardSwitcher from './components/BoardSwitcher'
import BoardRegistration from './components/BoardRegistration'
import Toast from './components/Toast'
import Dashboard from './pages/Dashboard'
import SettingsPage from './pages/SettingsPage'
import KanbanPage from './pages/KanbanPage'
import styles from './App.module.css'

type Tab = 'kanban' | 'dashboard' | 'settings'

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
    const result = await api.boards.getAll()
    if (result.success && result.data) {
      setBoards(result.data)
      if (result.data.length > 0 && !selectedBoardId) {
        setSelectedBoardId(result.data[0].boardId)
      }
    }
    setLoading(false)
  }, [selectedBoardId])

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  const selectedBoard = boards.find((b) => b.boardId === selectedBoardId) ?? null

  const handleBoardAdded = (board: BoardConfig) => {
    setBoards((prev) => [...prev, board])
    setSelectedBoardId(board.boardId)
    setShowRegistration(false)
  }

  const handleBoardDeleted = (boardId: string) => {
    setBoards((prev) => prev.filter((b) => b.boardId !== boardId))
    if (selectedBoardId === boardId) {
      setSelectedBoardId(boards.find((b) => b.boardId !== boardId)?.boardId ?? null)
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

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className="spinner" />
        <p>Loading Agile Life…</p>
      </div>
    )
  }

  return (
    <div className={styles.app}>
      {/* ── Top Bar ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>🚀 Agile Life</span>
          <BoardSwitcher
            boards={boards}
            selectedBoardId={selectedBoardId}
            onSelect={setSelectedBoardId}
            onAddNew={() => setShowRegistration(true)}
          />
          <button
            className={`btn-primary ${styles.syncBtn}`}
            onClick={handleSync}
            disabled={!selectedBoard || syncing}
            title="Fetch latest data from Trello"
          >
            {syncing ? (
              <span className={styles.syncingLabel}>
                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                Syncing…
              </span>
            ) : (
              '↻ Fetch from Trello'
            )}
          </button>
        </div>
        <nav className={styles.nav}>
          {(['kanban', 'dashboard', 'settings'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`${styles.navBtn} ${activeTab === tab ? styles.navBtnActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'kanban' && '📋 '}
              {tab === 'dashboard' && '📊 '}
              {tab === 'settings' && '⚙️ '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className={styles.main}>
        {showRegistration ? (
          <BoardRegistration
            onBoardAdded={handleBoardAdded}
            onCancel={boards.length > 0 ? () => setShowRegistration(false) : undefined}
          />
        ) : !selectedBoard ? (
          <div className={styles.emptyState}>
            <h2>No boards registered</h2>
            <p className="text-muted">Get started by registering a Trello board.</p>
            <button className="btn-primary" onClick={() => setShowRegistration(true)}>
              + Register a Board
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'kanban' && (
              <KanbanPage board={selectedBoard} allBoards={boards} syncVersion={syncVersion} />
            )}
            {activeTab === 'dashboard' && (
              <Dashboard board={selectedBoard} syncVersion={syncVersion} />
            )}
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
      </main>

      <Toast message={syncError} onDismiss={() => setSyncError(null)} />
    </div>
  )
}
