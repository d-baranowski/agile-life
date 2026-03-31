import { useCallback, useRef, useEffect } from 'react'
import type { KanbanCard } from '../../../trello/trello.types'
import type { QueueItemStatus, BulkArchiveQueueItem, BulkMemberQueueItem } from '../kanban.types'
import { api } from '../../api/useApi'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  cardToggleSelected,
  selectionCleared,
  bulkCardEpicUpdated,
  bulkEpicDropdownToggled,
  bulkEpicDropdownClosed,
  bulkEpicSearchChanged,
  bulkMemberDropdownToggled,
  bulkMemberDropdownClosed,
  bulkArchiveModalOpened,
  bulkArchiveModalClosed,
  bulkArchiveModalUpdated,
  bulkMemberModalOpened,
  bulkMemberModalClosed,
  bulkMemberModalUpdated,
  cardRemovedFromColumn,
  cardMembersUpdated,
  cardsAddedToColumn,
  kanbanToastShown,
  fetchBoardData
} from '../kanbanSlice'

/** Delay between sequential Trello API requests to avoid 429 rate-limiting. */
const BULK_DELAY_MS = 350

export function useBulkActions(boardId: string) {
  const dispatch = useAppDispatch()
  const columns = useAppSelector((s) => s.kanban.columns)
  const selectedCardIds = useAppSelector((s) => s.kanban.selectedCardIds)
  const epicCardOptions = useAppSelector((s) => s.kanban.epicCardOptions)
  const bulkEpicDropdownOpen = useAppSelector((s) => s.kanban.bulkEpicDropdownOpen)
  const bulkEpicSearch = useAppSelector((s) => s.kanban.bulkEpicSearch)
  const bulkMemberDropdownOpen = useAppSelector((s) => s.kanban.bulkMemberDropdownOpen)
  const bulkArchiveModal = useAppSelector((s) => s.kanban.bulkArchiveModal)
  const bulkMemberModal = useAppSelector((s) => s.kanban.bulkMemberModal)

  const bulkEpicDropdownRef = useRef<HTMLDivElement>(null)
  const bulkMemberDropdownRef = useRef<HTMLDivElement>(null)

  const selectedCardIdSet = new Set(selectedCardIds)

  const handleToggleSelectCard = useCallback(
    (cardId: string) => {
      dispatch(cardToggleSelected(cardId))
    },
    [dispatch]
  )

  const handleBulkSetEpic = useCallback(
    async (epicCardId: string | null) => {
      dispatch(bulkEpicDropdownClosed())
      const cardIds = [...selectedCardIds]
      const epicName = epicCardId
        ? (epicCardOptions.find((o) => o.id === epicCardId)?.name ?? null)
        : null
      dispatch(bulkCardEpicUpdated({ cardIds, epicCardId, epicCardName: epicName }))
      dispatch(selectionCleared())
      const result = await api.epics.setBulkCardEpic(boardId, cardIds, epicCardId)
      if (!result.success) {
        dispatch(fetchBoardData(boardId))
        dispatch(kanbanToastShown(result.error ?? 'Failed to update epic. Please try again.'))
      }
    },
    [boardId, selectedCardIds, epicCardOptions, dispatch]
  )

  // ── Bulk archive modal handlers ──────────────────────────────────────────

  const handleOpenBulkArchive = useCallback(() => {
    dispatch(bulkArchiveModalOpened())
  }, [dispatch])

  const handleStartBulkArchive = useCallback(async () => {
    const allCards = columns.flatMap((col) => col.cards)
    const cardMap = new Map(allCards.map((c) => [c.id, c]))
    const initialQueue: BulkArchiveQueueItem[] = selectedCardIds.map((cardId) => ({
      id: `archive-${cardId}`,
      cardId,
      cardName: cardMap.get(cardId)?.name ?? cardId,
      status: 'pending' as QueueItemStatus
    }))
    dispatch(bulkArchiveModalUpdated({ queue: initialQueue, running: true }))

    let currentQueue = [...initialQueue]

    for (let i = 0; i < initialQueue.length; i++) {
      const item = initialQueue[i]

      currentQueue = currentQueue.map((q) =>
        q.id === item.id ? { ...q, status: 'running' as QueueItemStatus } : q
      )
      dispatch(bulkArchiveModalUpdated({ queue: currentQueue, running: true }))

      const result = await api.trello.archiveCard(boardId, item.cardId)
      const success = result.success

      if (success) {
        dispatch(cardRemovedFromColumn(item.cardId))
      }

      currentQueue = currentQueue.map((q) =>
        q.id === item.id
          ? {
              ...q,
              status: success ? ('done' as QueueItemStatus) : ('failed' as QueueItemStatus)
            }
          : q
      )
      dispatch(bulkArchiveModalUpdated({ queue: currentQueue, running: true }))

      if (i < initialQueue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, BULK_DELAY_MS))
      }
    }

    dispatch(bulkArchiveModalUpdated({ queue: currentQueue, running: false }))
  }, [boardId, columns, selectedCardIds, dispatch])

  const handleRunBulkArchive = useCallback(async () => {
    if (!bulkArchiveModal?.queue) return

    const pendingItems = bulkArchiveModal.queue.filter((q) => q.status === 'pending')
    let currentQueue = [...bulkArchiveModal.queue]
    dispatch(bulkArchiveModalUpdated({ queue: currentQueue, running: true }))

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i]

      currentQueue = currentQueue.map((q) =>
        q.id === item.id ? { ...q, status: 'running' as QueueItemStatus } : q
      )
      dispatch(bulkArchiveModalUpdated({ queue: currentQueue, running: true }))

      const result = await api.trello.archiveCard(boardId, item.cardId)
      const success = result.success

      if (success) {
        dispatch(cardRemovedFromColumn(item.cardId))
      }

      currentQueue = currentQueue.map((q) =>
        q.id === item.id
          ? {
              ...q,
              status: success ? ('done' as QueueItemStatus) : ('failed' as QueueItemStatus)
            }
          : q
      )
      dispatch(bulkArchiveModalUpdated({ queue: currentQueue, running: true }))

      if (i < pendingItems.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, BULK_DELAY_MS))
      }
    }

    dispatch(bulkArchiveModalUpdated({ queue: currentQueue, running: false }))
  }, [boardId, bulkArchiveModal, dispatch])

  const handleCloseBulkArchive = useCallback(() => {
    dispatch(bulkArchiveModalClosed())
  }, [dispatch])

  const handleBulkArchiveRetryItem = useCallback(
    (itemId: string) => {
      if (!bulkArchiveModal?.queue) return
      dispatch(
        bulkArchiveModalUpdated({
          ...bulkArchiveModal,
          queue: bulkArchiveModal.queue.map((q) =>
            q.id === itemId ? { ...q, status: 'pending' as QueueItemStatus } : q
          )
        })
      )
    },
    [bulkArchiveModal, dispatch]
  )

  const handleBulkArchiveRetryAllFailed = useCallback(() => {
    if (!bulkArchiveModal?.queue) return
    dispatch(
      bulkArchiveModalUpdated({
        ...bulkArchiveModal,
        queue: bulkArchiveModal.queue.map((q) =>
          q.status === 'failed' ? { ...q, status: 'pending' as QueueItemStatus } : q
        )
      })
    )
  }, [bulkArchiveModal, dispatch])

  // ── Bulk member assignment modal handlers ─────────────────────────────────

  const handleOpenBulkMemberModal = useCallback(
    (memberId: string, memberName: string, assign: boolean) => {
      dispatch(bulkMemberModalOpened({ memberId, memberName, assign }))
    },
    [dispatch]
  )

  const handleStartBulkMember = useCallback(async () => {
    if (!bulkMemberModal) return
    const allCards = columns.flatMap((col) => col.cards)
    const cardMap = new Map(allCards.map((c) => [c.id, c]))
    const initialQueue: BulkMemberQueueItem[] = selectedCardIds.map((cardId) => ({
      id: `member-${cardId}`,
      cardId,
      cardName: cardMap.get(cardId)?.name ?? cardId,
      status: 'pending' as QueueItemStatus
    }))

    const { memberId, assign } = bulkMemberModal
    let currentQueue = [...initialQueue]
    dispatch(bulkMemberModalUpdated({ ...bulkMemberModal, queue: currentQueue, running: true }))

    for (let i = 0; i < initialQueue.length; i++) {
      const item = initialQueue[i]

      currentQueue = currentQueue.map((q) =>
        q.id === item.id ? { ...q, status: 'running' as QueueItemStatus } : q
      )
      dispatch(bulkMemberModalUpdated({ ...bulkMemberModal, queue: currentQueue, running: true }))

      const result = await api.trello.assignCardMember(boardId, item.cardId, memberId, assign)
      const success = result.success

      if (success && result.data) {
        dispatch(cardMembersUpdated({ cardId: item.cardId, members: result.data }))
      }

      currentQueue = currentQueue.map((q) =>
        q.id === item.id
          ? {
              ...q,
              status: success ? ('done' as QueueItemStatus) : ('failed' as QueueItemStatus)
            }
          : q
      )
      dispatch(bulkMemberModalUpdated({ ...bulkMemberModal, queue: currentQueue, running: true }))

      if (i < initialQueue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, BULK_DELAY_MS))
      }
    }

    dispatch(bulkMemberModalUpdated({ ...bulkMemberModal, queue: currentQueue, running: false }))
  }, [boardId, bulkMemberModal, columns, selectedCardIds, dispatch])

  const handleRunBulkMember = useCallback(async () => {
    if (!bulkMemberModal?.queue) return

    const pendingItems = bulkMemberModal.queue.filter((q) => q.status === 'pending')
    let currentQueue = [...bulkMemberModal.queue]
    dispatch(bulkMemberModalUpdated({ ...bulkMemberModal, queue: currentQueue, running: true }))

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i]

      currentQueue = currentQueue.map((q) =>
        q.id === item.id ? { ...q, status: 'running' as QueueItemStatus } : q
      )
      dispatch(bulkMemberModalUpdated({ ...bulkMemberModal, queue: currentQueue, running: true }))

      const result = await api.trello.assignCardMember(
        boardId,
        item.cardId,
        bulkMemberModal.memberId,
        bulkMemberModal.assign
      )
      const success = result.success

      if (success && result.data) {
        dispatch(cardMembersUpdated({ cardId: item.cardId, members: result.data }))
      }

      currentQueue = currentQueue.map((q) =>
        q.id === item.id
          ? {
              ...q,
              status: success ? ('done' as QueueItemStatus) : ('failed' as QueueItemStatus)
            }
          : q
      )
      dispatch(bulkMemberModalUpdated({ ...bulkMemberModal, queue: currentQueue, running: true }))

      if (i < pendingItems.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, BULK_DELAY_MS))
      }
    }

    dispatch(bulkMemberModalUpdated({ ...bulkMemberModal, queue: currentQueue, running: false }))
  }, [boardId, bulkMemberModal, dispatch])

  const handleCloseBulkMember = useCallback(() => {
    dispatch(bulkMemberModalClosed())
  }, [dispatch])

  const handleBulkMemberRetryItem = useCallback(
    (itemId: string) => {
      if (!bulkMemberModal?.queue) return
      dispatch(
        bulkMemberModalUpdated({
          ...bulkMemberModal,
          queue: bulkMemberModal.queue.map((q) =>
            q.id === itemId ? { ...q, status: 'pending' as QueueItemStatus } : q
          )
        })
      )
    },
    [bulkMemberModal, dispatch]
  )

  const handleBulkMemberRetryAllFailed = useCallback(() => {
    if (!bulkMemberModal?.queue) return
    dispatch(
      bulkMemberModalUpdated({
        ...bulkMemberModal,
        queue: bulkMemberModal.queue.map((q) =>
          q.status === 'failed' ? { ...q, status: 'pending' as QueueItemStatus } : q
        )
      })
    )
  }, [bulkMemberModal, dispatch])

  // Close bulk epic dropdown on outside click
  useEffect(() => {
    if (!bulkEpicDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (bulkEpicDropdownRef.current && !bulkEpicDropdownRef.current.contains(e.target as Node))
        dispatch(bulkEpicDropdownClosed())
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [bulkEpicDropdownOpen, dispatch])

  // Close bulk member dropdown on outside click
  useEffect(() => {
    if (!bulkMemberDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        bulkMemberDropdownRef.current &&
        !bulkMemberDropdownRef.current.contains(e.target as Node)
      ) {
        dispatch(bulkMemberDropdownClosed())
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [bulkMemberDropdownOpen, dispatch])

  const onCardsCreated = useCallback(
    (listId: string, cards: KanbanCard[]) => {
      dispatch(cardsAddedToColumn({ listId, cards }))
    },
    [dispatch]
  )

  return {
    selectedCardIds: selectedCardIdSet,
    setSelectedCardIds: (ids: Set<string>) => {
      if (ids.size === 0) dispatch(selectionCleared())
      // For non-empty sets, the only usage is clearing, so this is fine
    },
    bulkEpicDropdownOpen,
    setBulkEpicDropdownOpen: () => dispatch(bulkEpicDropdownToggled()),
    bulkEpicSearch,
    setBulkEpicSearch: (search: string) => dispatch(bulkEpicSearchChanged(search)),
    bulkEpicDropdownRef,
    bulkMemberDropdownOpen,
    setBulkMemberDropdownOpen: () => dispatch(bulkMemberDropdownToggled()),
    bulkMemberDropdownRef,
    bulkArchiveModal,
    bulkMemberModal,
    handleToggleSelectCard,
    handleBulkSetEpic,
    handleOpenBulkArchive,
    handleStartBulkArchive,
    handleRunBulkArchive,
    handleCloseBulkArchive,
    handleBulkArchiveRetryItem,
    handleBulkArchiveRetryAllFailed,
    handleOpenBulkMemberModal,
    handleStartBulkMember,
    handleRunBulkMember,
    handleCloseBulkMember,
    handleBulkMemberRetryItem,
    handleBulkMemberRetryAllFailed,
    onCardsCreated
  }
}
