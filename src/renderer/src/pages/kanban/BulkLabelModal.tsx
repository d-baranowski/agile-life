import type { TrelloLabel } from '@shared/trello.types'
import { labelColor } from '../../lib/label-colors'
import type { BulkLabelModal as BulkLabelModalState } from './kanban.types'
import styles from '../KanbanPage.module.css'

interface Props {
  modal: BulkLabelModalState
  boardLabels: TrelloLabel[]
  selectedCardCount: number
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onTextChange: (text: string) => void
  onToggleLabelSelection: (labelId: string) => void
  onStart: () => void
  onRunBulkLabel: () => void
  onRetryItem: (itemId: string) => void
  onRetryAllFailed: () => void
  onClose: () => void
}

export default function BulkLabelModal({
  modal,
  boardLabels,
  selectedCardCount,
  textareaRef,
  onTextChange,
  onToggleLabelSelection,
  onStart,
  onRunBulkLabel,
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
            <strong>Bulk Label Cards</strong>
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
        {modal.queue === null && (
          <EditPhase
            modal={modal}
            boardLabels={boardLabels}
            selectedCardCount={selectedCardCount}
            textareaRef={textareaRef}
            onTextChange={onTextChange}
            onToggleLabelSelection={onToggleLabelSelection}
            onStart={onStart}
            onClose={onClose}
          />
        )}

        {/* Queue phase */}
        {modal.queue !== null && (
          <QueuePhase
            modal={modal}
            onRunBulkLabel={onRunBulkLabel}
            onRetryItem={onRetryItem}
            onRetryAllFailed={onRetryAllFailed}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

function EditPhase({
  modal,
  boardLabels,
  selectedCardCount,
  textareaRef,
  onTextChange,
  onToggleLabelSelection,
  onStart,
  onClose
}: {
  modal: BulkLabelModalState
  boardLabels: TrelloLabel[]
  selectedCardCount: number
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onTextChange: (text: string) => void
  onToggleLabelSelection: (labelId: string) => void
  onStart: () => void
  onClose: () => void
}): JSX.Element {
  return (
    <>
      <div className={styles.addCardModalBody}>
        <div className={styles.bulkLabelSection}>
          <div className={styles.contextMenuLabel} style={{ padding: '0 0 6px' }}>
            Select labels to apply:
          </div>
          <div className={styles.bulkLabelPickerGrid}>
            {boardLabels.map((label) => {
              const selected = modal.selectedLabelIds.has(label.id)
              return (
                <button
                  key={label.id}
                  className={`${styles.bulkLabelChip} ${selected ? styles.bulkLabelChipSelected : ''}`}
                  onClick={() => onToggleLabelSelection(label.id)}
                  style={{ '--chip-color': labelColor(label.color) } as React.CSSProperties}
                >
                  <span
                    className={styles.bulkLabelChipDot}
                    style={{ background: labelColor(label.color) }}
                  />
                  {label.name || label.color}
                  {selected && <span className={styles.bulkLabelChipCheck}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
        {!modal.fromSelection && (
          <div className={styles.bulkLabelSection}>
            <div className={styles.contextMenuLabel} style={{ padding: '0 0 6px' }}>
              Enter card names to label (one per line):
            </div>
            <textarea
              ref={textareaRef}
              className={styles.addCardTextarea}
              placeholder={'Paste from Excel or type card names — one per line'}
              value={modal.text}
              onChange={(e) => onTextChange(e.target.value)}
              rows={5}
            />
            {(() => {
              const previewLines = modal.text
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
              return previewLines.length > 0 ? (
                <div className={styles.addCardPreviewList}>
                  {previewLines.map((line, idx) => (
                    <div key={idx} className={styles.addCardPreviewItem}>
                      <span className={styles.addCardPreviewName}>{line}</span>
                    </div>
                  ))}
                </div>
              ) : null
            })()}
          </div>
        )}
      </div>
      <div className={styles.addCardModalFooter}>
        <button className={styles.addCardCancelBtn} onClick={onClose}>
          Cancel
        </button>
        {modal.fromSelection ? (
          <button
            className={styles.addCardStartBtn}
            onClick={onStart}
            disabled={modal.selectedLabelIds.size === 0}
          >
            Apply to {selectedCardCount} card{selectedCardCount !== 1 ? 's' : ''}
          </button>
        ) : (
          <button
            className={styles.addCardStartBtn}
            onClick={onStart}
            disabled={modal.selectedLabelIds.size === 0 || modal.text.trim().length === 0}
          >
            Preview (
            {
              modal.text
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean).length
            }{' '}
            card
            {modal.text
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean).length !== 1
              ? 's'
              : ''}
            )
          </button>
        )}
      </div>
    </>
  )
}

function QueuePhase({
  modal,
  onRunBulkLabel,
  onRetryItem,
  onRetryAllFailed,
  onClose
}: {
  modal: BulkLabelModalState
  onRunBulkLabel: () => void
  onRetryItem: (itemId: string) => void
  onRetryAllFailed: () => void
  onClose: () => void
}): JSX.Element {
  const queue = modal.queue!
  const hasAnyFailed = queue.some((q) => q.status === 'failed' && !q.notFound)
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
            <span className={styles.queueItemName}>
              {item.cardName}
              {item.notFound && <span className={styles.bulkLabelNotFound}> (not found)</span>}
            </span>
            {!modal.uploading && item.status === 'failed' && !item.notFound && (
              <button className={styles.queueRetryBtn} onClick={() => onRetryItem(item.id)}>
                ↺ Retry
              </button>
            )}
          </div>
        ))}
      </div>
      <div className={styles.addCardModalFooter}>
        {modal.uploading && <span className={styles.uploadingLabel}>Applying labels…</span>}
        {!modal.uploading && allDone && hasAnyFailed && (
          <button className={styles.addCardStartBtn} onClick={onRetryAllFailed}>
            ↺ Retry all failed
          </button>
        )}
        {!modal.uploading && !allDone && (
          <button
            className={styles.addCardStartBtn}
            onClick={onRunBulkLabel}
            disabled={queue.every((q) => q.status === 'failed' && q.notFound)}
          >
            Apply labels ({queue.filter((q) => q.status === 'pending').length} remaining)
          </button>
        )}
        <button className={styles.addCardCancelBtn} onClick={onClose} disabled={modal.uploading}>
          {allDone && !modal.uploading ? 'Close' : 'Cancel'}
        </button>
      </div>
    </>
  )
}
