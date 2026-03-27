import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd'
import type { BoardConfig } from '@shared/board.types'
import type { KanbanColumn, KanbanCard } from '@shared/trello.types'
import { api } from '../hooks/useApi'
import Toast from '../components/Toast'
import StrictModeDroppable from '../components/StrictModeDroppable'
import styles from './KanbanPage.module.css'

interface Props {
  board: BoardConfig
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

export default function KanbanPage({ board }: Props): JSX.Element {
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const loadBoardData = useCallback(async () => {
    const result = await api.trello.getBoardData(board.boardId)
    if (result.success && result.data) {
      setColumns(result.data)
      setError(null)
    } else {
      setError(result.error ?? 'Failed to load board data.')
    }
    setLoading(false)
  }, [board.boardId])

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadBoardData()
  }, [loadBoardData])

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
      const nextCard =
        destination.index < destCards.length ? destCards[destination.index] : null
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

  if (columns.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No data yet.</p>
        <p className="text-muted">
          Click <strong>↻ Fetch from Trello</strong> in the top bar to import this board&apos;s
          data.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📋 {board.boardName}</h1>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.board}>
          {columns.map((column) => (
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
                      <DraggableCard key={card.id} card={card} index={index} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  )
}

// ─── draggable card sub-component ────────────────────────────────────────────

interface CardProps {
  card: KanbanCard
  index: number
}

function DraggableCard({ card, index }: CardProps): JSX.Element {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${styles.card} ${snapshot.isDragging ? styles.cardDragging : ''}`}
        >
          <span className={styles.cardName}>{card.name}</span>

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
