import type { StoryPointsRow } from '@shared/board.types'
import styles from '../KanbanPage.module.css'

interface Props {
  meatballRef: React.RefObject<HTMLDivElement | null>
  showMeatball: boolean
  hasActiveMenuFilter: boolean
  showDuplicates: boolean
  duplicateCount: number
  filterUnassigned: boolean
  filterNoEpic: boolean
  filterNoSize: boolean
  isStoryBoard: boolean
  storyPointsConfig: StoryPointsRow[]
  onToggleMeatball: () => void
  onToggleDuplicates: () => void
  onToggleUnassigned: () => void
  onToggleNoEpic: () => void
  onToggleNoSize: () => void
  onOpenTickets: () => void
  onOpenGenerate: () => void
}

export default function KanbanMeatballMenu(props: Props): JSX.Element {
  const {
    meatballRef,
    showMeatball,
    hasActiveMenuFilter,
    showDuplicates,
    duplicateCount,
    filterUnassigned,
    filterNoEpic,
    filterNoSize,
    isStoryBoard,
    storyPointsConfig,
    onToggleMeatball,
    onToggleDuplicates,
    onToggleUnassigned,
    onToggleNoEpic,
    onToggleNoSize,
    onOpenTickets,
    onOpenGenerate
  } = props

  return (
    <div ref={meatballRef} className={styles.meatballWrapper}>
      <button
        className={`${styles.meatballBtn} ${hasActiveMenuFilter ? styles.meatballBtnActive : ''}`}
        onClick={onToggleMeatball}
        title="More options"
        aria-label="More options"
      >
        •••
      </button>
      {showMeatball && (
        <div className={styles.meatballMenu}>
          <button
            className={`${styles.meatballItem} ${showDuplicates ? styles.meatballItemActive : ''}`}
            onClick={onToggleDuplicates}
          >
            ⊖ Duplicates{duplicateCount > 0 && ` (${duplicateCount})`}
          </button>
          <button
            className={`${styles.meatballItem} ${filterUnassigned ? styles.meatballItemActive : ''}`}
            onClick={onToggleUnassigned}
          >
            👤 Unassigned only
          </button>
          {isStoryBoard && (
            <button
              className={`${styles.meatballItem} ${filterNoEpic ? styles.meatballItemActive : ''}`}
              onClick={onToggleNoEpic}
            >
              ⚡ No epic only
            </button>
          )}
          {storyPointsConfig.length > 0 && (
            <button
              className={`${styles.meatballItem} ${filterNoSize ? styles.meatballItemActive : ''}`}
              onClick={onToggleNoSize}
            >
              📏 No size only
            </button>
          )}
          <button className={styles.meatballItem} onClick={onOpenTickets}>
            🎫 Number Tickets
          </button>
          <button className={styles.meatballItem} onClick={onOpenGenerate}>
            📋 Generate from Template
          </button>
        </div>
      )}
    </div>
  )
}
