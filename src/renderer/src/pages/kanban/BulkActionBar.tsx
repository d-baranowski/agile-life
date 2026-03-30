import type { EpicCardOption } from '@shared/board.types'
import styles from '../KanbanPage.module.css'

interface Props {
  selectedCardCount: number
  isStoryBoard: boolean
  epicCardOptions: EpicCardOption[]
  boardLabelsExist: boolean
  bulkEpicDropdownOpen: boolean
  bulkEpicDropdownRef: React.RefObject<HTMLDivElement | null>
  isBulkArchiving: boolean
  onToggleBulkEpicDropdown: () => void
  onBulkSetEpic: (epicCardId: string | null) => void
  onOpenBulkLabel: () => void
  onBulkArchive: () => void
  onClearSelection: () => void
}

export default function BulkActionBar({
  selectedCardCount,
  isStoryBoard,
  epicCardOptions,
  boardLabelsExist,
  bulkEpicDropdownOpen,
  bulkEpicDropdownRef,
  isBulkArchiving,
  onToggleBulkEpicDropdown,
  onBulkSetEpic,
  onOpenBulkLabel,
  onBulkArchive,
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
                <button
                  className={styles.bulkEpicDropdownItem}
                  onClick={() => onBulkSetEpic(null)}
                >
                  — None
                </button>
                {epicCardOptions.map((opt) => (
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
        <button
          className={styles.bulkArchiveBtn}
          onClick={onBulkArchive}
          disabled={isBulkArchiving}
        >
          {isBulkArchiving ? 'Archiving…' : `🗄️ Archive ${selectedCardCount}`}
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
