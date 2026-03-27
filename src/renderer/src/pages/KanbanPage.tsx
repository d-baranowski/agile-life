import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd'
import type { BoardConfig } from '@shared/board.types'
import type { EpicCardOption, EpicStory } from '@shared/board.types'
import type { KanbanColumn, KanbanCard, TrelloMember } from '@shared/trello.types'
import { api } from '../hooks/useApi'
import Toast from '../components/Toast'
import StrictModeDroppable from '../components/StrictModeDroppable'
import TicketNumberingPage from './TicketNumberingPage'
import styles from './KanbanPage.module.css'

interface Props {
  board: BoardConfig
  allBoards: BoardConfig[]
  /** Incremented by App each time a Trello sync completes — triggers a data reload. */
  syncVersion: number
}

interface ContextMenuState {
  x: number
  y: number
  card: KanbanCard
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function reorderCards(cards: KanbanCard[], fromIndex: number, toIndex: number): KanbanCard[] {
  const result = [...cards]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result
}

function moveCard(
  columns: KanbanColumn[],
  fromColId: string,
  toColId: string,
  fromIndex: number,
  toIndex: number
): KanbanColumn[] {
  const fromCol = columns.find((c) => c.id === fromColId)
  const toCol = columns.find((c) => c.id === toColId)
  if (!fromCol || !toCol) return columns

  const card = { ...fromCol.cards[fromIndex], listId: toColId }

  const newFromCards = [...fromCol.cards]
  newFromCards.splice(fromIndex, 1)

  const newToCards = [...toCol.cards]
  newToCards.splice(toIndex, 0, card)

  return columns.map((c) => {
    if (c.id === fromColId) return { ...c, cards: newFromCards }
    if (c.id === toColId) return { ...c, cards: newToCards }
    return c
  })
}

// ─── component ───────────────────────────────────────────────────────────────

export default function KanbanPage({ board, allBoards, syncVersion }: Props): JSX.Element {
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [epicFilter, setEpicFilter] = useState<string>('') // '' = all, '__none__' = no epic, epicCardId = specific epic
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [boardMembers, setBoardMembers] = useState<TrelloMember[]>([])
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Multi-select state (story boards only)
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const [bulkEpicDropdownOpen, setBulkEpicDropdownOpen] = useState(false)
  const bulkEpicDropdownRef = useRef<HTMLDivElement>(null)

  // Is this board a story board (has a linked epic board)?
  const isStoryBoard = !!board.epicBoardId
  // Is this board acting as an epic board for some other board?
  const isEpicBoard = allBoards.some((b) => b.epicBoardId === board.boardId)

  // Epic card options (loaded when this is a story board)
  const [epicCardOptions, setEpicCardOptions] = useState<EpicCardOption[]>([])

  // Epic stories modal state (for double-click on epic board)
  const [epicStoriesCard, setEpicStoriesCard] = useState<{
    id: string
    name: string
  } | null>(null)
  const [epicStories, setEpicStories] = useState<EpicStory[] | null>(null)
  const [epicStoriesLoading, setEpicStoriesLoading] = useState(false)

  // Epic assignment dropdown state
  const [epicDropdownCardId, setEpicDropdownCardId] = useState<string | null>(null)

  const loadBoardData = useCallback(async () => {
    const [dataResult, membersResult] = await Promise.all([
      api.trello.getBoardData(board.boardId),
      api.trello.getBoardMembers(board.boardId)
    ])
    if (dataResult.success && dataResult.data) {
      setColumns(dataResult.data)
      setError(null)
    } else {
      setError(dataResult.error ?? 'Failed to load board data.')
    }
    if (membersResult.success && membersResult.data) {
      setBoardMembers(membersResult.data)
    }
    setLoading(false)
  }, [board.boardId, syncVersion])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSelectedCardIds(new Set())
    loadBoardData()
  }, [loadBoardData])

  // Load epic card options when this is a story board
  useEffect(() => {
    setEpicFilter('')
    if (!isStoryBoard) return
    api.epics.getCards(board.boardId).then((result) => {
      if (result.success && result.data) setEpicCardOptions(result.data)
    })
  }, [board.boardId, isStoryBoard])

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result

      if (!destination) return
      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return
      }

      const fromColId = source.droppableId
      const toColId = destination.droppableId

      // ── Optimistic update ──
      if (fromColId === toColId) {
        // Reorder within the same column — optimistically update UI and persist new pos
        const col = columns.find((c) => c.id === fromColId)
        if (!col) return

        const newCards = reorderCards(col.cards, source.index, destination.index)

        // Compute a midpoint pos so the order survives a page reload.
        // 65536 matches Trello's default gap: new cards get pos = 65536,
        // and cards moved to the top get pos = previous_top / 2.
        const prev = destination.index > 0 ? newCards[destination.index - 1] : null
        const next =
          destination.index < newCards.length - 1 ? newCards[destination.index + 1] : null
        const newPos =
          prev && next
            ? (prev.pos + next.pos) / 2 // between neighbours
            : prev
              ? prev.pos + 65536 // after the last card
              : next
                ? next.pos / 2 // before the first card
                : 65536 // only card in the column

        setColumns((prev) =>
          prev.map((c) =>
            c.id === fromColId
              ? {
                  ...c,
                  cards: newCards.map((card, i) =>
                    i === destination.index ? { ...card, pos: newPos } : card
                  )
                }
              : c
          )
        )

        api.trello.updateCardPos(board.boardId, draggableId, newPos)
        return
      }

      // Move to a different column
      const toCol = columns.find((c) => c.id === toColId)
      if (!toCol) return

      // Compute a stable pos for the new position in the target column so
      // Trello and the local DB stay in sync after cross-column moves.
      const destCards = toCol.cards
      const prevCard = destination.index > 0 ? destCards[destination.index - 1] : null
      const nextCard = destination.index < destCards.length ? destCards[destination.index] : null
      const newPos =
        prevCard && nextCard
          ? (prevCard.pos + nextCard.pos) / 2
          : prevCard
            ? prevCard.pos + 65536
            : nextCard
              ? nextCard.pos / 2
              : 65536

      const prevColumns = columns
      // Optimistically update UI: move card into new column with the computed pos
      setColumns((prev) => {
        const cols = moveCard(prev, fromColId, toColId, source.index, destination.index)
        return cols.map((c) =>
          c.id === toColId
            ? {
                ...c,
                cards: c.cards.map((card, i) =>
                  i === destination.index ? { ...card, pos: newPos } : card
                )
              }
            : c
        )
      })

      // ── Sync to Trello ──
      const syncResult = await api.trello.moveCard(board.boardId, draggableId, toColId, newPos)
      if (!syncResult.success) {
        // Revert optimistic update and show error
        setColumns(prevColumns)
        setToastMessage(syncResult.error ?? 'Failed to move card. Please try again.')
      }
    },
    [board.boardId, columns]
  )

  const [showTicketsModal, setShowTicketsModal] = useState(false)

  // Close modals on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTicketsModal(false)
        setEpicStoriesCard(null)
        setEpicDropdownCardId(null)
        setBulkEpicDropdownOpen(false)
        setSelectedCardIds(new Set())
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Open epic stories modal (double-click on epic board card)
  const handleOpenEpicStories = useCallback(async (cardId: string, cardName: string) => {
    setEpicStoriesCard({ id: cardId, name: cardName })
    setEpicStories(null)
    setEpicStoriesLoading(true)
    const result = await api.epics.getStories(cardId)
    setEpicStoriesLoading(false)
    if (result.success && result.data) {
      setEpicStories(result.data)
    }
  }, [])

  // Assign or clear an epic for a story card
  const handleSetCardEpic = useCallback(
    async (cardId: string, epicCardId: string | null) => {
      setEpicDropdownCardId(null)
      await api.epics.setCardEpic(board.boardId, cardId, epicCardId)
      // Optimistically update local state
      const epicName = epicCardId
        ? (epicCardOptions.find((o) => o.id === epicCardId)?.name ?? null)
        : null
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            c.id === cardId ? { ...c, epicCardId: epicCardId, epicCardName: epicName } : c
          )
        }))
      )
    },
    [board.boardId, epicCardOptions]
  )

  // Toggle selection of a single card
  const handleToggleSelectCard = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }, [])

  // Assign or clear an epic for all currently selected cards
  const handleBulkSetEpic = useCallback(
    async (epicCardId: string | null) => {
      setBulkEpicDropdownOpen(false)
      const cardIds = Array.from(selectedCardIds)
      const epicName = epicCardId
        ? (epicCardOptions.find((o) => o.id === epicCardId)?.name ?? null)
        : null
      // Optimistic update
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            selectedCardIds.has(c.id) ? { ...c, epicCardId, epicCardName: epicName } : c
          )
        }))
      )
      setSelectedCardIds(new Set())
      const result = await api.epics.setBulkCardEpic(board.boardId, cardIds, epicCardId)
      if (!result.success) {
        loadBoardData()
        setToastMessage(result.error ?? 'Failed to update epic. Please try again.')
      }
    },
    [board.boardId, selectedCardIds, epicCardOptions, loadBoardData]
  )

  // Close bulk epic dropdown on outside click
  useEffect(() => {
    if (!bulkEpicDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (bulkEpicDropdownRef.current && !bulkEpicDropdownRef.current.contains(e.target as Node)) {
        setBulkEpicDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [bulkEpicDropdownOpen])

  // Close context menu on Escape or click outside
  useEffect(() => {
    if (!contextMenu) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [contextMenu])

  const handleArchiveCard = useCallback(
    async (cardId: string) => {
      setContextMenu(null)
      // Optimistically remove the card from the UI
      const prevColumns = columns
      setColumns((prev) =>
        prev.map((col) => ({ ...col, cards: col.cards.filter((c) => c.id !== cardId) }))
      )
      const result = await api.trello.archiveCard(board.boardId, cardId)
      if (!result.success) {
        setColumns(prevColumns)
        setToastMessage(result.error ?? 'Failed to archive card. Please try again.')
      }
    },
    [board.boardId, columns]
  )

  const handleToggleMember = useCallback(
    async (cardId: string, memberId: string, assign: boolean) => {
      setContextMenu(null)

      // Optimistically update the member list in the UI
      const prevColumns = columns
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: col.cards.map((c) => {
            if (c.id !== cardId) return c
            const updatedMembers = assign
              ? c.members.some((m) => m.id === memberId)
                ? c.members
                : [...c.members, ...boardMembers.filter((m) => m.id === memberId)]
              : c.members.filter((m) => m.id !== memberId)
            return { ...c, members: updatedMembers }
          })
        }))
      )

      const result = await api.trello.assignCardMember(board.boardId, cardId, memberId, assign)
      if (result.success && result.data) {
        // Reconcile with the authoritative response from the server
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            cards: col.cards.map((c) => (c.id === cardId ? { ...c, members: result.data! } : c))
          }))
        )
      } else {
        // Revert optimistic update on failure
        setColumns(prevColumns)
        setToastMessage(result.error ?? 'Failed to update member assignment. Please try again.')
      }
    },
    [board.boardId, boardMembers, columns]
  )

  // ── Render ────────────────────────────────────────────────────────────────

  const filteredColumns =
    searchQuery.trim() || epicFilter
      ? columns.map((col) => ({
          ...col,
          cards: col.cards.filter((card) => {
            if (searchQuery.trim() && !fuzzyMatch(searchQuery, `${card.name} ${card.desc}`))
              return false
            if (epicFilter === '__none__') return !card.epicCardId
            if (epicFilter) return card.epicCardId === epicFilter
            return true
          })
        }))
      : columns

  const selectedCardCount = useMemo(() => selectedCardIds.size, [selectedCardIds])

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
          <button className={styles.numberTicketsBtn} onClick={() => setShowTicketsModal(true)}>
            🎫 Number Tickets
          </button>
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
        {isStoryBoard && epicCardOptions.length > 0 && (
          <select
            className={styles.epicFilterSelect}
            value={epicFilter}
            onChange={(e) => setEpicFilter(e.target.value)}
            title="Filter by epic"
            aria-label="Filter cards by epic"
          >
            <option value="">⚡ All epics</option>
            <option value="__none__">— No epic</option>
            {epicCardOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        )}
        <button className={styles.numberTicketsBtn} onClick={() => setShowTicketsModal(true)}>
          🎫 Number Tickets
        </button>
      </div>
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
                        epicCardOptions={epicCardOptions}
                        epicDropdownCardId={epicDropdownCardId}
                        isSelected={selectedCardIds.has(card.id)}
                        onToggleSelect={handleToggleSelectCard}
                        onOpenEpicStories={handleOpenEpicStories}
                        onSetCardEpic={handleSetCardEpic}
                        onToggleEpicDropdown={(cardId) =>
                          setEpicDropdownCardId((prev) => (prev === cardId ? null : cardId))
                        }
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
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* ── Bulk action bar (shown when ≥1 card is selected on a story board) ── */}
      {isStoryBoard && selectedCardCount > 0 && (
        <div className={styles.bulkActionBar}>
          <span className={styles.bulkActionCount}>
            {selectedCardCount} card{selectedCardCount !== 1 ? 's' : ''} selected
          </span>
          <div className={styles.bulkActionControls}>
            <div ref={bulkEpicDropdownRef} className={styles.bulkEpicWrapper}>
              <button
                className={styles.bulkEpicBtn}
                onClick={() => setBulkEpicDropdownOpen((prev) => !prev)}
              >
                ⚡ Set Epic
              </button>
              {bulkEpicDropdownOpen && (
                <div className={styles.bulkEpicDropdown}>
                  <button
                    className={styles.bulkEpicDropdownItem}
                    onClick={() => handleBulkSetEpic(null)}
                  >
                    — None
                  </button>
                  {epicCardOptions.map((opt) => (
                    <button
                      key={opt.id}
                      className={styles.bulkEpicDropdownItem}
                      onClick={() => handleBulkSetEpic(opt.id)}
                    >
                      <span className={styles.epicDropdownName}>{opt.name}</span>
                      <span className={styles.epicDropdownList}>{opt.listName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className={styles.bulkClearBtn}
              onClick={() => setSelectedCardIds(new Set())}
              title="Clear selection (Esc)"
            >
              ✕ Clear
            </button>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => handleArchiveCard(contextMenu.card.id)}
          >
            🗄️ Archive card
          </button>
          {boardMembers.length > 0 && (
            <>
              <div className={styles.contextMenuDivider} />
              <div className={styles.contextMenuLabel}>Assign to:</div>
              {boardMembers.map((member) => {
                const assigned = contextMenu.card.members.some((m) => m.id === member.id)
                return (
                  <button
                    key={member.id}
                    className={styles.contextMenuItem}
                    onClick={() => handleToggleMember(contextMenu.card.id, member.id, !assigned)}
                  >
                    <span className={styles.contextMenuCheck}>{assigned ? '✓' : ''}</span>
                    {member.fullName}
                  </button>
                )
              })}
            </>
          )}
        </div>
      )}

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {ticketsModal}

      {/* ── Epic Stories Modal ── */}
      {epicStoriesCard && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setEpicStoriesCard(null)
            setEpicStories(null)
          }}
        >
          <div className={styles.epicModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.epicModalHeader}>
              <h2 className={styles.epicModalTitle}>
                📋 Stories for: <em>{epicStoriesCard.name}</em>
              </h2>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setEpicStoriesCard(null)
                  setEpicStories(null)
                }}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
            {epicStoriesLoading ? (
              <div className={styles.epicModalBody}>
                <div className="spinner" />
                <span>Loading stories…</span>
              </div>
            ) : epicStories && epicStories.length === 0 ? (
              <div className={styles.epicModalBody}>
                <p className={styles.epicEmptyState}>No stories assigned to this epic yet.</p>
              </div>
            ) : (
              <div className={styles.epicStoriesList}>
                {(epicStories ?? []).map((story) => (
                  <div key={story.id} className={styles.epicStoryItem}>
                    <div className={styles.epicStoryMeta}>
                      <span className={styles.epicStoryBoard}>{story.boardName}</span>
                      <span className={styles.epicStoryList}>{story.listName}</span>
                    </div>
                    <span className={styles.epicStoryName}>{story.name}</span>
                    {story.shortUrl && (
                      <a
                        href={story.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.trelloLink}
                        title="Open in Trello"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── draggable card sub-component ────────────────────────────────────────────

interface CardProps {
  card: KanbanCard
  index: number
  isStoryBoard: boolean
  isEpicBoard: boolean
  epicCardOptions: EpicCardOption[]
  epicDropdownCardId: string | null
  isSelected: boolean
  onToggleSelect: (cardId: string) => void
  onOpenEpicStories: (cardId: string, cardName: string) => void
  onSetCardEpic: (cardId: string, epicCardId: string | null) => void
  onToggleEpicDropdown: (cardId: string) => void
  onContextMenu: (e: React.MouseEvent) => void
}

function DraggableCard({
  card,
  index,
  isStoryBoard,
  isEpicBoard,
  epicCardOptions,
  epicDropdownCardId,
  isSelected,
  onToggleSelect,
  onOpenEpicStories,
  onSetCardEpic,
  onToggleEpicDropdown,
  onContextMenu
}: CardProps): JSX.Element {
  const lastClickRef = useRef<number>(0)

  const handleClick = () => {
    if (!isEpicBoard) return
    const now = Date.now()
    if (now - lastClickRef.current < 350) {
      // Double-click detected
      onOpenEpicStories(card.id, card.name)
    }
    lastClickRef.current = now
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${styles.card} ${snapshot.isDragging ? styles.cardDragging : ''} ${isSelected ? styles.cardSelected : ''}`}
          onClick={handleClick}
          onContextMenu={onContextMenu}
          title={isEpicBoard ? 'Double-click to see stories in this epic' : undefined}
        >
          <div className={styles.cardHeader}>
            <span className={styles.cardName}>{card.name}</span>
            {isStoryBoard && (
              <button
                className={`${styles.cardCheckbox} ${isSelected ? styles.cardCheckboxChecked : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelect(card.id)
                }}
                title={isSelected ? 'Deselect card' : 'Select card'}
                aria-label={isSelected ? 'Deselect card' : 'Select card'}
                aria-pressed={isSelected}
              >
                {isSelected ? '✓' : ''}
              </button>
            )}
          </div>

          {/* Epic label (story board only) */}
          {isStoryBoard && (
            <div className={styles.epicRow}>
              <button
                className={card.epicCardName ? styles.epicChip : styles.epicChipEmpty}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleEpicDropdown(card.id)
                }}
                title="Assign epic"
              >
                {card.epicCardName ? `⚡ ${card.epicCardName}` : '+ Epic'}
              </button>

              {epicDropdownCardId === card.id && (
                <div className={styles.epicDropdown} onClick={(e) => e.stopPropagation()}>
                  <button
                    className={styles.epicDropdownItem}
                    onClick={() => onSetCardEpic(card.id, null)}
                  >
                    — None
                  </button>
                  {epicCardOptions.map((opt) => (
                    <button
                      key={opt.id}
                      className={`${styles.epicDropdownItem} ${card.epicCardId === opt.id ? styles.epicDropdownItemActive : ''}`}
                      onClick={() => onSetCardEpic(card.id, opt.id)}
                    >
                      <span className={styles.epicDropdownName}>{opt.name}</span>
                      <span className={styles.epicDropdownList}>{opt.listName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Epic board hint */}
          {isEpicBoard && (
            <span className={styles.epicBoardHint}>⚡ Epic — double-click for stories</span>
          )}

          <div className={styles.cardFooter}>
            {card.labels.length > 0 && (
              <div className={styles.labels}>
                {card.labels.map((label) => (
                  <span
                    key={label.id}
                    className={styles.label}
                    style={{ background: labelColor(label.color) }}
                    title={label.name || label.color}
                  />
                ))}
              </div>
            )}

            <div className={styles.cardActions}>
              {card.members.length > 0 && (
                <div className={styles.members}>
                  {card.members.map((member) => (
                    <span key={member.id} className={styles.memberAvatar} title={member.fullName}>
                      {member.fullName.charAt(0).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              {card.shortUrl && (
                <a
                  href={card.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.trelloLink}
                  title="Open in Trello"
                  onClick={(e) => e.stopPropagation()}
                >
                  ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}

// ─── Trello label colour map ──────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  green: '#61bd4f',
  yellow: '#f2d600',
  orange: '#ff9f1a',
  red: '#eb5a46',
  purple: '#c377e0',
  blue: '#0079bf',
  sky: '#00c2e0',
  lime: '#51e898',
  pink: '#ff78cb',
  black: '#344563'
}

function labelColor(color: string): string {
  return LABEL_COLORS[color] ?? '#8892a4'
}

// ─── fuzzy matching ───────────────────────────────────────────────────────────

/** Returns true when every character of `needle` appears in `haystack` in order. */
function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = needle.toLowerCase()
  const h = haystack.toLowerCase()
  const nLen = n.length
  let ni = 0
  for (let i = 0; i < h.length && ni < nLen; i++) {
    if (h[i] === n[ni]) ni++
  }
  return ni === nLen
}
