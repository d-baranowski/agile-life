import { useState, useCallback, useEffect } from 'react'
import type { KanbanColumn } from '@shared/trello.types'
import type { EpicCardOption, EpicStory } from '@shared/board.types'
import { api } from '../../../hooks/useApi'

export function useEpicManagement(
  boardId: string,
  isStoryBoard: boolean,
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>
) {
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

  // Load epic card options when this is a story board
  useEffect(() => {
    if (!isStoryBoard) return
    api.epics.getCards(boardId).then((result) => {
      if (result.success && result.data) setEpicCardOptions(result.data)
    })
  }, [boardId, isStoryBoard])

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

  const handleCloseEpicStories = useCallback(() => {
    setEpicStoriesCard(null)
    setEpicStories(null)
  }, [])

  // Assign or clear an epic for a story card
  const handleSetCardEpic = useCallback(
    async (cardId: string, epicCardId: string | null) => {
      setEpicDropdownCardId(null)
      await api.epics.setCardEpic(boardId, cardId, epicCardId)
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
    [boardId, epicCardOptions, setColumns]
  )

  const handleToggleEpicDropdown = useCallback((cardId: string) => {
    setEpicDropdownCardId((prev) => (prev === cardId ? null : cardId))
  }, [])

  return {
    epicCardOptions,
    epicStoriesCard,
    epicStories,
    epicStoriesLoading,
    epicDropdownCardId,
    setEpicDropdownCardId,
    handleOpenEpicStories,
    handleCloseEpicStories,
    handleSetCardEpic,
    handleToggleEpicDropdown
  }
}
