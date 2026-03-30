import { useEffect, useCallback, useRef, useMemo } from 'react'
import { DragDropContext } from 'react-beautiful-dnd'
import type { BoardConfig } from '../../lib/board.types'
import { api } from '../api/useApi'
import { fuzzyMatch } from '../../lib/fuzzy-match'
import Toast from '../toast/Toast'
import StrictModeDroppable from './components/StrictModeDroppable'
import TicketNumberingPage from '../tickets/TicketNumberingPage'
import DraggableCard from './components/draggable-card/DraggableCard'
import CardContextMenu from './components/CardContextMenu'
import BulkActionBar from './components/BulkActionBar'
import GamificationBar from './components/gamification-bar/GamificationBar'
import EpicStoriesModal from './components/EpicStoriesModal'
import GenerateTemplateModal from './components/GenerateTemplateModal'
import AddCardModalComponent from './components/add-card/AddCardModal'
import BulkLabelModalComponent from './components/bulk-label/BulkLabelModal'
import BulkArchiveModalComponent from './components/bulk-archive/BulkArchiveModal'
import BulkMemberModalComponent from './components/BulkMemberModal'
import { EpicFilterSelect } from './components/EpicFilterSelect'
import { useAddCardQueue } from './hooks/useAddCardQueue'
import { useBulkLabelQueue } from './hooks/useBulkLabelQueue'
import { useCardActions } from './hooks/useCardActions'
import { useEpicManagement } from './hooks/useEpicManagement'
import { useGenerateTemplate } from './hooks/useGenerateTemplate'
import { useBulkActions } from './hooks/useBulkActions'
import { useDragDrop } from './hooks/useDragDrop'
import KanbanMeatballMenu from './components/meatball-menu/KanbanMeatballMenu'
import KanbanColumnHeader from './components/KanbanColumnHeader'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchBoardData,
  fetchGamificationStats,
  searchQueryChanged,
  epicFilterChanged,
  epicColumnFilterChanged,
  filtersResetForBoard,
  duplicatesToggled,
  unassignedToggled,
  noEpicToggled,
  noSizeToggled,
  ticketsModalToggled,
  emptyMeatballToggled,
  emptyMeatballClosed,
  mainMeatballToggled,
  mainMeatballClosed,
  allCardsInColumnSelected,
  selectionCleared,
  escapePressed,
  kanbanToastDismissed,
  contextMenuOpened
} from './kanbanSlice'
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
} from './styled/kanban-board.styled'
import {
  Centred,
  ErrorBanner,
  EmptyState,
  ModalOverlay,
  ModalContent,
  ModalClose
} from './styled/kanban-states.styled'

interface Props {
  board: BoardConfig
  allBoards: BoardConfig[]
  /** Incremented by App each time a Trello sync completes — triggers a data reload. */
  syncVersion: number
}

