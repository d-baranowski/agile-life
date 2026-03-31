import { useCallback, useRef, useEffect } from 'react'
import type { KanbanCard } from '../../../trello/trello.types'
import { parseCardNames } from '../parse-card-names'
import { api } from '../../api/useApi'
import type { QueueItem } from '../kanban.types'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { addCardOpened, addCardClosed, addCardModalUpdated } from '../kanbanSlice'

export function useAddCardQueue(boardId: string) {
  const dispatch = useAppDispatch()
  const addCardModal = useAppSelector((s) => s.kanban.addCardModal)
  const addCardTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Open the modal in edit phase for a given column
  const handleOpenAddCard = useCallback(
    (listId: string, listName: string) => {
      dispatch(addCardOpened({ listId, listName }))
    },
    [dispatch]
  )

  // Close the modal (blocked while uploading)
  const handleCloseAddCard = useCallback(() => {
    dispatch(addCardClosed())
  }, [dispatch])

  // Update textarea text
  const handleTextChange = useCallback(
    (text: string) => {
      if (!addCardModal) return
      dispatch(addCardModalUpdated({ ...addCardModal, text }))
    },
    [addCardModal, dispatch]
  )

  // Remove a line from the textarea by its index in the split array
  const handleRemovePreviewLine = useCallback(
    (lineIdx: number) => {
      if (!addCardModal) return
      const lines = addCardModal.text.split('\n')
      lines.splice(lineIdx, 1)
      dispatch(addCardModalUpdated({ ...addCardModal, text: lines.join('\n') }))
    },
    [addCardModal, dispatch]
  )

  // Remove an item from the queue (only in queue phase, only if not yet uploading)
  const handleRemoveQueueItem = useCallback(
    (itemId: string) => {
      if (!addCardModal || !addCardModal.queue || addCardModal.uploading) return
      dispatch(
        addCardModalUpdated({
          ...addCardModal,
          queue: addCardModal.queue.filter((q) => q.id !== itemId)
        })
      )
    },
    [addCardModal, dispatch]
  )

  // Core upload loop: process items sequentially with a 500 ms gap
  const runUpload = useCallback(
    async (
      listId: string,
      items: QueueItem[],
      modalSnapshot: NonNullable<typeof addCardModal>,
      onCardsCreated: (listId: string, cards: KanbanCard[]) => void
    ) => {
      const created: KanbanCard[] = []
      let currentQueue = modalSnapshot.queue
        ? [...modalSnapshot.queue]
        : items.map((i) => ({ ...i }))

      for (let i = 0; i < items.length; i++) {
        const item = items[i]

        // Mark item as running
        currentQueue = currentQueue.map((q) =>
          q.id === item.id ? { ...q, status: 'running' as const } : q
        )
        dispatch(addCardModalUpdated({ ...modalSnapshot, queue: currentQueue, uploading: true }))

        const result = await api.trello.createCard(boardId, listId, item.name)
        const succeeded = result.success && !!result.data

        if (succeeded && result.data) created.push(result.data)

        // Mark item as done or failed
        currentQueue = currentQueue.map((q) =>
          q.id === item.id
            ? { ...q, status: succeeded ? ('done' as const) : ('failed' as const) }
            : q
        )
        dispatch(addCardModalUpdated({ ...modalSnapshot, queue: currentQueue, uploading: true }))

        if (i < items.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      if (created.length > 0) {
        onCardsCreated(listId, created)
      }

      dispatch(addCardModalUpdated({ ...modalSnapshot, queue: currentQueue, uploading: false }))
    },
    [boardId, dispatch]
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

      const snapshot = { ...addCardModal, queue, uploading: true }
      dispatch(addCardModalUpdated(snapshot))

      await runUpload(listId, queue, snapshot, onCardsCreated)
    },
    [addCardModal, runUpload, dispatch]
  )

  // Retry a single failed item
  const handleRetryItem = useCallback(
    async (itemId: string, onCardsCreated: (listId: string, cards: KanbanCard[]) => void) => {
      if (!addCardModal?.queue || addCardModal.uploading) return
      const item = addCardModal.queue.find((q) => q.id === itemId)
      if (!item) return
      const { listId } = addCardModal

      const snapshot = { ...addCardModal, uploading: true }
      dispatch(addCardModalUpdated(snapshot))
      await runUpload(listId, [item], snapshot, onCardsCreated)
    },
    [addCardModal, runUpload, dispatch]
  )

  // Retry all failed items in the queue
  const handleRetryAllFailed = useCallback(
    async (onCardsCreated: (listId: string, cards: KanbanCard[]) => void) => {
      if (!addCardModal?.queue || addCardModal.uploading) return
      const failed = addCardModal.queue.filter((q) => q.status === 'failed')
      if (failed.length === 0) return
      const { listId } = addCardModal

      const snapshot = { ...addCardModal, uploading: true }
      dispatch(addCardModalUpdated(snapshot))
      await runUpload(listId, failed, snapshot, onCardsCreated)
    },
    [addCardModal, runUpload, dispatch]
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
