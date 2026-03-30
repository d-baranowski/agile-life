import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { DragDropContext } from 'react-beautiful-dnd'
import type { BoardConfig } from '@shared/board.types'
import type { KanbanColumn, TrelloMember, TrelloLabel } from '@shared/trello.types'
import type { GamificationStats } from '@shared/analytics.types'
import { api } from '../hooks/useApi'
import { fuzzyMatch } from '../lib/fuzzy-match'
import Toast from '../components/Toast'
import StrictModeDroppable from '../components/StrictModeDroppable'
import TicketNumberingPage from './TicketNumberingPage'
import DraggableCard from './kanban/DraggableCard'
import CardContextMenu from './kanban/CardContextMenu'
import BulkActionBar from './kanban/BulkActionBar'
import GamificationBar from './kanban/GamificationBar'
import EpicStoriesModal from './kanban/EpicStoriesModal'
import GenerateTemplateModal from './kanban/GenerateTemplateModal'
import AddCardModalComponent from './kanban/AddCardModal'
import BulkLabelModalComponent from './kanban/BulkLabelModal'
import { useAddCardQueue } from './kanban/hooks/useAddCardQueue'
import { useBulkLabelQueue } from './kanban/hooks/useBulkLabelQueue'
import { useCardActions } from './kanban/hooks/useCardActions'
import { useEpicManagement } from './kanban/hooks/useEpicManagement'
import { useGenerateTemplate } from './kanban/hooks/useGenerateTemplate'
import { useBulkActions } from './kanban/hooks/useBulkActions'
import { useDragDrop } from './kanban/hooks/useDragDrop'
import styles from './KanbanPage.module.css'

interface Props {
  board: BoardConfig
  allBoards: BoardConfig[]
  /** Incremented by App each time a Trello sync completes — triggers a data reload. */
  syncVersion: number
}

