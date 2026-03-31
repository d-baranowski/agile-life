import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  fetchBoardData,
  fetchGenerateTemplateGroups,
  fetchGenerateTemplates,
  generateCardsFromTemplate,
  genModalOpened,
  genModalClosed
} from '../kanbanSlice'

export function useGenerateTemplate(boardId: string) {
  const dispatch = useAppDispatch()
  const showGenModal = useAppSelector((s) => s.kanban.showGenModal)
  const genGroups = useAppSelector((s) => s.kanban.genGroups)
  const genGroupId = useAppSelector((s) => s.kanban.genGroupId)
  const genTemplates = useAppSelector((s) => s.kanban.genTemplates)
  const genLoading = useAppSelector((s) => s.kanban.genLoading)
  const genGenerating = useAppSelector((s) => s.kanban.genGenerating)
  const genResult = useAppSelector((s) => s.kanban.genResult)
  const genError = useAppSelector((s) => s.kanban.genError)

  const handleOpenGenModal = useCallback(() => {
    dispatch(genModalOpened())
    dispatch(fetchGenerateTemplateGroups(boardId))
  }, [boardId, dispatch])

  const handleGenGroupChange = useCallback(
    (groupId: number) => {
      dispatch(fetchGenerateTemplates({ boardId, groupId }))
    },
    [boardId, dispatch]
  )

  const handleGenerateFromModal = useCallback(() => {
    if (genGroupId === null) return
    dispatch(generateCardsFromTemplate({ boardId, groupId: genGroupId })).then((action) => {
      if (generateCardsFromTemplate.fulfilled.match(action)) {
        dispatch(fetchBoardData(boardId))
      }
    })
  }, [boardId, genGroupId, dispatch])

  const handleCloseGenModal = useCallback(() => {
    dispatch(genModalClosed())
  }, [dispatch])

  return {
    showGenModal,
    genGroups,
    genGroupId,
    genTemplates,
    genLoading,
    genGenerating,
    genResult,
    genError,
    handleOpenGenModal,
    handleGenGroupChange,
    handleGenerateFromModal,
    handleCloseGenModal
  }
}
