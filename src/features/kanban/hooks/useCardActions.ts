import { useCallback } from 'react'
import type { TrelloLabel } from '../../../trello/trello.types'
import { api } from '../../api/useApi'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  contextMenuOpened,
  contextMenuClosed,
  columnsUpdated,
  cardRemovedFromColumn,
  cardMembersUpdated,
  cardLabelsUpdated,
  cardNameUpdated,
  kanbanToastShown
} from '../kanbanSlice'
import type { ContextMenuState } from '../kanban.types'

export function useCardActions(boardId: string) {
  const dispatch = useAppDispatch()
  const columns = useAppSelector((s) => s.kanban.columns)
  const boardMembers = useAppSelector((s) => s.kanban.boardMembers)
  const contextMenu = useAppSelector((s) => s.kanban.contextMenu)

  const handleOpenContextMenu = useCallback(
    (menu: ContextMenuState) => {
      dispatch(contextMenuOpened(menu))
    },
    [dispatch]
  )

  const handleCloseContextMenu = useCallback(() => {
    dispatch(contextMenuClosed())
  }, [dispatch])

  const handleArchiveCard = useCallback(
    async (cardId: string) => {
      dispatch(contextMenuClosed())
      // Save a snapshot for rollback
      const prevColumns = columns
      // Optimistically remove the card from the UI
      dispatch(cardRemovedFromColumn(cardId))
      const result = await api.trello.archiveCard(boardId, cardId)
      if (!result.success) {
        dispatch(columnsUpdated(prevColumns))
        dispatch(kanbanToastShown(result.error ?? 'Failed to archive card. Please try again.'))
      }
    },
    [boardId, columns, dispatch]
  )

  const handleToggleMember = useCallback(
    async (cardId: string, memberId: string, assign: boolean) => {
      dispatch(contextMenuClosed())

      // Optimistically update the member list in the UI
      const prevColumns = columns
      const card = columns.flatMap((c) => c.cards).find((c) => c.id === cardId)
      if (card) {
        const updatedMembers = assign
          ? card.members.some((m) => m.id === memberId)
            ? card.members
            : [...card.members, ...boardMembers.filter((m) => m.id === memberId)]
          : card.members.filter((m) => m.id !== memberId)
        dispatch(cardMembersUpdated({ cardId, members: updatedMembers }))
      }

      const result = await api.trello.assignCardMember(boardId, cardId, memberId, assign)
      if (result.success && result.data) {
        // Reconcile with the authoritative response from the server
        dispatch(cardMembersUpdated({ cardId, members: result.data }))
      } else {
        // Revert optimistic update on failure
        dispatch(columnsUpdated(prevColumns))
        dispatch(
          kanbanToastShown(result.error ?? 'Failed to update member assignment. Please try again.')
        )
      }
    },
    [boardId, boardMembers, columns, dispatch]
  )

  const handleToggleLabel = useCallback(
    async (cardId: string, label: TrelloLabel, assign: boolean) => {
      dispatch(contextMenuClosed())

      // Optimistically update the label list in the UI
      const prevColumns = columns
      const card = columns.flatMap((c) => c.cards).find((c) => c.id === cardId)
      if (card) {
        const updatedLabels = assign
          ? card.labels.some((l) => l.id === label.id)
            ? card.labels
            : [...card.labels, label]
          : card.labels.filter((l) => l.id !== label.id)
        dispatch(cardLabelsUpdated({ cardId, labels: updatedLabels }))
      }

      const result = await api.trello.assignCardLabel(boardId, cardId, label, assign)
      if (result.success && result.data) {
        dispatch(cardLabelsUpdated({ cardId, labels: result.data }))
      } else {
        dispatch(columnsUpdated(prevColumns))
        dispatch(
          kanbanToastShown(result.error ?? 'Failed to update label assignment. Please try again.')
        )
      }
    },
    [boardId, columns, dispatch]
  )

  const handleRenameCard = useCallback(
    async (cardId: string, name: string) => {
      // Optimistically update the name in the UI
      const prevColumns = columns
      dispatch(cardNameUpdated({ cardId, name }))

      const result = await api.trello.updateCardName(boardId, cardId, name)
      if (!result.success) {
        // Revert optimistic update on failure
        dispatch(columnsUpdated(prevColumns))
        dispatch(kanbanToastShown(result.error ?? 'Failed to rename card. Please try again.'))
      }
    },
    [boardId, columns, dispatch]
  )

  return {
    contextMenu,
    handleOpenContextMenu,
    handleCloseContextMenu,
    handleArchiveCard,
    handleToggleMember,
    handleToggleLabel,
    handleRenameCard
  }
}
