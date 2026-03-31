import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  searchQueryChanged,
  epicFilterChanged,
  duplicatesToggled,
  unassignedToggled,
  noEpicToggled,
  noSizeToggled
} from '../../kanban/kanbanSlice'
import { EpicFilterSelect } from '../../kanban/components/EpicFilterSelect'
import {
  Toolbar,
  SearchInput,
  FilterBtn,
  Spacer,
  SelectionCount,
  BulkBtn,
  ExportBtn
} from '../styled/grid-toolbar.styled'

interface Props {
  isStoryBoard: boolean
  onExport: () => void
  onOpenBulkArchive: () => void
  onOpenBulkLabel: () => void
  onOpenBulkMember: () => void
}

export default function GridToolbar(props: Props): JSX.Element {
  const { isStoryBoard, onExport, onOpenBulkArchive, onOpenBulkLabel, onOpenBulkMember } = props
  const dispatch = useAppDispatch()

  const searchQuery = useAppSelector((s) => s.kanban.searchQuery)
  const epicFilter = useAppSelector((s) => s.kanban.epicFilter)
  const showDuplicates = useAppSelector((s) => s.kanban.showDuplicates)
  const filterUnassigned = useAppSelector((s) => s.kanban.filterUnassigned)
  const filterNoEpic = useAppSelector((s) => s.kanban.filterNoEpic)
  const filterNoSize = useAppSelector((s) => s.kanban.filterNoSize)
  const epicCardOptions = useAppSelector((s) => s.kanban.epicCardOptions)
  const selectedCardIds = useAppSelector((s) => s.kanban.selectedCardIds)

  const selectedCount = selectedCardIds.length

  return (
    <Toolbar>
      <SearchInput
        type="text"
        placeholder="Search cards…"
        value={searchQuery}
        onChange={(e) => dispatch(searchQueryChanged(e.target.value))}
      />

      {isStoryBoard && (
        <EpicFilterSelect
          epicCards={epicCardOptions}
          value={epicFilter}
          onChange={(v) => dispatch(epicFilterChanged(v))}
        />
      )}

      <FilterBtn $active={showDuplicates} onClick={() => dispatch(duplicatesToggled())}>
        Dupes
      </FilterBtn>
      <FilterBtn $active={filterUnassigned} onClick={() => dispatch(unassignedToggled())}>
        Unassigned
      </FilterBtn>
      <FilterBtn $active={filterNoEpic} onClick={() => dispatch(noEpicToggled())}>
        No Epic
      </FilterBtn>
      <FilterBtn $active={filterNoSize} onClick={() => dispatch(noSizeToggled())}>
        No Size
      </FilterBtn>

      <Spacer />

      {selectedCount > 0 && (
        <>
          <SelectionCount>{selectedCount} selected</SelectionCount>
          <BulkBtn onClick={onOpenBulkArchive}>🗄 Archive</BulkBtn>
          <BulkBtn onClick={onOpenBulkLabel}>🏷 Label</BulkBtn>
          <BulkBtn onClick={onOpenBulkMember}>👤 Member</BulkBtn>
        </>
      )}

      <ExportBtn onClick={onExport}>⬇ Export</ExportBtn>
    </Toolbar>
  )
}
