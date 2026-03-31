import { useMemo } from 'react'
import type { KanbanColumn } from '../../../trello/trello.types'
import type { StoryPointRule } from '../../../lib/board.types'
import { useAppSelector } from '../../../store/hooks'
import { selectDuplicateNames, selectEpicColumns } from '../kanbanSlice'
import { fuzzyMatch } from '../../../lib/fuzzy-match'

interface FilteredColumnsResult {
  filteredColumns: KanbanColumn[]
  duplicateNames: Set<string>
  epicColumns: { listId: string; listName: string }[]
  hasActiveMenuFilter: boolean
}

/**
 * Reads kanban filter state from Redux and derives the filtered columns.
 *
 * Keeps the expensive per-card filtering in a `useMemo` so KanbanPage stays
 * declarative — no giant `createSelector` with 11+ inputs.
 *
 * @param storyPointsConfig – the board's story-point rules (from props)
 */
export function useFilteredColumns(storyPointsConfig: StoryPointRule[]): FilteredColumnsResult {
  const columns = useAppSelector((s) => s.kanban.columns)
  const searchQuery = useAppSelector((s) => s.kanban.searchQuery)
  const epicFilter = useAppSelector((s) => s.kanban.epicFilter)
  const epicColumnFilter = useAppSelector((s) => s.kanban.epicColumnFilter)
  const showDuplicates = useAppSelector((s) => s.kanban.showDuplicates)
  const filterUnassigned = useAppSelector((s) => s.kanban.filterUnassigned)
  const filterNoEpic = useAppSelector((s) => s.kanban.filterNoEpic)
  const filterNoSize = useAppSelector((s) => s.kanban.filterNoSize)
  const epicCardOptions = useAppSelector((s) => s.kanban.epicCardOptions)

  const duplicateNames = useAppSelector(selectDuplicateNames)
  const epicColumns = useAppSelector(selectEpicColumns)

  const hasActiveMenuFilter = showDuplicates || filterUnassigned || filterNoEpic || filterNoSize

  const epicCardIdsInColumn = useMemo(
    () =>
      epicColumnFilter
        ? new Set(
            epicCardOptions.filter((opt) => opt.listId === epicColumnFilter).map((opt) => opt.id)
          )
        : null,
    [epicColumnFilter, epicCardOptions]
  )

  const sizeLabelsLower = useMemo(
    () => new Set(storyPointsConfig.map((r) => r.labelName.trim().toLowerCase())),
    [storyPointsConfig]
  )

  const hasAnyFilter = useMemo(
    () => !!searchQuery.trim() || !!epicFilter || !!epicColumnFilter || hasActiveMenuFilter,
    [searchQuery, epicFilter, epicColumnFilter, hasActiveMenuFilter]
  )

  const filteredColumns = useMemo(() => {
    if (!hasAnyFilter) return columns

    return columns.map((col) => ({
      ...col,
      cards: col.cards.filter((card) => {
        if (searchQuery.trim() && !fuzzyMatch(searchQuery, `${card.name} ${card.desc}`))
          return false
        if (epicFilter === '__none__' && card.epicCardId) return false
        if (epicFilter && epicFilter !== '__none__' && card.epicCardId !== epicFilter) return false
        if (epicCardIdsInColumn)
          return card.epicCardId !== null && epicCardIdsInColumn.has(card.epicCardId)
        if (showDuplicates && !duplicateNames.has(card.name.trim().toLowerCase())) return false
        if (filterUnassigned && card.members.length > 0) return false
        if (filterNoEpic && card.epicCardId) return false
        if (filterNoSize) {
          const hasSize = card.labels.some((l) =>
            sizeLabelsLower.has((l.name || '').trim().toLowerCase())
          )
          if (hasSize) return false
        }
        return true
      })
    }))
  }, [
    columns,
    hasAnyFilter,
    searchQuery,
    epicFilter,
    epicCardIdsInColumn,
    showDuplicates,
    duplicateNames,
    filterUnassigned,
    filterNoEpic,
    filterNoSize,
    sizeLabelsLower
  ])

  return { filteredColumns, duplicateNames, epicColumns, hasActiveMenuFilter }
}
