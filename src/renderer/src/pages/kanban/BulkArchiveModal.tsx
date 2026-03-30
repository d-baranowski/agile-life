import type { KanbanColumn } from '@shared/trello.types'
import type { BulkArchiveModal } from './kanban.types'
import styles from '../KanbanPage.module.css'

interface Props {
  modal: BulkArchiveModal
  columns: KanbanColumn[]
  selectedCardIds: Set<string>
  onStart: () => void
  onRun: () => void
  onRetryItem: (itemId: string) => void
  onRetryAllFailed: () => void
  onClose: () => void
}

export default function BulkArchiveModalComponent({
  modal,
  columns,
  selectedCardIds,
  onStart,
  onRun,
  onRetryItem,
  onRetryAllFailed,
  onClose
}: Props): JSX.Element {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.addCardModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.addCardModalHeader}>
          <span className={styles.addCardModalTitle}>
            <strong>🗄️ Bulk Archive Cards</strong>
          </span>
          <button
            className={styles.modalClose}
            onClick={onClose}
            disabled={modal.running}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {modal.queue === null && (
          <>
            <div className={styles.addCardModalBody}>
              <p style={{ margin: '0 0 10px', fontSize: '0.88rem', color: 'var(--color-text)' }}>
                The following {selectedCardIds.size} card
                {selectedCardIds.size !== 1 ? 's' : ''} will be archived on Trello:
              </p>
              <div className={styles.addCardPreviewList}>
                {(() => {
                  const allCards = columns.flatMap((col) => col.cards)
                  const cardMap = new Map(allCards.map((c) => [c.id, c]))
                  return Array.from(selectedCardIds).map((cardId) => (
                    <div key={cardId} className={styles.addCardPreviewItem}>
                      <span className={styles.addCardPreviewName}>
                        {cardMap.get(cardId)?.name ?? cardId}
                      </span>
                    </div>
                  ))
                })()}
              </div>
            </div>
            <div className={styles.addCardModalFooter}>
              <button className={styles.addCardCancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button className={styles.bulkArchiveBtn} onClick={onStart}>
                Archive {selectedCardIds.size} card{selectedCardIds.size !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}

        {modal.queue !== null &&
          (() => {
            const hasAnyFailed = modal.queue.some((q) => q.status === 'failed')
            const allDone = modal.queue.every(
              (q) => q.status === 'done' || q.status === 'failed'
            )
            const pendingCount = modal.queue.filter((q) => q.status === 'pending').length
            return (
              <>
                <div className={styles.addCardQueueList}>
                  {modal.queue.map((item) => (
                    <div
                      key={item.id}
                      className={`${styles.addCardQueueItem} ${
                        item.status === 'done'
                          ? styles.queueItemDone
                          : item.status === 'failed'
                            ? styles.queueItemFailed
                            : item.status === 'running'
                              ? styles.queueItemRunning
                              : ''
                      }`}
                    >
                      <span className={styles.queueItemIcon}>
                        {item.status === 'pending' && '⏳'}
                        {item.status === 'running' && (
                          <span
                            className="spinner"
                            style={{ width: 14, height: 14, borderWidth: 2 }}
                          />
                        )}
                        {item.status === 'done' && '✓'}
                        {item.status === 'failed' && '✕'}
                      </span>
                      <span className={styles.queueItemName}>{item.cardName}</span>
                      {!modal.running && item.status === 'failed' && (
                        <button
                          className={styles.queueRetryBtn}
                          onClick={() => onRetryItem(item.id)}
                        >
                          ↺ Retry
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className={styles.addCardModalFooter}>
                  {modal.running && (
                    <span className={styles.uploadingLabel}>Archiving cards…</span>
                  )}
                  {!modal.running && allDone && hasAnyFailed && (
                    <button className={styles.addCardStartBtn} onClick={onRetryAllFailed}>
                      ↺ Retry all failed
                    </button>
                  )}
                  {!modal.running && !allDone && pendingCount > 0 && (
                    <button className={styles.addCardStartBtn} onClick={onRun}>
                      Archive remaining ({pendingCount})
                    </button>
                  )}
                  <button
                    className={styles.addCardCancelBtn}
                    onClick={onClose}
                    disabled={modal.running}
                  >
                    {allDone && !modal.running ? 'Close' : 'Cancel'}
                  </button>
                </div>
              </>
            )
          })()}
      </div>
    </div>
  )
}
