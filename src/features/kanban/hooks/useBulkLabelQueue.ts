import { useCallback, useRef } from 'react'
import type { TrelloLabel } from '../../../trello/trello.types'
import { api } from '../../api/useApi'
import type { BulkLabelQueueItem, QueueItemStatus } from '../kanban.types'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  bulkLabelModalOpened,
  bulkLabelModalClosed,
  bulkLabelModalUpdated,
  cardLabelsUpdated,
  selectionCleared
} from '../kanbanSlice'

export function useBulkLabelQueue(boardId: string) {
  const dispatch = useAppDispatch()
  const bulkLabelModal = useAppSelector((s) => s.kanban.bulkLabelModal)
  const boardLabels = useAppSelector((s) => s.kanban.boardLabels)
  const columns = useAppSelector((s) => s.kanban.columns)
  const selectedCardIds = useAppSelector((s) => s.kanban.selectedCardIds)
  const bulkLabelTextareaRef = useRef<HTMLTextAreaElement>(null)

  const handleOpenBulkLabelFromBar = useCallback(() => {
    dispatch(
      bulkLabelModalOpened({
        selectedLabelIds: [],
        text: '',
        queue: null,
        uploading: false,
        fromSelection: true
      })
    )
  }, [dispatch])

  const handleCloseBulkLabel = useCallback(() => {
    dispatch(bulkLabelModalClosed())
  }, [dispatch])

  const handleTextChange = useCallback(
    (text: string) => {
      if (!bulkLabelModal) return
      dispatch(bulkLabelModalUpdated({ ...bulkLabelModal, text }))
    },
    [bulkLabelModal, dispatch]
  )

  const handleToggleBulkLabelSelection = useCallback(
    (labelId: string) => {
      if (!bulkLabelModal) return
      const current = bulkLabelModal.selectedLabelIds
      const next = current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId]
      dispatch(bulkLabelModalUpdated({ ...bulkLabelModal, selectedLabelIds: next }))
    },
    [bulkLabelModal, dispatch]
  )

  const handleStartBulkLabel = useCallback(() => {
    if (!bulkLabelModal) return
    const allCards = columns.flatMap((col) => col.cards)

    let queue: BulkLabelQueueItem[]

    if (bulkLabelModal.fromSelection) {
      const cardMap = new Map(allCards.map((c) => [c.id, c]))
      queue = selectedCardIds.map((cardId) => {
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
      const names = bulkLabelModal.text
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

    dispatch(bulkLabelModalUpdated({ ...bulkLabelModal, queue }))
  }, [bulkLabelModal, columns, selectedCardIds, dispatch])

  const handleRunBulkLabel = useCallback(async () => {
    if (!bulkLabelModal?.queue) return

    const snapshot = { ...bulkLabelModal }
    let currentQueue = [...snapshot.queue!]
    dispatch(bulkLabelModalUpdated({ ...snapshot, queue: currentQueue, uploading: true }))

    const selectedLabelIdSet = new Set(snapshot.selectedLabelIds)
    const selectedLabels = boardLabels.filter((l) => selectedLabelIdSet.has(l.id))

    for (let i = 0; i < currentQueue.length; i++) {
      const item = currentQueue[i]
      if (item.notFound || item.status === 'failed') continue

      // Mark running
      currentQueue = currentQueue.map((q) =>
        q.id === item.id ? { ...q, status: 'running' as QueueItemStatus } : q
      )
      dispatch(bulkLabelModalUpdated({ ...snapshot, queue: currentQueue, uploading: true }))

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
        dispatch(cardLabelsUpdated({ cardId: item.cardId, labels: finalLabels }))
      }

      // Mark done or failed
      currentQueue = currentQueue.map((q) =>
        q.id === item.id
          ? { ...q, status: success ? ('done' as QueueItemStatus) : ('failed' as QueueItemStatus) }
          : q
      )
      dispatch(bulkLabelModalUpdated({ ...snapshot, queue: currentQueue, uploading: true }))

      if (i < currentQueue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    dispatch(bulkLabelModalUpdated({ ...snapshot, queue: currentQueue, uploading: false }))
    if (snapshot.fromSelection) {
      dispatch(selectionCleared())
    }
  }, [boardId, boardLabels, bulkLabelModal, dispatch])

  const handleBulkLabelRetryItem = useCallback(
    (itemId: string) => {
      if (!bulkLabelModal?.queue) return
      const updated = bulkLabelModal.queue.map((q) =>
        q.id === itemId && !q.notFound ? { ...q, status: 'pending' as QueueItemStatus } : q
      )
      dispatch(bulkLabelModalUpdated({ ...bulkLabelModal, queue: updated }))
    },
    [bulkLabelModal, dispatch]
  )

  const handleBulkLabelRetryAllFailed = useCallback(() => {
    if (!bulkLabelModal?.queue) return
    const updated = bulkLabelModal.queue.map((q) =>
      q.status === 'failed' && !q.notFound ? { ...q, status: 'pending' as QueueItemStatus } : q
    )
    dispatch(bulkLabelModalUpdated({ ...bulkLabelModal, queue: updated }))
  }, [bulkLabelModal, dispatch])

  // Convert store array to Set for components that expect Set<string>
  const bulkLabelModalForComponent = bulkLabelModal
    ? {
        ...bulkLabelModal,
        selectedLabelIds: new Set(bulkLabelModal.selectedLabelIds)
      }
    : null

  return {
    bulkLabelModal: bulkLabelModalForComponent,
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
