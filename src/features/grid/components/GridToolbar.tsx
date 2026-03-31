import { useRef, useState, useEffect } from 'react'
import type { TrelloMember } from '../../../trello/trello.types'
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
  ExportBtn,
  MemberWrapper,
  MemberDropdown,
  MemberDropdownLabel,
  MemberDropdownDivider,
  MemberDropdownItem
} from '../styled/grid-toolbar.styled'

interface Props {
  isStoryBoard: boolean
  boardMembers: TrelloMember[]
  onExport: () => void
  onOpenBulkArchive: () => void
  onOpenBulkLabel: () => void
  onOpenBulkMemberModal: (memberId: string, memberName: string, assign: boolean) => void
}

export default function GridToolbar(props: Props): JSX.Element {
  const {
    isStoryBoard,
    boardMembers,
    onExport,
    onOpenBulkArchive,
    onOpenBulkLabel,
    onOpenBulkMemberModal
  } = props
  const dispatch = useAppDispatch()

  const searchQuery = useAppSelector((s) => s.kanban.searchQuery)
  const epicFilter = useAppSelector((s) => s.kanban.epicFilter)
  const showDuplicates = useAppSelector((s) => s.kanban.showDuplicates)
  const filterUnassigned = useAppSelector((s) => s.kanban.filterUnassigned)
  const filterNoEpic = useAppSelector((s) => s.kanban.filterNoEpic)
  const filterNoSize = useAppSelector((s) => s.kanban.filterNoSize)
  const epicCardOptions = useAppSelector((s) => s.kanban.epicCardOptions)
  const selectedCardIds = useAppSelector((s) => s.kanban.selectedCardIds)

  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false)
  const memberWrapperRef = useRef<HTMLDivElement>(null)

  const selectedCount = selectedCardIds.length

  useEffect(() => {
    if (!memberDropdownOpen) return
    const handleClick = (e: MouseEvent): void => {
      if (memberWrapperRef.current && !memberWrapperRef.current.contains(e.target as Node)) {
        setMemberDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [memberDropdownOpen])

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
          {boardMembers.length > 0 && (
            <MemberWrapper ref={memberWrapperRef}>
              <BulkBtn onClick={() => setMemberDropdownOpen((o) => !o)}>👤 Member</BulkBtn>
              {memberDropdownOpen && (
                <MemberDropdown>
                  <MemberDropdownLabel>Assign to:</MemberDropdownLabel>
                  {boardMembers.map((m) => (
                    <MemberDropdownItem
                      key={m.id}
                      onClick={() => {
                        setMemberDropdownOpen(false)
                        onOpenBulkMemberModal(m.id, m.fullName, true)
                      }}
                    >
                      {m.fullName}
                    </MemberDropdownItem>
                  ))}
                  <MemberDropdownDivider />
                  <MemberDropdownLabel>Remove from:</MemberDropdownLabel>
                  {boardMembers.map((m) => (
                    <MemberDropdownItem
                      key={`remove-${m.id}`}
                      onClick={() => {
                        setMemberDropdownOpen(false)
                        onOpenBulkMemberModal(m.id, m.fullName, false)
                      }}
                    >
                      {m.fullName}
                    </MemberDropdownItem>
                  ))}
                </MemberDropdown>
              )}
            </MemberWrapper>
          )}
        </>
      )}

      <ExportBtn onClick={onExport}>⬇ Export</ExportBtn>
    </Toolbar>
  )
}
