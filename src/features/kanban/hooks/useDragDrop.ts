import { useCallback } from 'react'
import type { DropResult } from 'react-beautiful-dnd'
import type { StoryPointRule } from '../../../lib/board.types'
import { api } from '../../api/useApi'
import { cardStoryPoints } from '../card-story-points'
import { reorderCards } from '../reorder-cards'
import { moveCard } from '../move-card'
import { triggerDoneEffect } from '../confetti/confetti'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { columnsUpdated, kanbanToastShown, fetchGamificationStats } from '../kanbanSlice'
import { selectSelectedBoard } from '../../board-switcher/boardsSlice'

export function useDragDrop(
  boardId: string,
  doneListNames: string[],
  storyPointsConfig: StoryPointRule[],
  lastPointerPos: React.RefObject<{ x: number; y: number }>,
  onReorderColumn: (fromIndex: number, toIndex: number) => Promise<void>
) {
  const dispatch = useAppDispatch()
  const columns = useAppSelector((s) => s.kanban.columns)
  const selectedBoard = useAppSelector(selectSelectedBoard)
  const myMemberId = selectedBoard?.myMemberId ?? null

  return useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId, type } = result
      if (!destination) return
      if (destination.droppableId === source.droppableId && destination.index === source.index)
        return

      // ── Column reorder ────────────────────────────────────────────────────
      if (type === 'COLUMN') {
        await onReorderColumn(source.index, destination.index)
        return
      }

      // ── Card move ─────────────────────────────────────────────────────────
      const fromColId = source.droppableId
      const toColId = destination.droppableId

      if (fromColId === toColId) {
        const col = columns.find((c) => c.id === fromColId)
        if (!col) return
        const newCards = reorderCards(col.cards, source.index, destination.index)
        const prev = destination.index > 0 ? newCards[destination.index - 1] : null
        const next =
          destination.index < newCards.length - 1 ? newCards[destination.index + 1] : null
        const newPos =
          prev && next
            ? (prev.pos + next.pos) / 2
            : prev
              ? prev.pos + 65536
              : next
                ? next.pos / 2
                : 65536
        dispatch(
          columnsUpdated(
            columns.map((c) =>
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
        )
        api.trello.updateCardPos(boardId, draggableId, newPos)
        return
      }

      const toCol = columns.find((c) => c.id === toColId)
      if (!toCol) return
      const fromCol = columns.find((c) => c.id === fromColId)
      const movedCard = fromCol?.cards[source.index]
      const isDoneMove = doneListNames.some(
        (name) => name.trim().toLowerCase() === toCol.name.trim().toLowerCase()
      )
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

      if (isDoneMove && movedCard) {
        const points = cardStoryPoints(movedCard, storyPointsConfig)
        triggerDoneEffect(points, lastPointerPos.current ?? undefined)
      }

      const movedColumns = moveCard(columns, fromColId, toColId, source.index, destination.index)
      dispatch(
        columnsUpdated(
          movedColumns.map((c) =>
            c.id === toColId
              ? {
                  ...c,
                  cards: c.cards.map((card, i) =>
                    i === destination.index ? { ...card, pos: newPos } : card
                  )
                }
              : c
          )
        )
      )

      const syncResult = await api.trello.moveCard(boardId, draggableId, toColId, newPos)
      if (!syncResult.success) {
        dispatch(columnsUpdated(prevColumns))
        dispatch(kanbanToastShown(syncResult.error ?? 'Failed to move card. Please try again.'))
        return
      }

      // If the move changes whether the card is in a done column, refresh score.
      // This is intentionally best-effort; gamification is only available when
      // myMemberId is configured for this board.
      const fromColName = fromCol?.name ?? ''
      const fromWasDone = doneListNames.some(
        (name) => name.trim().toLowerCase() === fromColName.trim().toLowerCase()
      )
      if (myMemberId && fromWasDone !== isDoneMove) {
        dispatch(
          fetchGamificationStats({
            boardId,
            myMemberId,
            storyPointsConfig
          })
        )
      }
    },
    [
      boardId,
      doneListNames,
      storyPointsConfig,
      columns,
      dispatch,
      lastPointerPos,
      myMemberId,
      onReorderColumn
    ]
  )
}
