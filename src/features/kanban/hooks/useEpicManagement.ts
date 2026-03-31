import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  fetchEpicCards,
  fetchEpicStories,
  epicDropdownToggled,
  epicDropdownClosed,
  epicStoriesOpened,
  epicStoriesClosed,
  cardEpicUpdated
} from '../kanbanSlice'
import { api } from '../../api/useApi'

export function useEpicManagement(boardId: string, isStoryBoard: boolean) {
  const dispatch = useAppDispatch()
  const epicCardOptions = useAppSelector((s) => s.kanban.epicCardOptions)
  const epicStoriesCard = useAppSelector((s) => s.kanban.epicStoriesCard)
  const epicStories = useAppSelector((s) => s.kanban.epicStories)
  const epicStoriesLoading = useAppSelector((s) => s.kanban.epicStoriesLoading)
  const epicDropdownCardId = useAppSelector((s) => s.kanban.epicDropdownCardId)

  // Load epic card options when this is a story board
  useEffect(() => {
    if (!isStoryBoard) return
    dispatch(fetchEpicCards(boardId))
  }, [boardId, isStoryBoard, dispatch])

  // Open epic stories modal (double-click on epic board card)
  const handleOpenEpicStories = useCallback(
    (cardId: string, cardName: string) => {
      dispatch(epicStoriesOpened({ id: cardId, name: cardName }))
      dispatch(fetchEpicStories(cardId))
    },
    [dispatch]
  )

  const handleCloseEpicStories = useCallback(() => {
    dispatch(epicStoriesClosed())
  }, [dispatch])

  // Assign or clear an epic for a story card
  const handleSetCardEpic = useCallback(
    async (cardId: string, epicCardId: string | null) => {
      dispatch(epicDropdownClosed())
      await api.epics.setCardEpic(boardId, cardId, epicCardId)
      // Optimistically update local state
      const epicName = epicCardId
        ? (epicCardOptions.find((o) => o.id === epicCardId)?.name ?? null)
        : null
      dispatch(cardEpicUpdated({ cardId, epicCardId, epicCardName: epicName }))
    },
    [boardId, epicCardOptions, dispatch]
  )

  const handleToggleEpicDropdown = useCallback(
    (cardId: string) => {
      dispatch(epicDropdownToggled(cardId))
    },
    [dispatch]
  )

  return {
    epicCardOptions,
    epicStoriesCard,
    epicStories,
    epicStoriesLoading,
    epicDropdownCardId,
    handleOpenEpicStories,
    handleCloseEpicStories,
    handleSetCardEpic,
    handleToggleEpicDropdown
  }
}
