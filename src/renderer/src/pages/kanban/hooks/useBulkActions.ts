import { useState, useCallback, useRef, useEffect } from 'react'
import type { KanbanColumn, KanbanCard } from '@shared/trello.types'
import type { EpicCardOption } from '@shared/board.types'
import { api } from '../../../hooks/useApi'

export function useBulkActions(
  boardId: string,
  columns: KanbanColumn[],
  epicCardOptions: EpicCardOption[],
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>,
  setToastMessage: (msg: string | null) => void,
  loadBoardData: () => Promise<void>
) {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const [bulkEpicDropdownOpen, setBulkEpicDropdownOpen] = useState(false)
  const bulkEpicDropdownRef = useRef<HTMLDivElement>(null)
  const [isBulkArchiving, setIsBulkArchiving] = useState(false)

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

  const handleBulkArchive = useCallback(async () => {
    if (selectedCardIds.size === 0) return
    setIsBulkArchiving(true)
    const cardIds = [...selectedCardIds]
    const prevColumns = columns
    setColumns((prev) =>
      prev.map((col) => ({ ...col, cards: col.cards.filter((c) => !selectedCardIds.has(c.id)) }))
    )
    setSelectedCardIds(new Set())
    const result = await api.trello.archiveCards(boardId, cardIds)
    setIsBulkArchiving(false)
    if (!result.success) {
      setColumns(prevColumns)
      setToastMessage(result.error ?? 'Failed to archive cards. Please try again.')
    } else if (result.data && result.data.skippedCount > 0) {
      setToastMessage(
        `Archived ${result.data.archivedCount} card(s). ${result.data.skippedCount} could not be archived.`
      )
    }
  }, [boardId, columns, selectedCardIds, setColumns, setToastMessage])

  // Close bulk epic dropdown on outside click
  useEffect(() => {
    if (!bulkEpicDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (bulkEpicDropdownRef.current && !bulkEpicDropdownRef.current.contains(e.target as Node))
        setBulkEpicDropdownOpen(false)
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [bulkEpicDropdownOpen])

  const onCardsCreated = useCallback((listId: string, cards: KanbanCard[]) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === listId ? { ...col, cards: [...col.cards, ...cards] } : col))
    )
  }, [setColumns])

  return {
    selectedCardIds,
    setSelectedCardIds,
    bulkEpicDropdownOpen,
    setBulkEpicDropdownOpen,
    bulkEpicDropdownRef,
    isBulkArchiving,
    handleToggleSelectCard,
    handleBulkSetEpic,
    handleBulkArchive,
    onCardsCreated
  }
}
