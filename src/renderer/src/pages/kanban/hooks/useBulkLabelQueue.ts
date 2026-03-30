import { useState, useCallback, useRef } from 'react'
import type { KanbanColumn, TrelloLabel } from '@shared/trello.types'
import { api } from '../../../hooks/useApi'
import type { BulkLabelModal, BulkLabelQueueItem, QueueItemStatus } from '../kanban.types'

export function useBulkLabelQueue(
  boardId: string,
  boardLabels: TrelloLabel[],
  columns: KanbanColumn[],
  selectedCardIds: Set<string>,
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>,
  setSelectedCardIds: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  const [bulkLabelModal, setBulkLabelModal] = useState<BulkLabelModal | null>(null)
  const bulkLabelTextareaRef = useRef<HTMLTextAreaElement>(null)

  const handleOpenBulkLabelFromBar = useCallback(() => {
    setBulkLabelModal({
      selectedLabelIds: new Set(),
      text: '',
      queue: null,
      uploading: false,
      fromSelection: true
    })
  }, [])

  const handleCloseBulkLabel = useCallback(() => {
    setBulkLabelModal((prev) => (prev?.uploading ? prev : null))
  }, [])

  const handleTextChange = useCallback((text: string) => {
    setBulkLabelModal((prev) => (prev ? { ...prev, text } : null))
  }, [])

  const handleToggleBulkLabelSelection = useCallback((labelId: string) => {
    setBulkLabelModal((prev) => {
      if (!prev) return null
      const next = new Set(prev.selectedLabelIds)
      if (next.has(labelId)) {
        next.delete(labelId)
      } else {
        next.add(labelId)
      }
      return { ...prev, selectedLabelIds: next }
    })
  }, [])

  const handleStartBulkLabel = useCallback(() => {
    setBulkLabelModal((prev) => {
      if (!prev) return null
      const allCards = columns.flatMap((col) => col.cards)

      let queue: BulkLabelQueueItem[]

      if (prev.fromSelection) {
        const cardMap = new Map(allCards.map((c) => [c.id, c]))
        queue = Array.from(selectedCardIds).map((cardId) => {
          const card = cardMap.get(cardId)
          return {
            id: `${Date.now()}-${Math.random()}`,
            cardId,
            cardName: card?.name ?? cardId,
            status: 'pending' as QueueItemStatus,
            notFound: false
          }
        })
      } else {
        const cardsByName = new Map(allCards.map((c) => [c.name.toLowerCase(), c]))
        const names = prev.text
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
        queue = names.map((name) => {
          const card = cardsByName.get(name.toLowerCase())
          return {
            id: `${Date.now()}-${Math.random()}`,
            cardId: card?.id ?? '',
            cardName: name,
            status: card ? 'pending' : ('failed' as QueueItemStatus),
            notFound: !card
          }
        })
      }

      return { ...prev, queue }
    })
  }, [columns, selectedCardIds])

  const handleRunBulkLabel = useCallback(async () => {
    setBulkLabelModal((prev) => (prev ? { ...prev, uploading: true } : null))

    const snapshot = bulkLabelModal
    if (!snapshot?.queue) return

    const selectedLabels = boardLabels.filter((l) => snapshot.selectedLabelIds.has(l.id))

    for (let i = 0; i < snapshot.queue.length; i++) {
      const item = snapshot.queue[i]
      if (item.notFound || item.status === 'failed') continue

      setBulkLabelModal((prev) => {
        if (!prev?.queue) return prev
        return {
          ...prev,
          queue: prev.queue.map((q) => (q.id === item.id ? { ...q, status: 'running' } : q))
        }
      })

      let success = true
      let finalLabels: TrelloLabel[] | null = null
      for (const label of selectedLabels) {
        const result = await api.trello.assignCardLabel(boardId, item.cardId, label, true)
        if (!result.success) {
          success = false
          break
        }
        if (result.data) finalLabels = result.data
      }

      if (finalLabels) {
        const labelsSnapshot = finalLabels
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === item.cardId ? { ...c, labels: labelsSnapshot } : c
            )
          }))
        )
      }

      setBulkLabelModal((prev) => {
        if (!prev?.queue) return prev
        return {
          ...prev,
          queue: prev.queue.map((q) =>
            q.id === item.id ? { ...q, status: success ? 'done' : 'failed' } : q
          )
        }
      })

      if (i < snapshot.queue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    setBulkLabelModal((prev) => (prev ? { ...prev, uploading: false } : null))
    if (snapshot.fromSelection) {
      setSelectedCardIds(new Set())
    }
  }, [boardId, boardLabels, bulkLabelModal, setColumns, setSelectedCardIds])

  const handleBulkLabelRetryItem = useCallback((itemId: string) => {
    setBulkLabelModal((prev) => {
      if (!prev?.queue) return prev
      const updated = prev.queue.map((q) =>
        q.id === itemId && !q.notFound ? { ...q, status: 'pending' as QueueItemStatus } : q
      )
      return { ...prev, queue: updated }
    })
  }, [])

  const handleBulkLabelRetryAllFailed = useCallback(() => {
    setBulkLabelModal((prev) => {
      if (!prev?.queue) return prev
      const updated = prev.queue.map((q) =>
        q.status === 'failed' && !q.notFound ? { ...q, status: 'pending' as QueueItemStatus } : q
      )
      return { ...prev, queue: updated }
    })
  }, [])

  return {
    bulkLabelModal,
    bulkLabelTextareaRef,
    handleOpenBulkLabelFromBar,
    handleCloseBulkLabel,
    handleBulkLabelTextChange: handleTextChange,
    handleToggleBulkLabelSelection,
    handleStartBulkLabel,
    handleRunBulkLabel,
    handleBulkLabelRetryItem,
    handleBulkLabelRetryAllFailed
  }
}
