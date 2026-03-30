import type { EpicStory } from '@shared/board.types'
import styles from '../KanbanPage.module.css'

interface Props {
  cardName: string
  stories: EpicStory[] | null
  loading: boolean
  onClose: () => void
}

export default function EpicStoriesModal({
  cardName,
  stories,
  loading,
  onClose
}: Props): JSX.Element {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.epicModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.epicModalHeader}>
          <h2 className={styles.epicModalTitle}>
            📋 Stories for: <em>{cardName}</em>
          </h2>
          <button className={styles.modalClose} onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>
        {loading ? (
          <div className={styles.epicModalBody}>
            <div className="spinner" />
            <span>Loading stories…</span>
          </div>
        ) : stories && stories.length === 0 ? (
          <div className={styles.epicModalBody}>
            <p className={styles.epicEmptyState}>No stories assigned to this epic yet.</p>
          </div>
        ) : (
          <div className={styles.epicStoriesList}>
            {(stories ?? []).map((story) => (
              <div key={story.id} className={styles.epicStoryItem}>
                <div className={styles.epicStoryMeta}>
                  <span className={styles.epicStoryBoard}>{story.boardName}</span>
                  <span className={styles.epicStoryList}>{story.listName}</span>
                </div>
                <span className={styles.epicStoryName}>{story.name}</span>
                {story.shortUrl && (
                  <a
                    href={story.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.trelloLink}
                    title="Open in Trello"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
