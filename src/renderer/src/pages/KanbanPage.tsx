import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { DragDropContext } from 'react-beautiful-dnd'
import type { BoardConfig } from '@shared/board.types'
import type { KanbanColumn, TrelloMember, TrelloLabel } from '@shared/trello.types'
import type { GamificationStats } from '@shared/analytics.types'
import { api } from '../hooks/useApi'
import { fuzzyMatch } from '../lib/fuzzy-match'
import Toast from '../components/Toast'
import StrictModeDroppable from './kanban/StrictModeDroppable'
import TicketNumberingPage from './TicketNumberingPage'
import DraggableCard from './kanban/DraggableCard'
import CardContextMenu from './kanban/CardContextMenu'
import BulkActionBar from './kanban/BulkActionBar'
import GamificationBar from './kanban/GamificationBar'
import EpicStoriesModal from './kanban/EpicStoriesModal'
import GenerateTemplateModal from './kanban/GenerateTemplateModal'
import AddCardModalComponent from './kanban/AddCardModal'
import BulkLabelModalComponent from './kanban/BulkLabelModal'
import BulkArchiveModalComponent from './kanban/BulkArchiveModal'
import BulkMemberModalComponent from './kanban/BulkMemberModal'
import { EpicFilterSelect } from './kanban/EpicFilterSelect'
import { useAddCardQueue } from './kanban/hooks/useAddCardQueue'
import { useBulkLabelQueue } from './kanban/hooks/useBulkLabelQueue'
import { useCardActions } from './kanban/hooks/useCardActions'
import { useEpicManagement } from './kanban/hooks/useEpicManagement'
import { useGenerateTemplate } from './kanban/hooks/useGenerateTemplate'
import { useBulkActions } from './kanban/hooks/useBulkActions'
import { useDragDrop } from './kanban/hooks/useDragDrop'
import KanbanMeatballMenu from './kanban/KanbanMeatballMenu'
import KanbanColumnHeader from './kanban/KanbanColumnHeader'
import {
  Container,
  SearchBar,
  SearchInput,
  EpicFilterSelectStyled,
  ClearSelectionBtn,
  Board,
  Column,
  CardList,
  AddCardBtn
} from './kanban/styled/kanban-board.styled'
import {
  Centred,
  ErrorBanner,
  EmptyState,
  ModalOverlay,
  ModalContent,
  ModalClose
} from './kanban/styled/kanban-states.styled'

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
    boardMembers,
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
  const [filterUnassigned, setFilterUnassigned] = useState(false)
  const [filterNoEpic, setFilterNoEpic] = useState(false)
  const [filterNoSize, setFilterNoSize] = useState(false)
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
        bulk.handleCloseBulkArchive()
        bulk.handleCloseBulkMember()
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

  // ── Memoised values ───────────────────────────────────────────────────────

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>()
    for (const col of columns)
      for (const card of col.cards) {
        const key = card.name.trim().toLowerCase()
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n))
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

  const sizeLabelsLower = useMemo(
    () => new Set(board.storyPointsConfig.map((r) => r.labelName.trim().toLowerCase())),
    [board.storyPointsConfig]
  )

  const hasActiveMenuFilter = showDuplicates || filterUnassigned || filterNoEpic || filterNoSize

  const hasAnyFilter = useMemo(
    () => !!searchQuery.trim() || !!epicFilter || !!epicColumnFilter || hasActiveMenuFilter,
    [searchQuery, epicFilter, epicColumnFilter, hasActiveMenuFilter]
  )

  const filteredColumns = useMemo(
    () =>
      hasAnyFilter
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
              if (filterUnassigned && card.members.length > 0) return false
              if (filterNoEpic && card.epicCardId) return false
              if (filterNoSize) {
                const hasSize = card.labels.some((l) =>
                  sizeLabelsLower.has((l.name || '').trim().toLowerCase())
                )
                if (hasSize) return false
              }
              return true
            })
          }))
        : columns,
    [
      columns,
      hasAnyFilter,
      searchQuery,
      epicFilter,
      epicColumnFilter,
      epicCardIdsInColumn,
      showDuplicates,
      duplicateNames,
      filterUnassigned,
      filterNoEpic,
      filterNoSize,
      sizeLabelsLower
    ]
  )

  // Select all visible cards in a given column
  const handleSelectAllInColumn = useCallback(
    (columnId: string) => {
      const col = filteredColumns.find((c) => c.id === columnId)
      if (!col) return
      bulk.setSelectedCardIds((prev) => {
        const next = new Set(prev)
        col.cards.forEach((card) => next.add(card.id))
        return next
      })
    },
    [filteredColumns, bulk]
  )

  const selectedCardCount = bulk.selectedCardIds.size

  if (loading) {
    return (
      <Centred>
        <div className="spinner" />
        <span>Loading board…</span>
      </Centred>
    )
  }

  if (error) {
    return (
      <Centred>
        <ErrorBanner>{error}</ErrorBanner>
      </Centred>
    )
  }

  const ticketsModal = showTicketsModal ? (
    <ModalOverlay onClick={() => setShowTicketsModal(false)}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalClose onClick={() => setShowTicketsModal(false)} title="Close (Esc)">
          ✕
        </ModalClose>
        <TicketNumberingPage board={board} />
      </ModalContent>
    </ModalOverlay>
  ) : null

  if (columns.length === 0) {
    return (
      <Container>
        <SearchBar>
          <KanbanMeatballMenu
            meatballRef={emptyMeatballRef}
            showMeatball={showEmptyMeatball}
            hasActiveMenuFilter={false}
            showDuplicates={false}
            duplicateCount={0}
            filterUnassigned={false}
            filterNoEpic={false}
            filterNoSize={false}
            isStoryBoard={false}
            storyPointsConfig={[]}
            onToggleMeatball={() => setShowEmptyMeatball((v) => !v)}
            onToggleDuplicates={() => {}}
            onToggleUnassigned={() => {}}
            onToggleNoEpic={() => {}}
            onToggleNoSize={() => {}}
            onOpenTickets={() => {
              setShowTicketsModal(true)
              setShowEmptyMeatball(false)
            }}
            onOpenGenerate={() => {
              gen.handleOpenGenModal()
              setShowEmptyMeatball(false)
            }}
          />
        </SearchBar>
        <EmptyState>
          <p>No data yet.</p>
          <p className="text-muted">
            Click <strong>↻ Fetch from Trello</strong> in the top bar to import this board&apos;s
            data.
          </p>
        </EmptyState>
        {ticketsModal}
      </Container>
    )
  }

  return (
    <Container>
      <SearchBar>
        <SearchInput
          type="search"
          placeholder="🔍 Fuzzy search cards…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {isStoryBoard && epicMgmt.epicCardOptions.length > 0 && (
          <EpicFilterSelect
            epicCards={epicMgmt.epicCardOptions}
            value={epicFilter}
            onChange={(val) => {
              setEpicFilter(val)
              setEpicColumnFilter('')
            }}
          />
        )}
        {isStoryBoard && epicColumns.length > 0 && (
          <EpicFilterSelectStyled
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
          </EpicFilterSelectStyled>
        )}
        <KanbanMeatballMenu
          meatballRef={mainMeatballRef}
          showMeatball={showMainMeatball}
          hasActiveMenuFilter={hasActiveMenuFilter}
          showDuplicates={showDuplicates}
          duplicateCount={duplicateNames.size}
          filterUnassigned={filterUnassigned}
          filterNoEpic={filterNoEpic}
          filterNoSize={filterNoSize}
          isStoryBoard={isStoryBoard}
          storyPointsConfig={board.storyPointsConfig}
          onToggleMeatball={() => setShowMainMeatball((v) => !v)}
          onToggleDuplicates={() => {
            setShowDuplicates((v) => !v)
            setShowMainMeatball(false)
          }}
          onToggleUnassigned={() => {
            setFilterUnassigned((v) => !v)
            setShowMainMeatball(false)
          }}
          onToggleNoEpic={() => {
            setFilterNoEpic((v) => !v)
            setShowMainMeatball(false)
          }}
          onToggleNoSize={() => {
            setFilterNoSize((v) => !v)
            setShowMainMeatball(false)
          }}
          onOpenTickets={() => {
            setShowTicketsModal(true)
            setShowMainMeatball(false)
          }}
          onOpenGenerate={() => {
            gen.handleOpenGenModal()
            setShowMainMeatball(false)
          }}
        />
        {selectedCardCount > 0 && (
          <ClearSelectionBtn
            onClick={() => bulk.setSelectedCardIds(new Set())}
            title="Clear selection (Esc)"
          >
            ✕ Clear {selectedCardCount} selected
          </ClearSelectionBtn>
        )}
      </SearchBar>

      {gamificationStats && <GamificationBar stats={gamificationStats} />}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Board>
          {filteredColumns.map((column) => (
            <Column key={column.id}>
              <KanbanColumnHeader
                columnId={column.id}
                columnName={column.name}
                cardCount={column.cards.length}
                onSelectAll={handleSelectAllInColumn}
              />

              <StrictModeDroppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <CardList
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    $isDragOver={snapshot.isDraggingOver}
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
                  </CardList>
                )}
              </StrictModeDroppable>

              <AddCardBtn onClick={() => addCard.handleOpenAddCard(column.id, column.name)}>
                + Add a card
              </AddCardBtn>
            </Column>
          ))}
        </Board>
      </DragDropContext>

      {selectedCardCount > 0 && (
        <BulkActionBar
          selectedCardCount={selectedCardCount}
          isStoryBoard={isStoryBoard}
          epicCardOptions={epicMgmt.epicCardOptions}
          boardLabelsExist={boardLabels.length > 0}
          boardMembers={boardMembers}
          bulkEpicDropdownOpen={bulk.bulkEpicDropdownOpen}
          bulkEpicDropdownRef={bulk.bulkEpicDropdownRef}
          bulkEpicSearch={bulk.bulkEpicSearch}
          bulkMemberDropdownOpen={bulk.bulkMemberDropdownOpen}
          bulkMemberDropdownRef={bulk.bulkMemberDropdownRef}
          onToggleBulkEpicDropdown={() => bulk.setBulkEpicDropdownOpen((prev) => !prev)}
          onBulkEpicSearchChange={bulk.setBulkEpicSearch}
          onBulkSetEpic={bulk.handleBulkSetEpic}
          onOpenBulkLabel={bulkLabel.handleOpenBulkLabelFromBar}
          onBulkArchive={bulk.handleOpenBulkArchive}
          onToggleBulkMemberDropdown={() => bulk.setBulkMemberDropdownOpen((prev) => !prev)}
          onOpenBulkMemberModal={bulk.handleOpenBulkMemberModal}
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
          onClose={() => setContextMenu(null)}
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

      {bulk.bulkArchiveModal && (
        <BulkArchiveModalComponent
          modal={bulk.bulkArchiveModal}
          columns={columns}
          selectedCardIds={bulk.selectedCardIds}
          onStart={bulk.handleStartBulkArchive}
          onRun={bulk.handleRunBulkArchive}
          onRetryItem={bulk.handleBulkArchiveRetryItem}
          onRetryAllFailed={bulk.handleBulkArchiveRetryAllFailed}
          onClose={bulk.handleCloseBulkArchive}
        />
      )}

      {bulk.bulkMemberModal && (
        <BulkMemberModalComponent
          modal={bulk.bulkMemberModal}
          columns={columns}
          selectedCardIds={bulk.selectedCardIds}
          onStart={bulk.handleStartBulkMember}
          onRun={bulk.handleRunBulkMember}
          onRetryItem={bulk.handleBulkMemberRetryItem}
          onRetryAllFailed={bulk.handleBulkMemberRetryAllFailed}
          onClose={bulk.handleCloseBulkMember}
        />
      )}
    </Container>
  )
}
