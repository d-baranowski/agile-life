import { useCallback } from 'react'
import type { DropResult } from 'react-beautiful-dnd'
import type { KanbanColumn } from '@shared/trello.types'
import type { StoryPointRule } from '@shared/board.types'
import { api } from '../../../hooks/useApi'
import { cardStoryPoints } from '../../../lib/card-story-points'
import { reorderCards } from '../../../lib/reorder-cards'
import { moveCard } from '../../../lib/move-card'
import { triggerDoneEffect } from '../../../lib/confetti'

export function useDragDrop(
  boardId: string,
  columns: KanbanColumn[],
  doneListNames: string[],
  storyPointsConfig: StoryPointRule[],
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>,
  setToastMessage: (msg: string | null) => void,
  lastPointerPos: React.RefObject<{ x: number; y: number }>
) {
  return useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result
      if (!destination) return
      if (destination.droppableId === source.droppableId && destination.index === source.index)
        return

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
        triggerDoneEffect(points, lastPointerPos.current)
      }

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

      const syncResult = await api.trello.moveCard(boardId, draggableId, toColId, newPos)
      if (!syncResult.success) {
        setColumns(prevColumns)
        setToastMessage(syncResult.error ?? 'Failed to move card. Please try again.')
      }
    },
    [
      boardId,
      doneListNames,
      storyPointsConfig,
      columns,
      setColumns,
      setToastMessage,
      lastPointerPos
    ]
  )
}
