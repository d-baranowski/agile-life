import { useState, useCallback } from 'react'
import type { TemplateGroup, TicketTemplate, GenerateCardsResult } from '@shared/template.types'
import { api } from '../../../hooks/useApi'

export function useGenerateTemplate(boardId: string, loadBoardData: () => Promise<void>) {
  const [showGenModal, setShowGenModal] = useState(false)
  const [genGroups, setGenGroups] = useState<TemplateGroup[]>([])
  const [genGroupId, setGenGroupId] = useState<number | null>(null)
  const [genTemplates, setGenTemplates] = useState<TicketTemplate[]>([])
  const [genLoading, setGenLoading] = useState(false)
  const [genGenerating, setGenGenerating] = useState(false)
  const [genResult, setGenResult] = useState<GenerateCardsResult | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  const handleOpenGenModal = useCallback(async () => {
    setShowGenModal(true)
    setGenGroupId(null)
    setGenTemplates([])
    setGenResult(null)
    setGenError(null)
    const result = await api.templates.getGroups(boardId)
    if (result.success && result.data) {
      setGenGroups(result.data)
    } else {
      setGenError(result.error ?? 'Failed to load template groups.')
    }
  }, [boardId])

  const handleGenGroupChange = useCallback(
    async (groupId: number) => {
      setGenGroupId(groupId)
      setGenResult(null)
      setGenError(null)
      setGenLoading(true)
      const result = await api.templates.getTemplates(boardId, groupId)
      setGenLoading(false)
      if (result.success && result.data) setGenTemplates(result.data)
      else setGenError(result.error ?? 'Failed to load templates.')
    },
    [boardId]
  )

  const handleGenerateFromModal = useCallback(async () => {
    if (genGroupId === null) return
    setGenGenerating(true)
    setGenResult(null)
    setGenError(null)
    const result = await api.templates.generateCards(boardId, genGroupId)
    setGenGenerating(false)
    if (result.success && result.data) {
      setGenResult(result.data)
      loadBoardData()
    } else {
      setGenError(result.error ?? 'Failed to generate cards.')
    }
  }, [boardId, genGroupId, loadBoardData])

  const handleCloseGenModal = useCallback(() => {
    setShowGenModal(false)
  }, [])

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
