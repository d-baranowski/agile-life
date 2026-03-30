import { useState, useCallback, useRef, useEffect } from 'react'
import type { KanbanColumn, KanbanCard, TrelloMember } from '@shared/trello.types'
import type { EpicCardOption } from '@shared/board.types'
import type {
  QueueItemStatus,
  BulkArchiveQueueItem,
  BulkArchiveModal,
  BulkMemberQueueItem,
  BulkMemberModal
} from '../kanban.types'
import { api } from '../../../hooks/useApi'

export function useBulkActions(
  boardId: string,
  columns: KanbanColumn[],
  epicCardOptions: EpicCardOption[],
  boardMembers: TrelloMember[],
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>,
  setToastMessage: (msg: string | null) => void,
  loadBoardData: () => Promise<void>
) {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const [bulkEpicDropdownOpen, setBulkEpicDropdownOpen] = useState(false)
  const [bulkEpicSearch, setBulkEpicSearch] = useState('')
  const bulkEpicDropdownRef = useRef<HTMLDivElement>(null)
  const [bulkMemberDropdownOpen, setBulkMemberDropdownOpen] = useState(false)
  const bulkMemberDropdownRef = useRef<HTMLDivElement>(null)
  const [bulkArchiveModal, setBulkArchiveModal] = useState<BulkArchiveModal | null>(null)
  const [bulkMemberModal, setBulkMemberModal] = useState<BulkMemberModal | null>(null)

  const handleToggleSelectCard = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }, [])

  const handleBulkSetEpic = useCallback(
    async (epicCardId: string | null) => {
      setBulkEpicDropdownOpen(false)
      const cardIds = Array.from(selectedCardIds)
      const epicName = epicCardId
        ? (epicCardOptions.find((o) => o.id === epicCardId)?.name ?? null)
        : null
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            selectedCardIds.has(c.id) ? { ...c, epicCardId, epicCardName: epicName } : c
          )
        }))
      )
      setSelectedCardIds(new Set())
      const result = await api.epics.setBulkCardEpic(boardId, cardIds, epicCardId)
      if (!result.success) {
        loadBoardData()
        setToastMessage(result.error ?? 'Failed to update epic. Please try again.')
      }
    },
    [boardId, selectedCardIds, epicCardOptions, loadBoardData, setColumns, setToastMessage]
  )

  // ── Bulk archive modal handlers ──────────────────────────────────────────

  const handleOpenBulkArchive = useCallback(() => {
    if (selectedCardIds.size === 0) return
    setBulkArchiveModal({ queue: null, running: false })
  }, [selectedCardIds])

  const handleStartBulkArchive = useCallback(async () => {
    const allCards = columns.flatMap((col) => col.cards)
    const cardMap = new Map(allCards.map((c) => [c.id, c]))
    const initialQueue: BulkArchiveQueueItem[] = Array.from(selectedCardIds).map((cardId) => ({
      id: `archive-${cardId}`,
      cardId,
      cardName: cardMap.get(cardId)?.name ?? cardId,
      status: 'pending' as QueueItemStatus
    }))
    setBulkArchiveModal({ queue: initialQueue, running: true })

    for (let i = 0; i < initialQueue.length; i++) {
      const item = initialQueue[i]

      setBulkArchiveModal((prev) => {
        if (!prev?.queue) return prev
        return {
          ...prev,
          queue: prev.queue.map((q) => (q.id === item.id ? { ...q, status: 'running' } : q))
        }
      })

      const result = await api.trello.archiveCard(boardId, item.cardId)
      const success = result.success

      if (success) {
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            cards: col.cards.filter((c) => c.id !== item.cardId)
          }))
        )
        setSelectedCardIds((prev) => {
          const next = new Set(prev)
          next.delete(item.cardId)
          return next
        })
      }

      setBulkArchiveModal((prev) => {
        if (!prev?.queue) return prev
        return {
          ...prev,
          queue: prev.queue.map((q) =>
            q.id === item.id ? { ...q, status: success ? 'done' : 'failed' } : q
          )
        }
      })

      if (i < initialQueue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    }

    setBulkArchiveModal((prev) => (prev ? { ...prev, running: false } : null))
  }, [boardId, columns, selectedCardIds, setColumns])

  const handleRunBulkArchive = useCallback(async () => {
    setBulkArchiveModal((prev) => (prev ? { ...prev, running: true } : null))

    const snapshot = bulkArchiveModal
    if (!snapshot?.queue) return

    const pendingItems = snapshot.queue.filter((q) => q.status === 'pending')

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i]

      setBulkArchiveModal((prev) => {
        if (!prev?.queue) return prev
        return {
          ...prev,
          queue: prev.queue.map((q) => (q.id === item.id ? { ...q, status: 'running' } : q))
        }
      })

      const result = await api.trello.archiveCard(boardId, item.cardId)
      const success = result.success

      if (success) {
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            cards: col.cards.filter((c) => c.id !== item.cardId)
          }))
        )
        setSelectedCardIds((prev) => {
          const next = new Set(prev)
          next.delete(item.cardId)
          return next
        })
      }

      setBulkArchiveModal((prev) => {
        if (!prev?.queue) return prev
        return {
          ...prev,
          queue: prev.queue.map((q) =>
            q.id === item.id ? { ...q, status: success ? 'done' : 'failed' } : q
          )
        }
      })

      if (i < pendingItems.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    }

    setBulkArchiveModal((prev) => (prev ? { ...prev, running: false } : null))
  }, [boardId, bulkArchiveModal, setColumns])

  const handleCloseBulkArchive = useCallback(() => {
    setBulkArchiveModal((prev) => (prev?.running ? prev : null))
  }, [])

  const handleBulkArchiveRetryItem = useCallback((itemId: string) => {
    setBulkArchiveModal((prev) => {
      if (!prev?.queue) return prev
      return {
        ...prev,
        queue: prev.queue.map((q) =>
          q.id === itemId ? { ...q, status: 'pending' as QueueItemStatus } : q
        )
      }
    })
  }, [])

  const handleBulkArchiveRetryAllFailed = useCallback(() => {
    setBulkArchiveModal((prev) => {
      if (!prev?.queue) return prev
      return {
        ...prev,
        queue: prev.queue.map((q) =>
          q.status === 'failed' ? { ...q, status: 'pending' as QueueItemStatus } : q
        )
      }
    })
  }, [])

  // ── Bulk member assignment modal handlers ─────────────────────────────────

  const handleOpenBulkMemberModal = useCallback(
    (memberId: string, memberName: string, assign: boolean) => {
      if (selectedCardIds.size === 0) return
      setBulkMemberDropdownOpen(false)
      setBulkMemberModal({ memberId, memberName, assign, queue: null, running: false })
    },
    [selectedCardIds]
  )

  const handleStartBulkMember = useCallback(async () => {
    const allCards = columns.flatMap((col) => col.cards)
    const cardMap = new Map(allCards.map((c) => [c.id, c]))
    const initialQueue: BulkMemberQueueItem[] = Array.from(selectedCardIds).map((cardId) => ({
      id: `member-${cardId}`,
      cardId,
      cardName: cardMap.get(cardId)?.name ?? cardId,
      status: 'pending' as QueueItemStatus
    }))

    setBulkMemberModal((prev) => (prev ? { ...prev, queue: initialQueue, running: true } : null))

    const memberId = bulkMemberModal?.memberId ?? ''
    const assign = bulkMemberModal?.assign ?? true

    for (let i = 0; i < initialQueue.length; i++) {
      const item = initialQueue[i]

      setBulkMemberModal((prev) => {
        if (!prev?.queue) return prev
        return {
          ...prev,
          queue: prev.queue.map((q) => (q.id === item.id ? { ...q, status: 'running' } : q))
        }
      })

      const result = await api.trello.assignCardMember(boardId, item.cardId, memberId, assign)
      const success = result.success

      if (success && result.data) {
        const updatedMembers = result.data
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === item.cardId ? { ...c, members: updatedMembers } : c
            )
          }))
        )
      }

      setBulkMemberModal((prev) => {
        if (!prev?.queue) return prev
        return {
          ...prev,
          queue: prev.queue.map((q) =>
            q.id === item.id ? { ...q, status: success ? 'done' : 'failed' } : q
          )
        }
      })

      if (i < initialQueue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    }

    setBulkMemberModal((prev) => (prev ? { ...prev, running: false } : null))
  }, [boardId, bulkMemberModal, columns, selectedCardIds, setColumns])

  const handleRunBulkMember = useCallback(async () => {
    setBulkMemberModal((prev) => (prev ? { ...prev, running: true } : null))

    const snapshot = bulkMemberModal
    if (!snapshot?.queue) return

    const pendingItems = snapshot.queue.filter((q) => q.status === 'pending')

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i]

      setBulkMemberModal((prev) => {
        if (!prev?.queue) return prev
        return {
          ...prev,
          queue: prev.queue.map((q) => (q.id === item.id ? { ...q, status: 'running' } : q))
        }
      })

      const result = await api.trello.assignCardMember(
        boardId,
        item.cardId,
        snapshot.memberId,
        snapshot.assign
      )
      const success = result.success

      if (success && result.data) {
        const updatedMembers = result.data
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === item.cardId ? { ...c, members: updatedMembers } : c
            )
          }))
        )
      }

      setBulkMemberModal((prev) => {
        if (!prev?.queue) return prev
        return {
          ...prev,
          queue: prev.queue.map((q) =>
            q.id === item.id ? { ...q, status: success ? 'done' : 'failed' } : q
          )
        }
      })

      if (i < pendingItems.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    }

    setBulkMemberModal((prev) => (prev ? { ...prev, running: false } : null))
  }, [boardId, bulkMemberModal, setColumns])

  const handleCloseBulkMember = useCallback(() => {
    setBulkMemberModal((prev) => (prev?.running ? prev : null))
  }, [])

  const handleBulkMemberRetryItem = useCallback((itemId: string) => {
    setBulkMemberModal((prev) => {
      if (!prev?.queue) return prev
      return {
        ...prev,
        queue: prev.queue.map((q) =>
          q.id === itemId ? { ...q, status: 'pending' as QueueItemStatus } : q
        )
      }
    })
  }, [])

  const handleBulkMemberRetryAllFailed = useCallback(() => {
    setBulkMemberModal((prev) => {
      if (!prev?.queue) return prev
      return {
        ...prev,
        queue: prev.queue.map((q) =>
          q.status === 'failed' ? { ...q, status: 'pending' as QueueItemStatus } : q
        )
      }
    })
  }, [])

  // Close bulk epic dropdown on outside click
  useEffect(() => {
    if (!bulkEpicDropdownOpen) {
      setBulkEpicSearch('')
      return
    }
    const handleClick = (e: MouseEvent) => {
      if (bulkEpicDropdownRef.current && !bulkEpicDropdownRef.current.contains(e.target as Node))
        setBulkEpicDropdownOpen(false)
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [bulkEpicDropdownOpen])

  // Close bulk member dropdown on outside click
  useEffect(() => {
    if (!bulkMemberDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        bulkMemberDropdownRef.current &&
        !bulkMemberDropdownRef.current.contains(e.target as Node)
      ) {
        setBulkMemberDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [bulkMemberDropdownOpen])

  const onCardsCreated = useCallback(
    (listId: string, cards: KanbanCard[]) => {
      setColumns((prev) =>
        prev.map((col) => (col.id === listId ? { ...col, cards: [...col.cards, ...cards] } : col))
      )
    },
    [setColumns]
  )

  return {
    selectedCardIds,
    setSelectedCardIds,
    bulkEpicDropdownOpen,
    setBulkEpicDropdownOpen,
    bulkEpicSearch,
    setBulkEpicSearch,
    bulkEpicDropdownRef,
    bulkMemberDropdownOpen,
    setBulkMemberDropdownOpen,
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
