import type { EpicCardOption } from '../../lib/board.types'
import type { TrelloMember } from '../../trello/trello.types'
import { fuzzyMatch } from '../../lib/fuzzy-match'
import {
  ActionBar,
  CardCount,
  Controls,
  ClearButton,
  ArchiveButton
} from './styled/action-bar.styled'
import {
  EpicWrapper,
  EpicButton,
  EpicDropdown,
  EpicSearchWrapper,
  EpicSearchInput,
  EpicDropdownItem,
  EpicName,
  EpicListLabel
} from './styled/epic-dropdown.styled'
import {
  MemberDropdown,
  MemberDropdownLabel,
  MemberDropdownDivider,
  MemberDropdownItem
} from './styled/member-dropdown.styled'

interface Props {
  selectedCardCount: number
  isStoryBoard: boolean
  epicCardOptions: EpicCardOption[]
  boardLabelsExist: boolean
  boardMembers: TrelloMember[]
  bulkEpicDropdownOpen: boolean
  bulkEpicDropdownRef: React.RefObject<HTMLDivElement | null>
  bulkEpicSearch: string
  bulkMemberDropdownOpen: boolean
  bulkMemberDropdownRef: React.RefObject<HTMLDivElement | null>
  onToggleBulkEpicDropdown: () => void
  onBulkEpicSearchChange: (value: string) => void
  onBulkSetEpic: (epicCardId: string | null) => void
  onOpenBulkLabel: () => void
  onBulkArchive: () => void
  onToggleBulkMemberDropdown: () => void
  onOpenBulkMemberModal: (memberId: string, memberName: string, assign: boolean) => void
  onClearSelection: () => void
}

export default function BulkActionBar(props: Props): JSX.Element {
  const {
    selectedCardCount,
    isStoryBoard,
    epicCardOptions,
    boardLabelsExist,
    boardMembers,
    bulkEpicDropdownOpen,
    bulkEpicDropdownRef,
    bulkEpicSearch,
    bulkMemberDropdownOpen,
    bulkMemberDropdownRef,
    onToggleBulkEpicDropdown,
    onBulkEpicSearchChange,
    onBulkSetEpic,
    onOpenBulkLabel,
    onBulkArchive,
    onToggleBulkMemberDropdown,
    onOpenBulkMemberModal,
    onClearSelection
  } = props

  return (
    <ActionBar>
      <CardCount>
        {selectedCardCount} card{selectedCardCount !== 1 ? 's' : ''} selected
      </CardCount>
      <Controls>
        {isStoryBoard && (
          <EpicWrapper ref={bulkEpicDropdownRef as React.RefObject<HTMLDivElement>}>
            <EpicButton onClick={onToggleBulkEpicDropdown}>⚡ Set Epic</EpicButton>
            {bulkEpicDropdownOpen && (
              <EpicDropdown>
                <EpicSearchWrapper>
                  <EpicSearchInput
                    type="text"
                    placeholder="Search epics…"
                    value={bulkEpicSearch}
                    onChange={(e) => onBulkEpicSearchChange(e.target.value)}
                    autoFocus
                  />
                </EpicSearchWrapper>
                <EpicDropdownItem onClick={() => onBulkSetEpic(null)}>— None</EpicDropdownItem>
                {epicCardOptions
                  .filter(
                    (opt) =>
                      !bulkEpicSearch.trim() ||
                      fuzzyMatch(bulkEpicSearch, `${opt.name} ${opt.listName}`)
                  )
                  .map((opt) => (
                    <EpicDropdownItem key={opt.id} onClick={() => onBulkSetEpic(opt.id)}>
                      <EpicName>{opt.name}</EpicName>
                      <EpicListLabel>{opt.listName}</EpicListLabel>
                    </EpicDropdownItem>
                  ))}
              </EpicDropdown>
            )}
          </EpicWrapper>
        )}
        {isStoryBoard && boardLabelsExist && (
          <EpicButton onClick={onOpenBulkLabel}>🏷️ Set Label</EpicButton>
        )}
        {boardMembers.length > 0 && (
          <EpicWrapper ref={bulkMemberDropdownRef as React.RefObject<HTMLDivElement>}>
            <EpicButton onClick={onToggleBulkMemberDropdown}>👤 Set Member</EpicButton>
            {bulkMemberDropdownOpen && (
              <MemberDropdown>
                <MemberDropdownLabel>Assign to:</MemberDropdownLabel>
                {boardMembers.map((member) => (
                  <MemberDropdownItem
                    key={member.id}
                    onClick={() => onOpenBulkMemberModal(member.id, member.fullName, true)}
                  >
                    {member.fullName}
                  </MemberDropdownItem>
                ))}
                <MemberDropdownDivider />
                <MemberDropdownLabel>Remove from:</MemberDropdownLabel>
                {boardMembers.map((member) => (
                  <MemberDropdownItem
                    key={`remove-${member.id}`}
                    onClick={() => onOpenBulkMemberModal(member.id, member.fullName, false)}
                  >
                    {member.fullName}
                  </MemberDropdownItem>
                ))}
              </MemberDropdown>
            )}
          </EpicWrapper>
        )}
        <ArchiveButton onClick={onBulkArchive}>{`🗄️ Archive ${selectedCardCount}`}</ArchiveButton>
        <ClearButton onClick={onClearSelection} title="Clear selection (Esc)">
          ✕ Clear
        </ClearButton>
      </Controls>
    </ActionBar>
  )
}
