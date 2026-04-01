import { useMemo } from 'react'
import type { StoryPointRule } from '../../../lib/board.types'
import { useFilteredColumns } from '../../kanban/hooks/useFilteredColumns'
import { cardStoryPoints } from '../../../lib/card-story-points'
import type { GridRow } from '../grid.types'

export function useGridRows(storyPointsConfig: StoryPointRule[]): GridRow[] {
  const { filteredColumns } = useFilteredColumns(storyPointsConfig)

  return useMemo(
    () =>
      filteredColumns.flatMap((col) =>
        col.cards.map((card) => ({
          ...card,
          columnId: col.id,
          columnName: col.name,
          storyPoints:
            storyPointsConfig.length > 0 ? cardStoryPoints(card, storyPointsConfig) : null
        }))
      ),
    [filteredColumns, storyPointsConfig]
  )
}
