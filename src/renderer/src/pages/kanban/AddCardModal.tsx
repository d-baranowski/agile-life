import type { AddCardModal, QueueItem } from './kanban.types'
import styles from '../KanbanPage.module.css'

interface Props {
  modal: AddCardModal
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onTextChange: (text: string) => void
  onRemovePreviewLine: (lineIdx: number) => void
  onRemoveQueueItem: (itemId: string) => void
  onStartUpload: () => void
  onRetryItem: (itemId: string) => void
  onRetryAllFailed: () => void
  onClose: () => void
}

export default function AddCardModal({
  modal,
  textareaRef,
  onTextChange,
  onRemovePreviewLine,
  onRemoveQueueItem,
  onStartUpload,
  onRetryItem,
  onRetryAllFailed,
  onClose
}: Props): JSX.Element {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.addCardModal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.addCardModalHeader}>
          <span className={styles.addCardModalTitle}>
            Add cards to <strong>{modal.listName}</strong>
          </span>
          <button
            className={styles.modalClose}
            onClick={onClose}
            disabled={modal.uploading}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Edit phase */}
        {modal.queue === null && <EditPhase {...{ modal, textareaRef, onTextChange, onRemovePreviewLine, onStartUpload, onClose }} />}

        {/* Queue phase */}
        {modal.queue !== null && <QueuePhase queue={modal.queue} uploading={modal.uploading} onRemoveQueueItem={onRemoveQueueItem} onRetryItem={onRetryItem} onRetryAllFailed={onRetryAllFailed} onClose={onClose} />}
      </div>
    </div>
  )
}

function EditPhase({
  modal,
  textareaRef,
  onTextChange,
  onRemovePreviewLine,
  onStartUpload,
  onClose
}: {
  modal: AddCardModal
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onTextChange: (text: string) => void
  onRemovePreviewLine: (lineIdx: number) => void
  onStartUpload: () => void
  onClose: () => void
}): JSX.Element {
  const previewLines = modal.text
    .split('\n')
    .map((line, idx) => ({ line: line.trim(), idx }))
    .filter(({ line }) => line.length > 0)

  return (
    <>
      <div className={styles.addCardModalBody}>
        <textarea
          ref={textareaRef}
          className={styles.addCardTextarea}
          placeholder={'Paste from Excel or type card names — one per line'}
          value={modal.text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={5}
        />
        {previewLines.length > 0 && (
          <div className={styles.addCardPreviewList}>
            {previewLines.map(({ line, idx }) => (
              <div key={idx} className={styles.addCardPreviewItem}>
                <span className={styles.addCardPreviewName}>{line}</span>
                <button
                  className={styles.addCardPreviewRemove}
                  onClick={() => onRemovePreviewLine(idx)}
                  title="Remove this item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={styles.addCardModalFooter}>
        <button className={styles.addCardCancelBtn} onClick={onClose}>
          Cancel
        </button>
        <button
          className={styles.addCardStartBtn}
          onClick={onStartUpload}
          disabled={previewLines.length === 0}
        >
          Start upload ({previewLines.length} card
          {previewLines.length !== 1 ? 's' : ''})
        </button>
      </div>
    </>
  )
}

function QueuePhase({
  queue,
  uploading,
  onRemoveQueueItem,
  onRetryItem,
  onRetryAllFailed,
  onClose
}: {
  queue: QueueItem[]
  uploading: boolean
  onRemoveQueueItem: (itemId: string) => void
  onRetryItem: (itemId: string) => void
  onRetryAllFailed: () => void
  onClose: () => void
}): JSX.Element {
  const hasAnyFailed = queue.some((q) => q.status === 'failed')
  const allDone = queue.every((q) => q.status === 'done' || q.status === 'failed')

  return (
    <>
      <div className={styles.addCardQueueList}>
        {queue.map((item) => (
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
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              )}
              {item.status === 'done' && '✓'}
              {item.status === 'failed' && '✕'}
            </span>
            <span className={styles.queueItemName}>{item.name}</span>
            {!uploading && item.status === 'pending' && (
              <button
                className={styles.queueRemoveBtn}
                onClick={() => onRemoveQueueItem(item.id)}
                title="Remove"
              >
                ✕
              </button>
            )}
            {!uploading && item.status === 'failed' && (
              <button className={styles.queueRetryBtn} onClick={() => onRetryItem(item.id)}>
                ↺ Retry
              </button>
            )}
          </div>
        ))}
      </div>
      <div className={styles.addCardModalFooter}>
        {uploading && <span className={styles.uploadingLabel}>Uploading…</span>}
        {!uploading && allDone && hasAnyFailed && (
          <button className={styles.addCardStartBtn} onClick={onRetryAllFailed}>
            ↺ Retry all failed
          </button>
        )}
        <button className={styles.addCardCancelBtn} onClick={onClose} disabled={uploading}>
          {allDone && !uploading ? 'Close' : 'Cancel'}
        </button>
      </div>
    </>
  )
}
