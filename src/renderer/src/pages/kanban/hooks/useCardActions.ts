import { useState, useCallback } from 'react'
import type { KanbanColumn, TrelloLabel, TrelloMember } from '@shared/trello.types'
import { api } from '../../../hooks/useApi'
import type { ContextMenuState } from '../kanban.types'

export function useCardActions(
  boardId: string,
  columns: KanbanColumn[],
  boardMembers: TrelloMember[],
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>,
  setToastMessage: (msg: string | null) => void
) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const handleArchiveCard = useCallback(
    async (cardId: string) => {
      setContextMenu(null)
      // Optimistically remove the card from the UI
      const prevColumns = columns
      setColumns((prev) =>
        prev.map((col) => ({ ...col, cards: col.cards.filter((c) => c.id !== cardId) }))
      )
      const result = await api.trello.archiveCard(boardId, cardId)
      if (!result.success) {
        setColumns(prevColumns)
        setToastMessage(result.error ?? 'Failed to archive card. Please try again.')
      }
    },
    [boardId, columns, setColumns, setToastMessage]
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

      const result = await api.trello.assignCardMember(boardId, cardId, memberId, assign)
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
    [boardId, boardMembers, columns, setColumns, setToastMessage]
  )

  const handleToggleLabel = useCallback(
    async (cardId: string, label: TrelloLabel, assign: boolean) => {
      setContextMenu(null)

      // Optimistically update the label list in the UI
      const prevColumns = columns
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: col.cards.map((c) => {
            if (c.id !== cardId) return c
            const updatedLabels = assign
              ? c.labels.some((l) => l.id === label.id)
                ? c.labels
                : [...c.labels, label]
              : c.labels.filter((l) => l.id !== label.id)
            return { ...c, labels: updatedLabels }
          })
        }))
      )

      const result = await api.trello.assignCardLabel(boardId, cardId, label, assign)
      if (result.success && result.data) {
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            cards: col.cards.map((c) => (c.id === cardId ? { ...c, labels: result.data! } : c))
          }))
        )
      } else {
        setColumns(prevColumns)
        setToastMessage(result.error ?? 'Failed to update label assignment. Please try again.')
      }
    },
    [boardId, columns, setColumns, setToastMessage]
  )

  return {
    contextMenu,
    setContextMenu,
    handleArchiveCard,
    handleToggleMember,
    handleToggleLabel
  }
}
