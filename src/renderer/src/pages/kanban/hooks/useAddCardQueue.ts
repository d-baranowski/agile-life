import { useState, useCallback, useRef, useEffect } from 'react'
import type { KanbanCard } from '@shared/trello.types'
import { parseCardNames } from '../../../lib/parse-card-names'
import { api } from '../../../hooks/useApi'
import type { AddCardModal, QueueItem } from '../kanban.types'

export function useAddCardQueue(boardId: string) {
  const [addCardModal, setAddCardModal] = useState<AddCardModal | null>(null)
  const addCardTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Open the modal in edit phase for a given column
  const handleOpenAddCard = useCallback((listId: string, listName: string) => {
    setAddCardModal({ listId, listName, text: '', queue: null, uploading: false })
  }, [])

  // Close the modal (blocked while uploading)
  const handleCloseAddCard = useCallback(() => {
    setAddCardModal((prev) => (prev?.uploading ? prev : null))
  }, [])

  // Update textarea text
  const handleTextChange = useCallback((text: string) => {
    setAddCardModal((prev) => (prev ? { ...prev, text } : null))
  }, [])

  // Remove a line from the textarea by its index in the split array
  const handleRemovePreviewLine = useCallback((lineIdx: number) => {
    setAddCardModal((prev) => {
      if (!prev) return null
      const lines = prev.text.split('\n')
      lines.splice(lineIdx, 1)
      return { ...prev, text: lines.join('\n') }
    })
  }, [])

  // Remove an item from the queue (only in queue phase, only if not yet uploading)
  const handleRemoveQueueItem = useCallback((itemId: string) => {
    setAddCardModal((prev) => {
      if (!prev || !prev.queue || prev.uploading) return prev
      return { ...prev, queue: prev.queue.filter((q) => q.id !== itemId) }
    })
  }, [])

  // Core upload loop: process items sequentially with a 500 ms gap
  const runUpload = useCallback(
    async (
      listId: string,
      items: QueueItem[],
      onCardsCreated: (listId: string, cards: KanbanCard[]) => void
    ) => {
      const created: KanbanCard[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]

        setAddCardModal((prev) =>
          prev
            ? {
                ...prev,
                queue:
                  prev.queue?.map((q) => (q.id === item.id ? { ...q, status: 'running' } : q)) ??
                  null
              }
            : null
        )

        const result = await api.trello.createCard(boardId, listId, item.name)
        const succeeded = result.success && !!result.data

        if (succeeded && result.data) created.push(result.data)

        setAddCardModal((prev) =>
          prev
            ? {
                ...prev,
                queue:
                  prev.queue?.map((q) =>
                    q.id === item.id ? { ...q, status: succeeded ? 'done' : 'failed' } : q
                  ) ?? null
              }
            : null
        )

        if (i < items.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      if (created.length > 0) {
        onCardsCreated(listId, created)
      }

      setAddCardModal((prev) => (prev ? { ...prev, uploading: false } : null))
    },
    [boardId]
  )

  // Convert textarea preview to queue items and start the upload
  const handleStartUpload = useCallback(
    async (onCardsCreated: (listId: string, cards: KanbanCard[]) => void) => {
      if (!addCardModal) return
      const { listId, text } = addCardModal

      const names = parseCardNames(text)
      if (names.length === 0) return

      const batch = Date.now()
      const queue: QueueItem[] = names.map((name, i) => ({
        id: `item-${batch}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        status: 'pending' as const
      }))

      setAddCardModal((prev) => (prev ? { ...prev, queue, uploading: true } : null))

      await runUpload(listId, queue, onCardsCreated)
    },
    [addCardModal, runUpload]
  )

  // Retry a single failed item
  const handleRetryItem = useCallback(
    async (itemId: string, onCardsCreated: (listId: string, cards: KanbanCard[]) => void) => {
      if (!addCardModal?.queue || addCardModal.uploading) return
      const item = addCardModal.queue.find((q) => q.id === itemId)
      if (!item) return
      const { listId } = addCardModal

      setAddCardModal((prev) => (prev ? { ...prev, uploading: true } : null))
      await runUpload(listId, [item], onCardsCreated)
    },
    [addCardModal, runUpload]
  )

  // Retry all failed items in the queue
  const handleRetryAllFailed = useCallback(
    async (onCardsCreated: (listId: string, cards: KanbanCard[]) => void) => {
      if (!addCardModal?.queue || addCardModal.uploading) return
      const failed = addCardModal.queue.filter((q) => q.status === 'failed')
      if (failed.length === 0) return
      const { listId } = addCardModal

      setAddCardModal((prev) => (prev ? { ...prev, uploading: true } : null))
      await runUpload(listId, failed, onCardsCreated)
    },
    [addCardModal, runUpload]
  )

  // Focus the textarea when the modal opens
  const addCardModalOpen = addCardModal !== null && addCardModal.queue === null
  useEffect(() => {
    if (addCardModalOpen && addCardTextareaRef.current) {
      addCardTextareaRef.current.focus()
    }
  }, [addCardModalOpen])

  return {
    addCardModal,
    addCardTextareaRef,
    handleOpenAddCard,
    handleCloseAddCard,
    handleTextChange,
    handleRemovePreviewLine,
    handleRemoveQueueItem,
    handleStartUpload,
    handleRetryItem,
    handleRetryAllFailed
  }
}
