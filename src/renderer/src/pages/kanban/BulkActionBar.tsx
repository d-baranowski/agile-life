import type { EpicCardOption } from '@shared/board.types'
import type { TrelloMember } from '@shared/trello.types'
import { fuzzyMatch } from '../../lib/fuzzy-match'
import styles from '../KanbanPage.module.css'

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

export default function BulkActionBar({
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
}: Props): JSX.Element {
  return (
    <div className={styles.bulkActionBar}>
      <span className={styles.bulkActionCount}>
        {selectedCardCount} card{selectedCardCount !== 1 ? 's' : ''} selected
      </span>
      <div className={styles.bulkActionControls}>
        {isStoryBoard && (
          <div ref={bulkEpicDropdownRef} className={styles.bulkEpicWrapper}>
            <button className={styles.bulkEpicBtn} onClick={onToggleBulkEpicDropdown}>
              ⚡ Set Epic
            </button>
            {bulkEpicDropdownOpen && (
              <div className={styles.bulkEpicDropdown}>
                <div className={styles.bulkEpicSearchWrapper}>
                  <input
                    type="text"
                    className={styles.bulkEpicSearchInput}
                    placeholder="Search epics…"
                    value={bulkEpicSearch}
                    onChange={(e) => onBulkEpicSearchChange(e.target.value)}
                    autoFocus
                  />
                </div>
                <button className={styles.bulkEpicDropdownItem} onClick={() => onBulkSetEpic(null)}>
                  — None
                </button>
                {epicCardOptions
                  .filter(
                    (opt) =>
                      !bulkEpicSearch.trim() ||
                      fuzzyMatch(bulkEpicSearch, `${opt.name} ${opt.listName}`)
                  )
                  .map((opt) => (
                    <button
                      key={opt.id}
                      className={styles.bulkEpicDropdownItem}
                      onClick={() => onBulkSetEpic(opt.id)}
                    >
                      <span className={styles.epicDropdownName}>{opt.name}</span>
                      <span className={styles.epicDropdownList}>{opt.listName}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
        {isStoryBoard && boardLabelsExist && (
          <button className={styles.bulkEpicBtn} onClick={onOpenBulkLabel}>
            🏷️ Set Label
          </button>
        )}
        {boardMembers.length > 0 && (
          <div ref={bulkMemberDropdownRef} className={styles.bulkEpicWrapper}>
            <button className={styles.bulkEpicBtn} onClick={onToggleBulkMemberDropdown}>
              👤 Set Member
            </button>
            {bulkMemberDropdownOpen && (
              <div className={styles.bulkMemberDropdown}>
                <div className={styles.bulkMemberDropdownLabel}>Assign to:</div>
                {boardMembers.map((member) => (
                  <button
                    key={member.id}
                    className={styles.bulkMemberDropdownItem}
                    onClick={() => onOpenBulkMemberModal(member.id, member.fullName, true)}
                  >
                    {member.fullName}
                  </button>
                ))}
                <div className={styles.bulkMemberDropdownDivider} />
                <div className={styles.bulkMemberDropdownLabel}>Remove from:</div>
                {boardMembers.map((member) => (
                  <button
                    key={`remove-${member.id}`}
                    className={styles.bulkMemberDropdownItem}
                    onClick={() => onOpenBulkMemberModal(member.id, member.fullName, false)}
                  >
                    {member.fullName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button className={styles.bulkArchiveBtn} onClick={onBulkArchive}>
          {`🗄️ Archive ${selectedCardCount}`}
        </button>
        <button
          className={styles.bulkClearBtn}
          onClick={onClearSelection}
          title="Clear selection (Esc)"
        >
          ✕ Clear
        </button>
      </div>
    </div>
  )
}
