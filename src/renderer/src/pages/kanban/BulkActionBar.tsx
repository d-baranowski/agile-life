import type { EpicCardOption } from '@shared/board.types'
import type { TrelloMember } from '@shared/trello.types'
import styled from 'styled-components'
import { fuzzyMatch } from '../../lib/fuzzy-match'

const ActionBar = styled.div`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1500;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--color-surface);
  border: 1px solid rgba(147, 112, 219, 0.5);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
`

const CardCount = styled.span`
  font-size: 0.82rem;
  font-weight: 600;
  color: #9370db;
`

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const EpicWrapper = styled.div`
  position: relative;
`

const EpicButton = styled.button`
  padding: 5px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(147, 112, 219, 0.5);
  background: rgba(147, 112, 219, 0.15);
  color: #9370db;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition),
    border-color var(--transition);

  &:hover {
    background: rgba(147, 112, 219, 0.28);
    border-color: rgba(147, 112, 219, 0.8);
  }
`

const EpicDropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 100;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  min-width: 200px;
  max-width: 280px;
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

const EpicSearchWrapper = styled.div`
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-surface);
  z-index: 1;
  flex-shrink: 0;
`

const EpicSearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  font-size: 0.78rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  outline: none;
  font-family: inherit;

  &:focus {
    border-color: var(--color-accent, #9370db);
  }
`

const EpicDropdownItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 12px;
  font-size: 0.8rem;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition);
  gap: 2px;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--color-surface-2);
  }
`

const EpicName = styled.span`
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
`

const EpicListLabel = styled.span`
  font-size: 0.68rem;
  color: var(--color-text-muted);
`

const ArchiveButton = styled.button`
  padding: 5px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(220, 80, 80, 0.5);
  background: rgba(220, 80, 80, 0.12);
  color: #e05555;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition),
    border-color var(--transition);

  &:hover:not(:disabled) {
    background: rgba(220, 80, 80, 0.25);
    border-color: rgba(220, 80, 80, 0.8);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const ClearButton = styled.button`
  padding: 5px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  cursor: pointer;
  transition:
    border-color var(--transition),
    color var(--transition);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
`

const MemberDropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 200;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  min-width: 180px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 0;
`

const MemberDropdownLabel = styled.div`
  padding: 4px 12px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const MemberDropdownDivider = styled.div`
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
`

const MemberDropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 7px 12px;
  text-align: left;
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background var(--transition);

  &:hover {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
`

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
          <EpicWrapper ref={bulkEpicDropdownRef}>
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
          <EpicWrapper ref={bulkMemberDropdownRef}>
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