export default function KanbanPage({ board, allBoards, syncVersion }: Props): JSX.Element {
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [epicFilter, setEpicFilter] = useState<string>('')
  const [epicColumnFilter, setEpicColumnFilter] = useState<string>('')
  const [boardMembers, setBoardMembers] = useState<TrelloMember[]>([])
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 })

  const isStoryBoard = !!board.epicBoardId
  const isEpicBoard = allBoards.some((b) => b.epicBoardId === board.boardId)

  const [boardLabels, setBoardLabels] = useState<TrelloLabel[]>([])
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null)

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadBoardData = useCallback(async () => {
    const [dataResult, membersResult, labelsResult] = await Promise.all([
      api.trello.getBoardData(board.boardId),
      api.trello.getBoardMembers(board.boardId),
      api.trello.getBoardLabels(board.boardId)
    ])
    if (dataResult.success && dataResult.data) {
      setColumns(dataResult.data)
      setError(null)
    } else {
      setError(dataResult.error ?? 'Failed to load board data.')
    }
    if (membersResult.success && membersResult.data) setBoardMembers(membersResult.data)
    if (labelsResult.success && labelsResult.data) setBoardLabels(labelsResult.data)
    setLoading(false)
  }, [board.boardId, syncVersion])

  // ── Hooks ─────────────────────────────────────────────────────────────────

  const epicMgmt = useEpicManagement(board.boardId, isStoryBoard, setColumns)

  const { contextMenu, setContextMenu, handleArchiveCard, handleToggleMember, handleToggleLabel } =
    useCardActions(board.boardId, columns, boardMembers, setColumns, setToastMessage)

  const addCard = useAddCardQueue(board.boardId)

  const bulk = useBulkActions(
    board.boardId,
    columns,
    epicMgmt.epicCardOptions,
    setColumns,
    setToastMessage,
    loadBoardData
  )

  const bulkLabel = useBulkLabelQueue(
    board.boardId,
    boardLabels,
    columns,
    bulk.selectedCardIds,
    setColumns,
    bulk.setSelectedCardIds
  )

  const gen = useGenerateTemplate(board.boardId, loadBoardData)

  // ── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!board.myMemberId) {
      setGamificationStats(null)
      return
    }
    api.analytics
      .gamificationStats(board.boardId, board.myMemberId, board.storyPointsConfig)
      .then((result) => {
        if (result.success && result.data) setGamificationStats(result.data)
      })
  }, [board.boardId, board.myMemberId, board.storyPointsConfig, syncVersion])

  useEffect(() => {
    setLoading(true)
    setError(null)
    bulk.setSelectedCardIds(new Set())
    loadBoardData()
  }, [loadBoardData])

  useEffect(() => {
    const onPointerMove = (e: PointerEvent): void => {
      lastPointerPos.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      }
    }
    document.addEventListener('pointermove', onPointerMove)
    return () => document.removeEventListener('pointermove', onPointerMove)
  }, [])

  useEffect(() => {
    setEpicFilter('')
    setEpicColumnFilter('')
  }, [board.boardId])

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragEnd = useDragDrop(
    board.boardId,
    columns,
    board.doneListNames,
    board.storyPointsConfig,
    setColumns,
    setToastMessage,
    lastPointerPos
  )

  // ── Toolbar state ─────────────────────────────────────────────────────────

  const [showTicketsModal, setShowTicketsModal] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [showEmptyMeatball, setShowEmptyMeatball] = useState(false)
  const [showMainMeatball, setShowMainMeatball] = useState(false)
  const emptyMeatballRef = useRef<HTMLDivElement>(null)
  const mainMeatballRef = useRef<HTMLDivElement>(null)

  const handleOpenLogs = useCallback(() => api.logs.openFolder(), [])

  // ── Global keyboard / click-outside handlers ──────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTicketsModal(false)
        epicMgmt.handleCloseEpicStories()
        epicMgmt.setEpicDropdownCardId(null)
        addCard.handleCloseAddCard()
        gen.handleCloseGenModal()
        bulk.setBulkEpicDropdownOpen(false)
        bulk.setSelectedCardIds(new Set())
        setShowEmptyMeatball(false)
        setShowMainMeatball(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [addCard, epicMgmt, gen, bulk])

  useEffect(() => {
    if (!showEmptyMeatball && !showMainMeatball) return
    const handleClick = (e: MouseEvent) => {
      if (emptyMeatballRef.current && !emptyMeatballRef.current.contains(e.target as Node))
        setShowEmptyMeatball(false)
      if (mainMeatballRef.current && !mainMeatballRef.current.contains(e.target as Node))
        setShowMainMeatball(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showEmptyMeatball, showMainMeatball])

  useEffect(() => {
    if (!contextMenu) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node))
        setContextMenu(null)
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [contextMenu, setContextMenu])

  // ── Memoised values ───────────────────────────────────────────────────────

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>()
    for (const col of columns) {
      for (const card of col.cards) {
        const key = card.name.trim().toLowerCase()
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
    const result = new Set<string>()
    for (const [name, count] of counts) {
      if (count > 1) result.add(name)
    }
    return result
  }, [columns])

  const epicColumns = useMemo(
    () =>
      epicMgmt.epicCardOptions.reduce<{ listId: string; listName: string }[]>((acc, opt) => {
        if (!acc.some((c) => c.listId === opt.listId))
          acc.push({ listId: opt.listId, listName: opt.listName })
        return acc
      }, []),
    [epicMgmt.epicCardOptions]
  )

  const epicCardIdsInColumn = useMemo(
    () =>
      epicColumnFilter
        ? new Set(
            epicMgmt.epicCardOptions
              .filter((opt) => opt.listId === epicColumnFilter)
              .map((opt) => opt.id)
          )
        : null,
    [epicMgmt.epicCardOptions, epicColumnFilter]
  )

  const filteredColumns = useMemo(
    () =>
      searchQuery.trim() || epicFilter || epicColumnFilter || showDuplicates
        ? columns.map((col) => ({
            ...col,
            cards: col.cards.filter((card) => {
              if (searchQuery.trim() && !fuzzyMatch(searchQuery, `${card.name} ${card.desc}`))
                return false
              if (epicFilter === '__none__' && card.epicCardId) return false
              if (epicFilter && epicFilter !== '__none__' && card.epicCardId !== epicFilter)
                return false
              if (epicCardIdsInColumn)
                return card.epicCardId !== null && epicCardIdsInColumn.has(card.epicCardId)
              if (showDuplicates && !duplicateNames.has(card.name.trim().toLowerCase()))
                return false
              return true
            })
          }))
        : columns,
    [
      columns,
      searchQuery,
      epicFilter,
      epicColumnFilter,
      epicCardIdsInColumn,
      showDuplicates,
      duplicateNames
    ]
  )

  const selectedCardCount = bulk.selectedCardIds.size

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.centred}>
        <div className="spinner" />
        <span>Loading board…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.centred}>
        <div className={styles.errorBanner}>{error}</div>
      </div>
    )
  }

  const ticketsModal = showTicketsModal ? (
    <div className={styles.modalOverlay} onClick={() => setShowTicketsModal(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.modalClose}
          onClick={() => setShowTicketsModal(false)}
          title="Close (Esc)"
        >
          ✕
        </button>
        <TicketNumberingPage board={board} />
      </div>
    </div>
  ) : null

  if (columns.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.searchBar}>
          <div ref={emptyMeatballRef} className={styles.meatballWrapper}>
            <button
              className={styles.meatballBtn}
              onClick={() => setShowEmptyMeatball((v) => !v)}
              title="More options"
              aria-label="More options"
            >
              •••
            </button>
            {showEmptyMeatball && (
              <div className={styles.meatballMenu}>
                <button
                  className={styles.meatballItem}
                  onClick={() => {
                    setShowTicketsModal(true)
                    setShowEmptyMeatball(false)
                  }}
                >
                  🎫 Number Tickets
                </button>
                <button
                  className={styles.meatballItem}
                  onClick={() => {
                    gen.handleOpenGenModal()
                    setShowEmptyMeatball(false)
                  }}
                >
                  📋 Generate from Template
                </button>
              </div>
            )}
          </div>
        </div>
        <div className={styles.emptyState}>
          <p>No data yet.</p>
          <p className="text-muted">
            Click <strong>↻ Fetch from Trello</strong> in the top bar to import this board&apos;s
            data.
          </p>
        </div>
        {ticketsModal}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="🔍 Fuzzy search cards…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {isStoryBoard && epicMgmt.epicCardOptions.length > 0 && (
          <select
            className={styles.epicFilterSelect}
            value={epicFilter}
            onChange={(e) => {
              setEpicFilter(e.target.value)
              setEpicColumnFilter('')
            }}
            title="Filter by epic"
            aria-label="Filter cards by epic"
          >
            <option value="">⚡ All epics</option>
            <option value="__none__">— No epic</option>
            {epicMgmt.epicCardOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        )}
        {isStoryBoard && epicColumns.length > 0 && (
          <select
            className={styles.epicFilterSelect}
            value={epicColumnFilter}
            onChange={(e) => {
              setEpicColumnFilter(e.target.value)
              setEpicFilter('')
            }}
            title="Filter by epic column"
            aria-label="Filter cards by epic column"
          >
            <option value="">📋 All epic columns</option>
            {epicColumns.map((col) => (
              <option key={col.listId} value={col.listId}>
                {col.listName}
              </option>
            ))}
          </select>
        )}
        <div ref={mainMeatballRef} className={styles.meatballWrapper}>
          <button
            className={`${styles.meatballBtn} ${showDuplicates ? styles.meatballBtnActive : ''}`}
            onClick={() => setShowMainMeatball((v) => !v)}
            title="More options"
            aria-label="More options"
          >
            •••
          </button>
          {showMainMeatball && (
            <div className={styles.meatballMenu}>
              <button
                className={`${styles.meatballItem} ${showDuplicates ? styles.meatballItemActive : ''}`}
                onClick={() => {
                  setShowDuplicates((v) => !v)
                  setShowMainMeatball(false)
                }}
              >
                ⊖ Duplicates{duplicateNames.size > 0 && ` (${duplicateNames.size})`}
              </button>
              <button
                className={styles.meatballItem}
                onClick={() => {
                  setShowTicketsModal(true)
                  setShowMainMeatball(false)
                }}
              >
                🎫 Number Tickets
              </button>
              <button
                className={styles.meatballItem}
                onClick={() => {
                  gen.handleOpenGenModal()
                  setShowMainMeatball(false)
                }}
              >
                📋 Generate from Template
              </button>
            </div>
          )}
        </div>
      </div>

      {gamificationStats && <GamificationBar stats={gamificationStats} />}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.board}>
          {filteredColumns.map((column) => (
            <div key={column.id} className={styles.column}>
              <div className={styles.columnHeader}>
                <span className={styles.columnName}>{column.name}</span>
                <span className={styles.columnCount}>{column.cards.length}</span>
              </div>

              <StrictModeDroppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${styles.cardList} ${snapshot.isDraggingOver ? styles.cardListOver : ''}`}
                  >
                    {column.cards.map((card, index) => (
                      <DraggableCard
                        key={card.id}
                        card={card}
                        index={index}
                        isStoryBoard={isStoryBoard}
                        isEpicBoard={isEpicBoard}
                        epicCardOptions={epicMgmt.epicCardOptions}
                        epicDropdownCardId={epicMgmt.epicDropdownCardId}
                        isDuplicate={duplicateNames.has(card.name.trim().toLowerCase())}
                        isSelected={bulk.selectedCardIds.has(card.id)}
                        onToggleSelect={bulk.handleToggleSelectCard}
                        onOpenEpicStories={epicMgmt.handleOpenEpicStories}
                        onSetCardEpic={epicMgmt.handleSetCardEpic}
                        onToggleEpicDropdown={epicMgmt.handleToggleEpicDropdown}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({ x: e.clientX, y: e.clientY, card })
                        }}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>

              <button
                className={styles.addCardBtn}
                onClick={() => addCard.handleOpenAddCard(column.id, column.name)}
              >
                + Add a card
              </button>
            </div>
          ))}
        </div>
      </DragDropContext>

      {selectedCardCount > 0 && (
        <BulkActionBar
          selectedCardCount={selectedCardCount}
          isStoryBoard={isStoryBoard}
          epicCardOptions={epicMgmt.epicCardOptions}
          boardLabelsExist={boardLabels.length > 0}
          bulkEpicDropdownOpen={bulk.bulkEpicDropdownOpen}
          bulkEpicDropdownRef={bulk.bulkEpicDropdownRef}
          isBulkArchiving={bulk.isBulkArchiving}
          onToggleBulkEpicDropdown={() => bulk.setBulkEpicDropdownOpen((prev) => !prev)}
          onBulkSetEpic={bulk.handleBulkSetEpic}
          onOpenBulkLabel={bulkLabel.handleOpenBulkLabelFromBar}
          onBulkArchive={bulk.handleBulkArchive}
          onClearSelection={() => bulk.setSelectedCardIds(new Set())}
        />
      )}

      {contextMenu && (
        <CardContextMenu
          contextMenu={contextMenu}
          contextMenuRef={contextMenuRef}
          boardMembers={boardMembers}
          boardLabels={boardLabels}
          onArchive={handleArchiveCard}
          onToggleMember={handleToggleMember}
          onToggleLabel={handleToggleLabel}
        />
      )}

      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
        onOpenLogs={handleOpenLogs}
      />

      {ticketsModal}

      {epicMgmt.epicStoriesCard && (
        <EpicStoriesModal
          cardName={epicMgmt.epicStoriesCard.name}
          stories={epicMgmt.epicStories}
          loading={epicMgmt.epicStoriesLoading}
          onClose={epicMgmt.handleCloseEpicStories}
        />
      )}

      {gen.showGenModal && (
        <GenerateTemplateModal
          groups={gen.genGroups}
          groupId={gen.genGroupId}
          templates={gen.genTemplates}
          loading={gen.genLoading}
          generating={gen.genGenerating}
          result={gen.genResult}
          error={gen.genError}
          onGroupChange={gen.handleGenGroupChange}
          onGenerate={gen.handleGenerateFromModal}
          onClose={gen.handleCloseGenModal}
        />
      )}

      {addCard.addCardModal && (
        <AddCardModalComponent
          modal={addCard.addCardModal}
          textareaRef={addCard.addCardTextareaRef}
          onTextChange={addCard.handleTextChange}
          onRemovePreviewLine={addCard.handleRemovePreviewLine}
          onRemoveQueueItem={addCard.handleRemoveQueueItem}
          onStartUpload={() => addCard.handleStartUpload(bulk.onCardsCreated)}
          onRetryItem={(id) => addCard.handleRetryItem(id, bulk.onCardsCreated)}
          onRetryAllFailed={() => addCard.handleRetryAllFailed(bulk.onCardsCreated)}
          onClose={addCard.handleCloseAddCard}
        />
      )}

      {bulkLabel.bulkLabelModal && (
        <BulkLabelModalComponent
          modal={bulkLabel.bulkLabelModal}
          boardLabels={boardLabels}
          selectedCardCount={selectedCardCount}
          textareaRef={bulkLabel.bulkLabelTextareaRef}
          onTextChange={bulkLabel.handleBulkLabelTextChange}
          onToggleLabelSelection={bulkLabel.handleToggleBulkLabelSelection}
          onStart={bulkLabel.handleStartBulkLabel}
          onRunBulkLabel={bulkLabel.handleRunBulkLabel}
          onRetryItem={bulkLabel.handleBulkLabelRetryItem}
          onRetryAllFailed={bulkLabel.handleBulkLabelRetryAllFailed}
          onClose={bulkLabel.handleCloseBulkLabel}
        />
      )}
    </div>
  )
}
