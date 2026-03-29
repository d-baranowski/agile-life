import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd'
import type { BoardConfig } from '@shared/board.types'
import type { EpicCardOption, EpicStory } from '@shared/board.types'
import type { KanbanColumn, KanbanCard, TrelloMember } from '@shared/trello.types'
import type { GamificationStats } from '@shared/analytics.types'
import type { TemplateGroup, TicketTemplate, GenerateCardsResult } from '@shared/template.types'
import { api } from '../hooks/useApi'
import Toast from '../components/Toast'
import StrictModeDroppable from '../components/StrictModeDroppable'
import TicketNumberingPage from './TicketNumberingPage'
import styles from './KanbanPage.module.css'

interface Props {
  board: BoardConfig
  allBoards: BoardConfig[]
  /** Incremented by App each time a Trello sync completes — triggers a data reload. */
  syncVersion: number
}

interface ContextMenuState {
  x: number
  y: number
  card: KanbanCard
}

type QueueItemStatus = 'pending' | 'running' | 'done' | 'failed'

interface QueueItem {
  id: string
  name: string
  status: QueueItemStatus
}

interface AddCardModal {
  listId: string
  listName: string
  text: string
  /** null = edit phase; non-null = queue/upload phase */
  queue: QueueItem[] | null
  uploading: boolean
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Parse card names from a multiline textarea value (one per non-blank line). */
function parseCardNames(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function reorderCards(cards: KanbanCard[], fromIndex: number, toIndex: number): KanbanCard[] {
  const result = [...cards]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result
}

function moveCard(
  columns: KanbanColumn[],
  fromColId: string,
  toColId: string,
  fromIndex: number,
  toIndex: number
): KanbanColumn[] {
  const fromCol = columns.find((c) => c.id === fromColId)
  const toCol = columns.find((c) => c.id === toColId)
  if (!fromCol || !toCol) return columns

  const card = { ...fromCol.cards[fromIndex], listId: toColId }

  const newFromCards = [...fromCol.cards]
  newFromCards.splice(fromIndex, 1)

  const newToCards = [...toCol.cards]
  newToCards.splice(toIndex, 0, card)

  return columns.map((c) => {
    if (c.id === fromColId) return { ...c, cards: newFromCards }
    if (c.id === toColId) return { ...c, cards: newToCards }
    return c
  })
}

/**
 * Returns the CSS width percentage string for a gamification progress bar.
 * When yearlyHighScore is 0 the bar is empty unless the user has points
 * (in which case they are the only data point, so fill 100%).
 */
function gamificationBarWidth(points: number, yearlyHighScore: number): string {
  if (yearlyHighScore > 0) {
    return `${Math.min((points / yearlyHighScore) * 100, 100)}%`
  }
  return points > 0 ? '100%' : '0%'
}

// ─── Placeholder resolver (mirrors server-side logic for preview) ─────────────

function resolvePlaceholders(template: string, now: Date): string {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthPadded = String(month).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const date = `${year}-${monthPadded}-${day}`
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000)
  const adjustedDow = (startOfYear.getDay() + 6) % 7
  const week = String(Math.floor((dayOfYear + adjustedDow) / 7) + 1).padStart(2, '0')
  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]
  return template
    .replace(/\{\{year\}\}/g, String(year))
    .replace(/\{\{month\}\}/g, monthPadded)
    .replace(/\{\{month_name\}\}/g, MONTH_NAMES[month - 1])
    .replace(/\{\{week\}\}/g, week)
    .replace(/\{\{date\}\}/g, date)
}

// ─── component ───────────────────────────────────────────────────────────────

