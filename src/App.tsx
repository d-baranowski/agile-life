import { useEffect, useCallback, useState, useRef } from 'react'
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
import GridPage from './features/grid/GridPage'
import TemplatesPage from './features/templates/TemplatesPage'
import { AppContainer, LoadingScreen, Main, EmptyState } from './features/app-layout.styled'
import {
  Header,
  HeaderLeft,
  SyncBtn,
  SyncingLabel,
  Nav,
  NavBtn,
  NavDropdownWrapper,
  NavDropdownButton,
  NavDropdownMenu,
  NavDropdownItem
} from './features/app-header/app-header.styled'

const TABS: Tab[] = ['kanban', 'grid', 'dashboard', 'templates', 'settings']
const TAB_ICON: Record<Tab, string> = {
  kanban: '📋',
  grid: '🗃️',
  dashboard: '📊',
  templates: '🗂️',
  settings: '⚙️'
}
const COMPACT_HEADER_BREAKPOINT = 960

type Tab = 'kanban' | 'grid' | 'dashboard' | 'templates' | 'settings'

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

  const [compactHeader, setCompactHeader] = useState(
    () => window.innerWidth < COMPACT_HEADER_BREAKPOINT
  )
  useEffect(() => {
    const onResize = (): void => setCompactHeader(window.innerWidth < COMPACT_HEADER_BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [navMenuOpen, setNavMenuOpen] = useState(false)
  const navMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!navMenuOpen) return
    const onClick = (e: MouseEvent): void => {
      if (navMenuRef.current && !navMenuRef.current.contains(e.target as Node)) {
        setNavMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [navMenuOpen])

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
          <BoardSwitcher />
          <SyncBtn
            className="btn-primary"
            $iconOnly={compactHeader}
            onClick={handleSync}
            disabled={!selectedBoard || syncing}
            title={syncing ? 'Syncing…' : 'Fetch latest data from Trello'}
          >
            {syncing ? (
              <SyncingLabel>
                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                {!compactHeader && 'Syncing…'}
              </SyncingLabel>
            ) : compactHeader ? (
              '↻'
            ) : (
              '↻ Fetch from Trello'
            )}
          </SyncBtn>
        </HeaderLeft>
        {compactHeader ? (
          <NavDropdownWrapper ref={navMenuRef}>
            <NavDropdownButton
              onClick={() => setNavMenuOpen((o) => !o)}
              title={`View: ${activeTab}`}
              aria-label="Switch view"
            >
              {TAB_ICON[activeTab]} ▾
            </NavDropdownButton>
            {navMenuOpen && (
              <NavDropdownMenu>
                {TABS.map((tab) => (
                  <NavDropdownItem
                    key={tab}
                    $active={activeTab === tab}
                    onClick={() => {
                      dispatch(tabChanged(tab))
                      setNavMenuOpen(false)
                    }}
                  >
                    {TAB_ICON[tab]} {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </NavDropdownItem>
                ))}
              </NavDropdownMenu>
            )}
          </NavDropdownWrapper>
        ) : (
          <Nav>
            {TABS.map((tab) => (
              <NavBtn
                key={tab}
                $active={activeTab === tab}
                onClick={() => dispatch(tabChanged(tab))}
              >
                {TAB_ICON[tab]} {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </NavBtn>
            ))}
          </Nav>
        )}
      </Header>

      {/* ── Main Content ── */}
      <Main $kanban={activeTab === 'kanban' || activeTab === 'grid'}>
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
            {activeTab === 'grid' && <GridPage board={selectedBoard} />}
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