export default function KanbanPage(props: Props): JSX.Element {
  const { board, allBoards, syncVersion } = props
  const dispatch = useAppDispatch()

  // ── Redux state ──────────────────────────────────────────────────────────
  const columns = useAppSelector((s) => s.kanban.columns)
  const loading = useAppSelector((s) => s.kanban.loading)
  const error = useAppSelector((s) => s.kanban.error)
  const toastMessage = useAppSelector((s) => s.kanban.toastMessage)
  const searchQuery = useAppSelector((s) => s.kanban.searchQuery)
  const epicFilter = useAppSelector((s) => s.kanban.epicFilter)
  const epicColumnFilter = useAppSelector((s) => s.kanban.epicColumnFilter)
  const boardMembers = useAppSelector((s) => s.kanban.boardMembers)
  const boardLabels = useAppSelector((s) => s.kanban.boardLabels)
  const gamificationStats = useAppSelector((s) => s.kanban.gamificationStats)
  const showTicketsModal = useAppSelector((s) => s.kanban.showTicketsModal)
  const showDuplicates = useAppSelector((s) => s.kanban.showDuplicates)
  const filterUnassigned = useAppSelector((s) => s.kanban.filterUnassigned)
  const filterNoEpic = useAppSelector((s) => s.kanban.filterNoEpic)
  const filterNoSize = useAppSelector((s) => s.kanban.filterNoSize)
  const showEmptyMeatball = useAppSelector((s) => s.kanban.showEmptyMeatball)
  const showMainMeatball = useAppSelector((s) => s.kanban.showMainMeatball)
  const selectedCardIds = useAppSelector((s) => s.kanban.selectedCardIds)

  const contextMenuRef = useRef<HTMLDivElement>(null)
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 })
  const emptyMeatballRef = useRef<HTMLDivElement>(null)
  const mainMeatballRef = useRef<HTMLDivElement>(null)

  const isStoryBoard = !!board.epicBoardId
  const isEpicBoard = allBoards.some((b) => b.epicBoardId === board.boardId)

  // ── Hooks ─────────────────────────────────────────────────────────────────

  const epicMgmt = useEpicManagement(board.boardId, isStoryBoard)

  const {
    contextMenu,
    handleCloseContextMenu,
    handleArchiveCard,
    handleToggleMember,
    handleToggleLabel
  } = useCardActions(board.boardId)

  const addCard = useAddCardQueue(board.boardId)

  const bulk = useBulkActions(board.boardId)

  const bulkLabel = useBulkLabelQueue(board.boardId)

  const gen = useGenerateTemplate(board.boardId)

  // ── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchBoardData(board.boardId))
  }, [board.boardId, syncVersion, dispatch])

  useEffect(() => {
    if (!board.myMemberId) return
    dispatch(
      fetchGamificationStats({
        boardId: board.boardId,
        myMemberId: board.myMemberId,
        storyPointsConfig: board.storyPointsConfig
      })
    )
  }, [board.boardId, board.myMemberId, board.storyPointsConfig, syncVersion, dispatch])

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
    dispatch(filtersResetForBoard())
  }, [board.boardId, dispatch])

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragEnd = useDragDrop(
    board.boardId,
    board.doneListNames,
    board.storyPointsConfig,
    lastPointerPos
  )

  const handleOpenLogs = useCallback(() => api.logs.openFolder(), [])

  // ── Global keyboard / click-outside handlers ──────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch(escapePressed())
        addCard.handleCloseAddCard()
        bulkLabel.handleCloseBulkLabel()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dispatch, addCard, bulkLabel])

  useEffect(() => {
    if (!showEmptyMeatball && !showMainMeatball) return
    const handleClick = (e: MouseEvent) => {
      if (emptyMeatballRef.current && !emptyMeatballRef.current.contains(e.target as Node))
        dispatch(emptyMeatballClosed())
      if (mainMeatballRef.current && !mainMeatballRef.current.contains(e.target as Node))
        dispatch(mainMeatballClosed())
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showEmptyMeatball, showMainMeatball, dispatch])

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
      dispatch(allCardsInColumnSelected(col.cards.map((card) => card.id)))
    },
    [filteredColumns, dispatch]
  )

  const selectedCardCount = selectedCardIds.length

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
    <ModalOverlay onClick={() => dispatch(ticketsModalToggled(false))}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalClose onClick={() => dispatch(ticketsModalToggled(false))} title="Close (Esc)">
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
            onToggleMeatball={() => dispatch(emptyMeatballToggled())}
            onToggleDuplicates={() => {}}
            onToggleUnassigned={() => {}}
            onToggleNoEpic={() => {}}
            onToggleNoSize={() => {}}
            onOpenTickets={() => {
              dispatch(ticketsModalToggled(true))
              dispatch(emptyMeatballClosed())
            }}
            onOpenGenerate={() => {
              gen.handleOpenGenModal()
              dispatch(emptyMeatballClosed())
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
          onChange={(e) => dispatch(searchQueryChanged(e.target.value))}
        />
        {isStoryBoard && epicMgmt.epicCardOptions.length > 0 && (
          <EpicFilterSelect
            epicCards={epicMgmt.epicCardOptions}
            value={epicFilter}
            onChange={(val) => dispatch(epicFilterChanged(val))}
          />
        )}
        {isStoryBoard && epicColumns.length > 0 && (
          <EpicFilterSelectStyled
            value={epicColumnFilter}
            onChange={(e) => dispatch(epicColumnFilterChanged(e.target.value))}
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
          onToggleMeatball={() => dispatch(mainMeatballToggled())}
          onToggleDuplicates={() => dispatch(duplicatesToggled())}
          onToggleUnassigned={() => dispatch(unassignedToggled())}
          onToggleNoEpic={() => dispatch(noEpicToggled())}
          onToggleNoSize={() => dispatch(noSizeToggled())}
          onOpenTickets={() => {
            dispatch(ticketsModalToggled(true))
            dispatch(mainMeatballClosed())
          }}
          onOpenGenerate={() => {
            gen.handleOpenGenModal()
            dispatch(mainMeatballClosed())
          }}
        />
        {selectedCardCount > 0 && (
          <ClearSelectionBtn
            onClick={() => dispatch(selectionCleared())}
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
                          dispatch(contextMenuOpened({ x: e.clientX, y: e.clientY, card }))
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
          onToggleBulkEpicDropdown={() => bulk.setBulkEpicDropdownOpen()}
          onBulkEpicSearchChange={bulk.setBulkEpicSearch}
          onBulkSetEpic={bulk.handleBulkSetEpic}
          onOpenBulkLabel={bulkLabel.handleOpenBulkLabelFromBar}
          onBulkArchive={bulk.handleOpenBulkArchive}
          onToggleBulkMemberDropdown={() => bulk.setBulkMemberDropdownOpen()}
          onOpenBulkMemberModal={bulk.handleOpenBulkMemberModal}
          onClearSelection={() => dispatch(selectionCleared())}
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
          onClose={handleCloseContextMenu}
        />
      )}

      <Toast
        message={toastMessage}
        onDismiss={() => dispatch(kanbanToastDismissed())}
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