export default function KanbanPage({ board, allBoards, syncVersion }: Props): JSX.Element {
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [epicFilter, setEpicFilter] = useState<string>('') // '' = all, '__none__' = no epic, epicCardId = specific epic
  const [epicColumnFilter, setEpicColumnFilter] = useState<string>('') // '' = all, listId = specific epic column
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [boardMembers, setBoardMembers] = useState<TrelloMember[]>([])
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Multi-select state (story boards only)
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const [bulkEpicDropdownOpen, setBulkEpicDropdownOpen] = useState(false)
  const bulkEpicDropdownRef = useRef<HTMLDivElement>(null)

  // Is this board a story board (has a linked epic board)?
  const isStoryBoard = !!board.epicBoardId
  // Is this board acting as an epic board for some other board?
  const isEpicBoard = allBoards.some((b) => b.epicBoardId === board.boardId)

  // Epic card options (loaded when this is a story board)
  const [epicCardOptions, setEpicCardOptions] = useState<EpicCardOption[]>([])

  // Epic stories modal state (for double-click on epic board)
  const [epicStoriesCard, setEpicStoriesCard] = useState<{
    id: string
    name: string
  } | null>(null)
  const [epicStories, setEpicStories] = useState<EpicStory[] | null>(null)
  const [epicStoriesLoading, setEpicStoriesLoading] = useState(false)

  // Epic assignment dropdown state
  const [epicDropdownCardId, setEpicDropdownCardId] = useState<string | null>(null)

  // Add-card modal state
  const [addCardModal, setAddCardModal] = useState<AddCardModal | null>(null)
  const addCardTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Gamification stats (loaded when myMemberId is set)
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null)

  const loadBoardData = useCallback(async () => {
    const [dataResult, membersResult] = await Promise.all([
      api.trello.getBoardData(board.boardId),
      api.trello.getBoardMembers(board.boardId)
    ])
    if (dataResult.success && dataResult.data) {
      setColumns(dataResult.data)
      setError(null)
    } else {
      setError(dataResult.error ?? 'Failed to load board data.')
    }
    if (membersResult.success && membersResult.data) {
      setBoardMembers(membersResult.data)
    }
    setLoading(false)
  }, [board.boardId, syncVersion])

  // Load gamification stats whenever the board or syncVersion changes
  useEffect(() => {
    if (!board.myMemberId) {
      setGamificationStats(null)
      return
    }
    api.analytics
      .gamificationStats(board.boardId, board.myMemberId, board.storyPointsConfig)
      .then((result) => {
        if (result.success && result.data) setGamificationStats(result.data)
      })
  }, [board.boardId, board.myMemberId, board.storyPointsConfig, syncVersion])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSelectedCardIds(new Set())
    loadBoardData()
  }, [loadBoardData])

  // Load epic card options when this is a story board
  useEffect(() => {
    setEpicFilter('')
    setEpicColumnFilter('')
    if (!isStoryBoard) return
    api.epics.getCards(board.boardId).then((result) => {
      if (result.success && result.data) setEpicCardOptions(result.data)
    })
  }, [board.boardId, isStoryBoard])

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result

      if (!destination) return
      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return
      }

      const fromColId = source.droppableId
      const toColId = destination.droppableId

      // ── Optimistic update ──
      if (fromColId === toColId) {
        // Reorder within the same column — optimistically update UI and persist new pos
        const col = columns.find((c) => c.id === fromColId)
        if (!col) return

        const newCards = reorderCards(col.cards, source.index, destination.index)

        // Compute a midpoint pos so the order survives a page reload.
        // 65536 matches Trello's default gap: new cards get pos = 65536,
        // and cards moved to the top get pos = previous_top / 2.
        const prev = destination.index > 0 ? newCards[destination.index - 1] : null
        const next =
          destination.index < newCards.length - 1 ? newCards[destination.index + 1] : null
        const newPos =
          prev && next
            ? (prev.pos + next.pos) / 2 // between neighbours
            : prev
              ? prev.pos + 65536 // after the last card
              : next
                ? next.pos / 2 // before the first card
                : 65536 // only card in the column

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

        api.trello.updateCardPos(board.boardId, draggableId, newPos)
        return
      }

      // Move to a different column
      const toCol = columns.find((c) => c.id === toColId)
      if (!toCol) return

      // Compute a stable pos for the new position in the target column so
      // Trello and the local DB stay in sync after cross-column moves.
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
      // Optimistically update UI: move card into new column with the computed pos
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

      // ── Sync to Trello ──
      const syncResult = await api.trello.moveCard(board.boardId, draggableId, toColId, newPos)
      if (!syncResult.success) {
        // Revert optimistic update and show error
        setColumns(prevColumns)
        setToastMessage(syncResult.error ?? 'Failed to move card. Please try again.')
      }
    },
    [board.boardId, columns]
  )

  const [showTicketsModal, setShowTicketsModal] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)
  // Each toolbar section (empty-state vs main) has its own meatball state; only one is mounted at a time.
  const [showEmptyMeatball, setShowEmptyMeatball] = useState(false)
  const [showMainMeatball, setShowMainMeatball] = useState(false)
  const emptyMeatballRef = useRef<HTMLDivElement>(null)
  const mainMeatballRef = useRef<HTMLDivElement>(null)

  // Generate-from-template modal state
  const [showGenModal, setShowGenModal] = useState(false)
  const [genGroups, setGenGroups] = useState<TemplateGroup[]>([])
  const [genGroupId, setGenGroupId] = useState<number | null>(null)
  const [genTemplates, setGenTemplates] = useState<TicketTemplate[]>([])
  const [genLoading, setGenLoading] = useState(false)
  const [genGenerating, setGenGenerating] = useState(false)
  const [genResult, setGenResult] = useState<GenerateCardsResult | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  const handleOpenLogs = useCallback(() => {
    api.logs.openFolder()
  }, [])

  // Close modals on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTicketsModal(false)
        setEpicStoriesCard(null)
        setEpicDropdownCardId(null)
        setAddCardModal((prev) => (prev?.uploading ? prev : null))
        setShowGenModal(false)
        setBulkEpicDropdownOpen(false)
        setSelectedCardIds(new Set())
        setShowEmptyMeatball(false)
        setShowMainMeatball(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Close meatball menus when clicking outside
  useEffect(() => {
    if (!showEmptyMeatball && !showMainMeatball) return
    const handleClick = (e: MouseEvent) => {
      if (emptyMeatballRef.current && !emptyMeatballRef.current.contains(e.target as Node)) {
        setShowEmptyMeatball(false)
      }
      if (mainMeatballRef.current && !mainMeatballRef.current.contains(e.target as Node)) {
        setShowMainMeatball(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showEmptyMeatball, showMainMeatball])

  // Open the generate-from-template modal and load groups
  const handleOpenGenModal = useCallback(async () => {
    setShowGenModal(true)
    setGenGroupId(null)
    setGenTemplates([])
    setGenResult(null)
    setGenError(null)
    const result = await api.templates.getGroups(board.boardId)
    if (result.success && result.data) {
      setGenGroups(result.data)
    } else {
      setGenError(result.error ?? 'Failed to load template groups.')
    }
  }, [board.boardId])

  // Load templates for the selected group (for preview)
  const handleGenGroupChange = useCallback(
    async (groupId: number) => {
      setGenGroupId(groupId)
      setGenResult(null)
      setGenError(null)
      setGenLoading(true)
      const result = await api.templates.getTemplates(board.boardId, groupId)
      setGenLoading(false)
      if (result.success && result.data) {
        setGenTemplates(result.data)
      } else {
        setGenError(result.error ?? 'Failed to load templates.')
      }
    },
    [board.boardId]
  )

  // Generate cards from the selected group
  const handleGenerateFromModal = useCallback(async () => {
    if (genGroupId === null) return
    setGenGenerating(true)
    setGenResult(null)
    setGenError(null)
    const result = await api.templates.generateCards(board.boardId, genGroupId)
    setGenGenerating(false)
    if (result.success && result.data) {
      setGenResult(result.data)
      // Reload board data so newly created cards appear without a full sync
      loadBoardData()
    } else {
      setGenError(result.error ?? 'Failed to generate cards.')
    }
  }, [board.boardId, genGroupId, loadBoardData])

  // Open epic stories modal (double-click on epic board card)
  const handleOpenEpicStories = useCallback(async (cardId: string, cardName: string) => {
    setEpicStoriesCard({ id: cardId, name: cardName })
    setEpicStories(null)
    setEpicStoriesLoading(true)
    const result = await api.epics.getStories(cardId)
    setEpicStoriesLoading(false)
    if (result.success && result.data) {
      setEpicStories(result.data)
    }
  }, [])

  // Assign or clear an epic for a story card
  const handleSetCardEpic = useCallback(
    async (cardId: string, epicCardId: string | null) => {
      setEpicDropdownCardId(null)
      await api.epics.setCardEpic(board.boardId, cardId, epicCardId)
      // Optimistically update local state
      const epicName = epicCardId
        ? (epicCardOptions.find((o) => o.id === epicCardId)?.name ?? null)
        : null
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            c.id === cardId ? { ...c, epicCardId: epicCardId, epicCardName: epicName } : c
          )
        }))
      )
    },
    [board.boardId, epicCardOptions]
  )

  // Toggle selection of a single card
  const handleToggleSelectCard = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }, [])

  // Assign or clear an epic for all currently selected cards
  const handleBulkSetEpic = useCallback(
    async (epicCardId: string | null) => {
      setBulkEpicDropdownOpen(false)
      const cardIds = Array.from(selectedCardIds)
      const epicName = epicCardId
        ? (epicCardOptions.find((o) => o.id === epicCardId)?.name ?? null)
        : null
      // Optimistic update
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            selectedCardIds.has(c.id) ? { ...c, epicCardId, epicCardName: epicName } : c
          )
        }))
      )
      setSelectedCardIds(new Set())
      const result = await api.epics.setBulkCardEpic(board.boardId, cardIds, epicCardId)
      if (!result.success) {
        loadBoardData()
        setToastMessage(result.error ?? 'Failed to update epic. Please try again.')
      }
    },
    [board.boardId, selectedCardIds, epicCardOptions, loadBoardData]
  )

  // Close bulk epic dropdown on outside click
  useEffect(() => {
    if (!bulkEpicDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (bulkEpicDropdownRef.current && !bulkEpicDropdownRef.current.contains(e.target as Node)) {
        setBulkEpicDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [bulkEpicDropdownOpen])

  // Close context menu on Escape or click outside
  useEffect(() => {
    if (!contextMenu) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [contextMenu])

  const handleArchiveCard = useCallback(
    async (cardId: string) => {
      setContextMenu(null)
      // Optimistically remove the card from the UI
      const prevColumns = columns
      setColumns((prev) =>
        prev.map((col) => ({ ...col, cards: col.cards.filter((c) => c.id !== cardId) }))
      )
      const result = await api.trello.archiveCard(board.boardId, cardId)
      if (!result.success) {
        setColumns(prevColumns)
        setToastMessage(result.error ?? 'Failed to archive card. Please try again.')
      }
    },
    [board.boardId, columns]
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

      const result = await api.trello.assignCardMember(board.boardId, cardId, memberId, assign)
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
    [board.boardId, boardMembers, columns]
  )

  // ── Add-card modal handlers ───────────────────────────────────────────────

  // Open the modal in edit phase for a given column
  const handleOpenAddCard = useCallback((listId: string, listName: string) => {
    setAddCardModal({ listId, listName, text: '', queue: null, uploading: false })
  }, [])

  // Close the modal (blocked while uploading)
  const handleCloseAddCard = useCallback(() => {
    setAddCardModal((prev) => (prev?.uploading ? prev : null))
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
    async (listId: string, items: QueueItem[]) => {
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

        const result = await api.trello.createCard(board.boardId, listId, item.name)
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
        setColumns((prev) =>
          prev.map((col) =>
            col.id === listId ? { ...col, cards: [...col.cards, ...created] } : col
          )
        )
      }

      setAddCardModal((prev) => (prev ? { ...prev, uploading: false } : null))
    },
    [board.boardId]
  )

  // Convert textarea preview to queue items and start the upload
  const handleStartUpload = useCallback(async () => {
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

    await runUpload(listId, queue)
  }, [addCardModal, runUpload])

  // Retry a single failed item
  const handleRetryItem = useCallback(
    async (itemId: string) => {
      if (!addCardModal?.queue || addCardModal.uploading) return
      const item = addCardModal.queue.find((q) => q.id === itemId)
      if (!item) return
      const { listId } = addCardModal

      setAddCardModal((prev) => (prev ? { ...prev, uploading: true } : null))
      await runUpload(listId, [item])
    },
    [addCardModal, runUpload]
  )

  // Retry all failed items in the queue
  const handleRetryAllFailed = useCallback(async () => {
    if (!addCardModal?.queue || addCardModal.uploading) return
    const failed = addCardModal.queue.filter((q) => q.status === 'failed')
    if (failed.length === 0) return
    const { listId } = addCardModal

    setAddCardModal((prev) => (prev ? { ...prev, uploading: true } : null))
    await runUpload(listId, failed)
  }, [addCardModal, runUpload])

  // Focus the textarea when the modal opens
  const addCardModalOpen = addCardModal !== null && addCardModal.queue === null
  useEffect(() => {
    if (addCardModalOpen && addCardTextareaRef.current) {
      addCardTextareaRef.current.focus()
    }
  }, [addCardModalOpen])

  // ── Render ────────────────────────────────────────────────────────────────

  // Compute the set of card names (lowercased) that appear more than once across all columns.
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>()
    for (const col of columns) {
      for (const card of col.cards) {
        const key = card.name.trim().toLowerCase()
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
    const result = new Set<string>()
    for (const [name, count] of counts) {
      if (count > 1) result.add(name)
    }
    return result
  }, [columns])

  // Derive unique epic columns from the loaded epic card options (for the column filter dropdown)
  const epicColumns = useMemo(
    () =>
      epicCardOptions.reduce<{ listId: string; listName: string }[]>((acc, opt) => {
        if (!acc.some((c) => c.listId === opt.listId)) {
          acc.push({ listId: opt.listId, listName: opt.listName })
        }
        return acc
      }, []),
    [epicCardOptions]
  )

  // Build a set of epic card IDs that belong to the selected epic column (for efficient lookup)
  const epicCardIdsInColumn = useMemo(
    () =>
      epicColumnFilter
        ? new Set(
            epicCardOptions.filter((opt) => opt.listId === epicColumnFilter).map((opt) => opt.id)
          )
        : null,
    [epicCardOptions, epicColumnFilter]
  )

  const filteredColumns = useMemo(
    () =>
      searchQuery.trim() || epicFilter || epicColumnFilter || showDuplicates
        ? columns.map((col) => ({
            ...col,
            cards: col.cards.filter((card) => {
              if (searchQuery.trim() && !fuzzyMatch(searchQuery, `${card.name} ${card.desc}`))
                return false
              if (epicFilter === '__none__' && card.epicCardId) return false
              if (epicFilter && epicFilter !== '__none__' && card.epicCardId !== epicFilter)
                return false
              if (epicCardIdsInColumn)
                return card.epicCardId !== null && epicCardIdsInColumn.has(card.epicCardId)
              if (showDuplicates && !duplicateNames.has(card.name.trim().toLowerCase()))
                return false
              return true
            })
          }))
        : columns,
    [
      columns,
      searchQuery,
      epicFilter,
      epicColumnFilter,
      epicCardIdsInColumn,
      showDuplicates,
      duplicateNames
    ]
  )

  const selectedCardCount = useMemo(() => selectedCardIds.size, [selectedCardIds])

  if (loading) {
    return (
      <div className={styles.centred}>
        <div className="spinner" />
        <span>Loading board…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.centred}>
        <div className={styles.errorBanner}>{error}</div>
      </div>
    )
  }

  const ticketsModal = showTicketsModal ? (
    <div className={styles.modalOverlay} onClick={() => setShowTicketsModal(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.modalClose}
          onClick={() => setShowTicketsModal(false)}
          title="Close (Esc)"
        >
          ✕
        </button>
        <TicketNumberingPage board={board} />
      </div>
    </div>
  ) : null

  if (columns.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.searchBar}>
          <div ref={emptyMeatballRef} className={styles.meatballWrapper}>
            <button
              className={styles.meatballBtn}
              onClick={() => setShowEmptyMeatball((v) => !v)}
              title="More options"
              aria-label="More options"
            >
              •••
            </button>
            {showEmptyMeatball && (
              <div className={styles.meatballMenu}>
                <button
                  className={styles.meatballItem}
                  onClick={() => {
                    setShowTicketsModal(true)
                    setShowEmptyMeatball(false)
                  }}
                >
                  🎫 Number Tickets
                </button>
                <button
                  className={styles.meatballItem}
                  onClick={() => {
                    handleOpenGenModal()
                    setShowEmptyMeatball(false)
                  }}
                >
                  📋 Generate from Template
                </button>
              </div>
            )}
          </div>
        </div>
        <div className={styles.emptyState}>
          <p>No data yet.</p>
          <p className="text-muted">
            Click <strong>↻ Fetch from Trello</strong> in the top bar to import this board&apos;s
            data.
          </p>
        </div>
        {ticketsModal}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="🔍 Fuzzy search cards…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {isStoryBoard && epicCardOptions.length > 0 && (
          <select
            className={styles.epicFilterSelect}
            value={epicFilter}
            onChange={(e) => {
              setEpicFilter(e.target.value)
              setEpicColumnFilter('')
            }}
            title="Filter by epic"
            aria-label="Filter cards by epic"
          >
            <option value="">⚡ All epics</option>
            <option value="__none__">— No epic</option>
            {epicCardOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        )}
        {isStoryBoard && epicColumns.length > 0 && (
          <select
            className={styles.epicFilterSelect}
            value={epicColumnFilter}
            onChange={(e) => {
              setEpicColumnFilter(e.target.value)
              setEpicFilter('')
            }}
            title="Filter by epic column"
            aria-label="Filter cards by epic column"
          >
            <option value="">📋 All epic columns</option>
            {epicColumns.map((col) => (
              <option key={col.listId} value={col.listId}>
                {col.listName}
              </option>
            ))}
          </select>
        )}
        <div ref={mainMeatballRef} className={styles.meatballWrapper}>
          <button
            className={`${styles.meatballBtn} ${showDuplicates ? styles.meatballBtnActive : ''}`}
            onClick={() => setShowMainMeatball((v) => !v)}
            title="More options"
            aria-label="More options"
          >
            •••
          </button>
          {showMainMeatball && (
            <div className={styles.meatballMenu}>
              <button
                className={`${styles.meatballItem} ${showDuplicates ? styles.meatballItemActive : ''}`}
                onClick={() => {
                  setShowDuplicates((v) => !v)
                  setShowMainMeatball(false)
                }}
              >
                ⊖ Duplicates{duplicateNames.size > 0 && ` (${duplicateNames.size})`}
              </button>
              <button
                className={styles.meatballItem}
                onClick={() => {
                  setShowTicketsModal(true)
                  setShowMainMeatball(false)
                }}
              >
                🎫 Number Tickets
              </button>
              <button
                className={styles.meatballItem}
                onClick={() => {
                  handleOpenGenModal()
                  setShowMainMeatball(false)
                }}
              >
                📋 Generate from Template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Gamification bar ── */}
      {gamificationStats && (
        <div className={styles.gamificationBar}>
          {/* Previous week reference bar */}
          <div
            className={styles.gamificationTrack}
            data-tooltip={`Last week: ${gamificationStats.prevWeekPoints} SP`}
          >
            <div
              className={styles.gamificationFillPrev}
              style={{
                width: gamificationBarWidth(
                  gamificationStats.prevWeekPoints,
                  gamificationStats.yearlyHighScore
                )
              }}
            />
          </div>

          {/* Yearly high score — shown above current week when current beats previous */}
          {gamificationStats.currentWeekPoints > 0 &&
            gamificationStats.currentWeekPoints > gamificationStats.prevWeekPoints &&
            gamificationStats.yearlyHighScore > gamificationStats.prevWeekPoints && (
              <div
                className={styles.gamificationTrack}
                data-tooltip={`🏆 Year best: ${gamificationStats.yearlyHighScore} SP`}
              >
                <div className={styles.gamificationFillHigh} style={{ width: '100%' }} />
              </div>
            )}

          {/* Current week bar */}
          <div
            className={styles.gamificationTrack}
            data-tooltip={`${
              gamificationStats.currentWeekPoints > gamificationStats.prevWeekPoints &&
              gamificationStats.currentWeekPoints > 0
                ? '🔥 This week'
                : 'This week'
            }: ${gamificationStats.currentWeekPoints} SP`}
          >
            <div
              className={`${styles.gamificationFillCurrent} ${
                gamificationStats.currentWeekPoints > gamificationStats.prevWeekPoints &&
                gamificationStats.currentWeekPoints > 0
                  ? styles.gamificationFillCurrentBeat
                  : ''
              }`}
              style={{
                width: gamificationBarWidth(
                  gamificationStats.currentWeekPoints,
                  gamificationStats.yearlyHighScore
                )
              }}
            />
          </div>
        </div>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.board}>
          {filteredColumns.map((column) => (
            <div key={column.id} className={styles.column}>
              <div className={styles.columnHeader}>
                <span className={styles.columnName}>{column.name}</span>
                <span className={styles.columnCount}>{column.cards.length}</span>
              </div>

              <StrictModeDroppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${styles.cardList} ${snapshot.isDraggingOver ? styles.cardListOver : ''}`}
                  >
                    {column.cards.map((card, index) => (
                      <DraggableCard
                        key={card.id}
                        card={card}
                        index={index}
                        isStoryBoard={isStoryBoard}
                        isEpicBoard={isEpicBoard}
                        epicCardOptions={epicCardOptions}
                        epicDropdownCardId={epicDropdownCardId}
                        isDuplicate={duplicateNames.has(card.name.trim().toLowerCase())}
                        isSelected={selectedCardIds.has(card.id)}
                        onToggleSelect={handleToggleSelectCard}
                        onOpenEpicStories={handleOpenEpicStories}
                        onSetCardEpic={handleSetCardEpic}
                        onToggleEpicDropdown={(cardId) =>
                          setEpicDropdownCardId((prev) => (prev === cardId ? null : cardId))
                        }
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({ x: e.clientX, y: e.clientY, card })
                        }}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>

              {/* ── Add card button ── */}
              <button
                className={styles.addCardBtn}
                onClick={() => handleOpenAddCard(column.id, column.name)}
              >
                + Add a card
              </button>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* ── Bulk action bar (shown when ≥1 card is selected on a story board) ── */}
      {isStoryBoard && selectedCardCount > 0 && (
        <div className={styles.bulkActionBar}>
          <span className={styles.bulkActionCount}>
            {selectedCardCount} card{selectedCardCount !== 1 ? 's' : ''} selected
          </span>
          <div className={styles.bulkActionControls}>
            <div ref={bulkEpicDropdownRef} className={styles.bulkEpicWrapper}>
              <button
                className={styles.bulkEpicBtn}
                onClick={() => setBulkEpicDropdownOpen((prev) => !prev)}
              >
                ⚡ Set Epic
              </button>
              {bulkEpicDropdownOpen && (
                <div className={styles.bulkEpicDropdown}>
                  <button
                    className={styles.bulkEpicDropdownItem}
                    onClick={() => handleBulkSetEpic(null)}
                  >
                    — None
                  </button>
                  {epicCardOptions.map((opt) => (
                    <button
                      key={opt.id}
                      className={styles.bulkEpicDropdownItem}
                      onClick={() => handleBulkSetEpic(opt.id)}
                    >
                      <span className={styles.epicDropdownName}>{opt.name}</span>
                      <span className={styles.epicDropdownList}>{opt.listName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className={styles.bulkClearBtn}
              onClick={() => setSelectedCardIds(new Set())}
              title="Clear selection (Esc)"
            >
              ✕ Clear
            </button>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => handleArchiveCard(contextMenu.card.id)}
          >
            🗄️ Archive card
          </button>
          {boardMembers.length > 0 && (
            <>
              <div className={styles.contextMenuDivider} />
              <div className={styles.contextMenuLabel}>Assign to:</div>
              {boardMembers.map((member) => {
                const assigned = contextMenu.card.members.some((m) => m.id === member.id)
                return (
                  <button
                    key={member.id}
                    className={styles.contextMenuItem}
                    onClick={() => handleToggleMember(contextMenu.card.id, member.id, !assigned)}
                  >
                    <span className={styles.contextMenuCheck}>{assigned ? '✓' : ''}</span>
                    {member.fullName}
                  </button>
                )
              })}
            </>
          )}
        </div>
      )}

      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
        onOpenLogs={handleOpenLogs}
      />

      {ticketsModal}

      {/* ── Epic Stories Modal ── */}
      {epicStoriesCard && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setEpicStoriesCard(null)
            setEpicStories(null)
          }}
        >
          <div className={styles.epicModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.epicModalHeader}>
              <h2 className={styles.epicModalTitle}>
                📋 Stories for: <em>{epicStoriesCard.name}</em>
              </h2>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setEpicStoriesCard(null)
                  setEpicStories(null)
                }}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
            {epicStoriesLoading ? (
              <div className={styles.epicModalBody}>
                <div className="spinner" />
                <span>Loading stories…</span>
              </div>
            ) : epicStories && epicStories.length === 0 ? (
              <div className={styles.epicModalBody}>
                <p className={styles.epicEmptyState}>No stories assigned to this epic yet.</p>
              </div>
            ) : (
              <div className={styles.epicStoriesList}>
                {(epicStories ?? []).map((story) => (
                  <div key={story.id} className={styles.epicStoryItem}>
                    <div className={styles.epicStoryMeta}>
                      <span className={styles.epicStoryBoard}>{story.boardName}</span>
                      <span className={styles.epicStoryList}>{story.listName}</span>
                    </div>
                    <span className={styles.epicStoryName}>{story.name}</span>
                    {story.shortUrl && (
                      <a
                        href={story.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.trelloLink}
                        title="Open in Trello"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Generate from Template Modal ── */}
      {showGenModal && (
        <div className={styles.modalOverlay} onClick={() => setShowGenModal(false)}>
          <div className={styles.genModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.genModalHeader}>
              <h2 className={styles.genModalTitle}>📋 Generate from Template</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowGenModal(false)}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            <div className={styles.genModalBody}>
              {genGroups.length === 0 ? (
                <p className={styles.genEmptyState}>
                  No template groups found for this board. Create groups in the Templates tab first.
                </p>
              ) : (
                <>
                  <div className={styles.genGroupRow}>
                    <label className={styles.genLabel}>Template group</label>
                    <select
                      className={styles.genSelect}
                      value={genGroupId ?? ''}
                      onChange={(e) => handleGenGroupChange(Number(e.target.value))}
                    >
                      <option value="">— Select a group —</option>
                      {genGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {genGroupId !== null && (
                    <div className={styles.genPreview}>
                      <div className={styles.genPreviewTitle}>Preview</div>
                      {genLoading ? (
                        <div className={styles.genPreviewLoading}>
                          <div
                            className="spinner"
                            style={{ width: 14, height: 14, borderWidth: 2 }}
                          />
                          <span>Loading…</span>
                        </div>
                      ) : genTemplates.length === 0 ? (
                        <p className={styles.genEmptyState}>
                          This group has no templates. Add templates in the Templates tab.
                        </p>
                      ) : (
                        <ul className={styles.genPreviewList}>
                          {genTemplates.map((t) => (
                            <li key={t.id} className={styles.genPreviewItem}>
                              <span className={styles.genPreviewCardTitle}>
                                {resolvePlaceholders(t.titleTemplate, new Date())}
                              </span>
                              <span className={styles.genPreviewMeta}>→ {t.listName}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {genResult && (
                    <div
                      className={`${styles.genResultBanner} ${genResult.failed === 0 ? styles.genResultSuccess : styles.genResultError}`}
                    >
                      {genResult.created} card{genResult.created !== 1 ? 's' : ''} created
                      {genResult.failed > 0 && `, ${genResult.failed} failed`}.
                      {genResult.errors.length > 0 && (
                        <ul className={styles.genResultErrors}>
                          {genResult.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {genError && (
                    <div className={`${styles.genResultBanner} ${styles.genResultError}`}>
                      {genError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={styles.genModalFooter}>
              <button className="btn-secondary" onClick={() => setShowGenModal(false)}>
                Close
              </button>
              {genGroups.length > 0 && (
                <button
                  className="btn-primary"
                  onClick={handleGenerateFromModal}
                  disabled={
                    genGroupId === null || genTemplates.length === 0 || genLoading || genGenerating
                  }
                >
                  {genGenerating ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      Generating…
                    </span>
                  ) : (
                    '▶ Generate cards'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add-card queue modal ── */}
      {addCardModal && (
        <div className={styles.modalOverlay} onClick={handleCloseAddCard}>
          <div className={styles.addCardModal} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.addCardModalHeader}>
              <span className={styles.addCardModalTitle}>
                Add cards to <strong>{addCardModal.listName}</strong>
              </span>
              <button
                className={styles.modalClose}
                onClick={handleCloseAddCard}
                disabled={addCardModal.uploading}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Edit phase */}
            {addCardModal.queue === null &&
              (() => {
                const previewLines = addCardModal.text
                  .split('\n')
                  .map((line, idx) => ({ line: line.trim(), idx }))
                  .filter(({ line }) => line.length > 0)
                return (
                  <>
                    <div className={styles.addCardModalBody}>
                      <textarea
                        ref={addCardTextareaRef}
                        className={styles.addCardTextarea}
                        placeholder={'Paste from Excel or type card names — one per line'}
                        value={addCardModal.text}
                        onChange={(e) =>
                          setAddCardModal((prev) =>
                            prev ? { ...prev, text: e.target.value } : null
                          )
                        }
                        rows={5}
                      />
                      {previewLines.length > 0 && (
                        <div className={styles.addCardPreviewList}>
                          {previewLines.map(({ line, idx }) => (
                            <div key={idx} className={styles.addCardPreviewItem}>
                              <span className={styles.addCardPreviewName}>{line}</span>
                              <button
                                className={styles.addCardPreviewRemove}
                                onClick={() => handleRemovePreviewLine(idx)}
                                title="Remove this item"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={styles.addCardModalFooter}>
                      <button className={styles.addCardCancelBtn} onClick={handleCloseAddCard}>
                        Cancel
                      </button>
                      <button
                        className={styles.addCardStartBtn}
                        onClick={handleStartUpload}
                        disabled={previewLines.length === 0}
                      >
                        Start upload ({previewLines.length} card
                        {previewLines.length !== 1 ? 's' : ''})
                      </button>
                    </div>
                  </>
                )
              })()}

            {/* Queue phase */}
            {addCardModal.queue !== null &&
              (() => {
                const hasAnyFailed = addCardModal.queue.some((q) => q.status === 'failed')
                const allDone = addCardModal.queue.every(
                  (q) => q.status === 'done' || q.status === 'failed'
                )
                return (
                  <>
                    <div className={styles.addCardQueueList}>
                      {addCardModal.queue.map((item) => (
                        <div
                          key={item.id}
                          className={`${styles.addCardQueueItem} ${
                            item.status === 'done'
                              ? styles.queueItemDone
                              : item.status === 'failed'
                                ? styles.queueItemFailed
                                : item.status === 'running'
                                  ? styles.queueItemRunning
                                  : ''
                          }`}
                        >
                          <span className={styles.queueItemIcon}>
                            {item.status === 'pending' && '⏳'}
                            {item.status === 'running' && (
                              <span
                                className="spinner"
                                style={{ width: 14, height: 14, borderWidth: 2 }}
                              />
                            )}
                            {item.status === 'done' && '✓'}
                            {item.status === 'failed' && '✕'}
                          </span>
                          <span className={styles.queueItemName}>{item.name}</span>
                          {!addCardModal.uploading && item.status === 'pending' && (
                            <button
                              className={styles.queueRemoveBtn}
                              onClick={() => handleRemoveQueueItem(item.id)}
                              title="Remove"
                            >
                              ✕
                            </button>
                          )}
                          {!addCardModal.uploading && item.status === 'failed' && (
                            <button
                              className={styles.queueRetryBtn}
                              onClick={() => handleRetryItem(item.id)}
                            >
                              ↺ Retry
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className={styles.addCardModalFooter}>
                      {addCardModal.uploading && (
                        <span className={styles.uploadingLabel}>Uploading…</span>
                      )}
                      {!addCardModal.uploading && allDone && hasAnyFailed && (
                        <button className={styles.addCardStartBtn} onClick={handleRetryAllFailed}>
                          ↺ Retry all failed
                        </button>
                      )}
                      <button
                        className={styles.addCardCancelBtn}
                        onClick={handleCloseAddCard}
                        disabled={addCardModal.uploading}
                      >
                        {allDone && !addCardModal.uploading ? 'Close' : 'Cancel'}
                      </button>
                    </div>
                  </>
                )
              })()}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── draggable card sub-component ────────────────────────────────────────────

interface CardProps {
  card: KanbanCard
  index: number
  isStoryBoard: boolean
  isEpicBoard: boolean
  epicCardOptions: EpicCardOption[]
  epicDropdownCardId: string | null
  isDuplicate: boolean
  isSelected: boolean
  onToggleSelect: (cardId: string) => void
  onOpenEpicStories: (cardId: string, cardName: string) => void
  onSetCardEpic: (cardId: string, epicCardId: string | null) => void
  onToggleEpicDropdown: (cardId: string) => void
  onContextMenu: (e: React.MouseEvent) => void
}

function DraggableCard({
  card,
  index,
  isStoryBoard,
  isEpicBoard,
  epicCardOptions,
  epicDropdownCardId,
  isDuplicate,
  isSelected,
  onToggleSelect,
  onOpenEpicStories,
  onSetCardEpic,
  onToggleEpicDropdown,
  onContextMenu
}: CardProps): JSX.Element {
  const lastClickRef = useRef<number>(0)
  const epicSearchRef = useRef<HTMLInputElement>(null)
  const [epicSearchQuery, setEpicSearchQuery] = useState('')

  const isDropdownOpen = epicDropdownCardId === card.id

  // Reset search query and focus the input whenever this card's dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setEpicSearchQuery('')
      // Defer focus so the input is mounted before we try to focus it
      requestAnimationFrame(() => epicSearchRef.current?.focus())
    }
  }, [isDropdownOpen])

  const handleClick = () => {
    if (!isEpicBoard) return
    const now = Date.now()
    if (now - lastClickRef.current < 350) {
      // Double-click detected
      onOpenEpicStories(card.id, card.name)
    }
    lastClickRef.current = now
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${styles.card} ${snapshot.isDragging ? styles.cardDragging : ''} ${isDuplicate ? styles.cardDuplicate : ''} ${isSelected ? styles.cardSelected : ''}`}
          onClick={handleClick}
          onContextMenu={onContextMenu}
          title={isEpicBoard ? 'Double-click to see stories in this epic' : undefined}
        >
          <div className={styles.cardHeader}>
            <span className={styles.cardName}>
              {isDuplicate && (
                <span className={styles.duplicateBadge} title="Duplicate title">
                  ⊖
                </span>
              )}
              {card.name}
            </span>
            {isStoryBoard && (
              <button
                className={`${styles.cardCheckbox} ${isSelected ? styles.cardCheckboxChecked : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelect(card.id)
                }}
                title={isSelected ? 'Deselect card' : 'Select card'}
                aria-label={isSelected ? 'Deselect card' : 'Select card'}
                aria-pressed={isSelected}
              >
                {isSelected ? '✓' : ''}
              </button>
            )}
          </div>

          {/* Epic label (story board only) */}
          {isStoryBoard && (
            <div className={styles.epicRow}>
              <button
                className={card.epicCardName ? styles.epicChip : styles.epicChipEmpty}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleEpicDropdown(card.id)
                }}
                title="Assign epic"
              >
                {card.epicCardName ? `⚡ ${card.epicCardName}` : '+ Epic'}
              </button>

              {isDropdownOpen && (
                <div className={styles.epicDropdown} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.epicDropdownSearch}>
                    <input
                      ref={epicSearchRef}
                      type="text"
                      className={styles.epicDropdownSearchInput}
                      placeholder="Search epics…"
                      value={epicSearchQuery}
                      onChange={(e) => setEpicSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    className={styles.epicDropdownItem}
                    onClick={() => onSetCardEpic(card.id, null)}
                  >
                    — None
                  </button>
                  {epicCardOptions
                    .filter(
                      (opt) =>
                        !epicSearchQuery.trim() ||
                        fuzzyMatch(epicSearchQuery, `${opt.name} ${opt.listName}`)
                    )
                    .map((opt) => (
                      <button
                        key={opt.id}
                        className={`${styles.epicDropdownItem} ${card.epicCardId === opt.id ? styles.epicDropdownItemActive : ''}`}
                        onClick={() => onSetCardEpic(card.id, opt.id)}
                      >
                        <span className={styles.epicDropdownName}>{opt.name}</span>
                        <span className={styles.epicDropdownList}>{opt.listName}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Epic board hint */}
          {isEpicBoard && (
            <span className={styles.epicBoardHint}>⚡ Epic — double-click for stories</span>
          )}

          <div className={styles.cardFooter}>
            {card.labels.length > 0 && (
              <div className={styles.labels}>
                {card.labels.map((label) => {
                  const bg = labelColor(label.color)
                  return (
                    <span
                      key={label.id}
                      className={styles.label}
                      style={{ background: bg, color: labelTextColor(bg) }}
                      title={label.name || label.color}
                    >
                      {label.name || label.color}
                    </span>
                  )
                })}
              </div>
            )}

            <div className={styles.cardActions}>
              {card.members.length > 0 && (
                <div className={styles.members}>
                  {card.members.map((member) => (
                    <span key={member.id} className={styles.memberAvatar} title={member.fullName}>
                      {member.fullName.charAt(0).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.cardMeta}>
                {card.enteredAt && (
                  <span
                    className={styles.columnAge}
                    title={`In this column since ${new Date(card.enteredAt).toLocaleString()}`}
                  >
                    {formatAge(card.enteredAt)}
                  </span>
                )}

                {card.shortUrl && (
                  <a
                    href={card.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.trelloLink}
                    title="Open in Trello"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}

// ─── Trello label colour map ──────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  green: '#61bd4f',
  yellow: '#f2d600',
  orange: '#ff9f1a',
  red: '#eb5a46',
  purple: '#c377e0',
  blue: '#0079bf',
  sky: '#00c2e0',
  lime: '#51e898',
  pink: '#ff78cb',
  black: '#344563'
}

function labelColor(color: string): string {
  return LABEL_COLORS[color] ?? '#8892a4'
}

/**
 * Returns '#fff' or '#222' depending on which gives better contrast against
 * the given hex background colour (e.g. '#61bd4f').
 * Uses the WCAG relative-luminance formula.
 */
function labelTextColor(hex: string): string {
  // Normalise: strip '#', expand 3-char shorthand to 6-char full form
  let c = hex.replace('#', '')
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
  if (c.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(c)) return '#fff'
  const r = parseInt(c.substring(0, 2), 16) / 255
  const g = parseInt(c.substring(2, 4), 16) / 255
  const b = parseInt(c.substring(4, 6), 16) / 255
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.179 ? '#222' : '#fff'
}

// ─── fuzzy matching ───────────────────────────────────────────────────────────

/** Returns true when every character of `needle` appears in `haystack` in order. */
function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = needle.toLowerCase()
  const h = haystack.toLowerCase()
  const nLen = n.length
  let ni = 0
  for (let i = 0; i < h.length && ni < nLen; i++) {
    if (h[i] === n[ni]) ni++
  }
  return ni === nLen
}

// ─── age formatting ───────────────────────────────────────────────────────────

/** Returns a compact human-readable age string for the given ISO timestamp (e.g. "3d", "2h", "45m"). */
function formatAge(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime()
  if (ms < 0) return '—'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 365) return `${days}d`
  return `${Math.floor(days / 365)}y`
}
