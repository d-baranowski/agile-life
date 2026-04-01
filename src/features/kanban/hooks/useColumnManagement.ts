import { useCallback } from 'react'
import type { KanbanColumn } from '../../../trello/trello.types'
import { api } from '../../api/useApi'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { columnAdded, columnRemoved, columnsUpdated, kanbanToastShown } from '../kanbanSlice'

export function useColumnManagement(boardId: string) {
  const dispatch = useAppDispatch()
  const columns = useAppSelector((s) => s.kanban.columns)

  const handleAddColumn = useCallback(
    async (name: string) => {
      const result = await api.trello.createList(boardId, name)
      if (!result.success || !result.data) {
        dispatch(kanbanToastShown(result.error ?? 'Failed to create column. Please try again.'))
        return
      }
      dispatch(columnAdded(result.data))
    },
    [boardId, dispatch]
  )

  const handleRemoveColumn = useCallback(
    async (listId: string) => {
      const prevColumns = columns
      dispatch(columnRemoved(listId))

      const result = await api.trello.archiveList(boardId, listId)
      if (!result.success) {
        dispatch(columnsUpdated(prevColumns))
        dispatch(kanbanToastShown(result.error ?? 'Failed to remove column. Please try again.'))
      }
    },
    [boardId, columns, dispatch]
  )

  const handleReorderColumn = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return

      const reordered = [...columns]
      const [moved] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, moved)

      // Compute a new position for the moved column using neighbour positions
      const prev = toIndex > 0 ? reordered[toIndex - 1] : null
      const next = toIndex < reordered.length - 1 ? reordered[toIndex + 1] : null
      const newPos =
        prev && next
          ? (prev.pos + next.pos) / 2
          : prev
            ? prev.pos + 65536
            : next
              ? next.pos / 2
              : 65536

      const updatedColumns: KanbanColumn[] = reordered.map((col, i) =>
        i === toIndex ? { ...col, pos: newPos } : col
      )

      const prevColumns = columns
      dispatch(columnsUpdated(updatedColumns))

      const result = await api.trello.reorderList(boardId, moved.id, newPos)
      if (!result.success) {
        dispatch(columnsUpdated(prevColumns))
        dispatch(kanbanToastShown(result.error ?? 'Failed to reorder column. Please try again.'))
      }
    },
    [boardId, columns, dispatch]
  )

  return { handleAddColumn, handleRemoveColumn, handleReorderColumn }
}
