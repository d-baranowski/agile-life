import { useCallback } from 'react'
import { api } from '../../api/useApi'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  activeTimerSet,
  activeTimerCleared,
  cardTimerTotalsReplaced,
  timerModalOpened,
  timerModalClosed,
  timerModalEntriesLoaded,
  timerModalEntryUpserted,
  timerModalEntryRemoved,
  kanbanToastShown
} from '../kanbanSlice'
import type { TimerEntryEdit } from '../../timers/timer.types'

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rem = s % 60
  if (h > 0) return `${h}h ${m}m ${rem}s`
  if (m > 0) return `${m}m ${rem}s`
  return `${rem}s`
}

export function useTimerActions(boardId: string) {
  const dispatch = useAppDispatch()
  const activeTimers = useAppSelector((s) => s.kanban.activeTimers)

  const refreshTotals = useCallback(async () => {
    const result = await api.timers.getTotals(boardId)
    if (result.success && result.data) {
      dispatch(cardTimerTotalsReplaced(result.data))
    }
  }, [boardId, dispatch])

  const handleStartTimer = useCallback(
    async (cardId: string) => {
      const result = await api.timers.start(boardId, cardId, '')
      if (result.success && result.data) {
        dispatch(activeTimerSet(result.data))
        dispatch(kanbanToastShown('⏱ Timer started'))
      } else {
        dispatch(kanbanToastShown(result.error ?? 'Failed to start timer.'))
      }
    },
    [boardId, dispatch]
  )

  // Note: start alone doesn't change totals (stopped-entry sum); stop/update/delete/createManual do.

  const handleStopTimer = useCallback(
    async (cardId: string) => {
      const active = activeTimers[cardId]
      if (!active) return
      const result = await api.timers.stop(active.id)
      if (result.success && result.data) {
        dispatch(activeTimerCleared(cardId))
        dispatch(
          kanbanToastShown(`⏱ Timer stopped — ${formatDuration(result.data.durationSeconds)}`)
        )
        void refreshTotals()
      } else {
        dispatch(kanbanToastShown(result.error ?? 'Failed to stop timer.'))
      }
    },
    [activeTimers, dispatch, refreshTotals]
  )

  const handleToggleTimer = useCallback(
    (cardId: string) => {
      if (activeTimers[cardId]) return handleStopTimer(cardId)
      return handleStartTimer(cardId)
    },
    [activeTimers, handleStartTimer, handleStopTimer]
  )

  const handleOpenTimerModal = useCallback(
    async (cardId: string) => {
      dispatch(timerModalOpened(cardId))
      const result = await api.timers.listForCard(cardId)
      if (result.success && result.data) {
        dispatch(timerModalEntriesLoaded(result.data))
      } else {
        dispatch(timerModalEntriesLoaded([]))
        dispatch(kanbanToastShown(result.error ?? 'Failed to load timer entries.'))
      }
    },
    [dispatch]
  )

  const handleCloseTimerModal = useCallback(() => {
    dispatch(timerModalClosed())
  }, [dispatch])

  const handleUpdateEntry = useCallback(
    async (entryId: string, fields: TimerEntryEdit) => {
      const result = await api.timers.update(entryId, fields)
      if (result.success && result.data) {
        dispatch(timerModalEntryUpserted(result.data))
        if (result.data.stoppedAt === null) {
          dispatch(activeTimerSet(result.data))
        } else {
          dispatch(activeTimerCleared(result.data.cardId))
        }
        void refreshTotals()
      } else {
        dispatch(kanbanToastShown(result.error ?? 'Failed to update timer entry.'))
      }
    },
    [dispatch, refreshTotals]
  )

  const handleDeleteEntry = useCallback(
    async (entryId: string, cardId: string) => {
      const result = await api.timers.delete(entryId)
      if (result.success) {
        dispatch(timerModalEntryRemoved(entryId))
        if (activeTimers[cardId]?.id === entryId) {
          dispatch(activeTimerCleared(cardId))
        }
        void refreshTotals()
      } else {
        dispatch(kanbanToastShown(result.error ?? 'Failed to delete timer entry.'))
      }
    },
    [activeTimers, dispatch, refreshTotals]
  )

  const handleCreateManualEntry = useCallback(
    async (
      cardId: string,
      fields: { startedAt: string; stoppedAt: string; durationSeconds: number; note: string }
    ) => {
      const result = await api.timers.createManual(boardId, cardId, fields)
      if (result.success && result.data) {
        dispatch(timerModalEntryUpserted(result.data))
        void refreshTotals()
      } else {
        dispatch(kanbanToastShown(result.error ?? 'Failed to create timer entry.'))
      }
    },
    [boardId, dispatch, refreshTotals]
  )

  return {
    handleStartTimer,
    handleStopTimer,
    handleToggleTimer,
    handleOpenTimerModal,
    handleCloseTimerModal,
    handleUpdateEntry,
    handleDeleteEntry,
    handleCreateManualEntry
  }
}
