import type { BulkLabelModal } from './kanban.types'
import { Footer } from './styled/modal-layout.styled'
import { CancelButton, StartButton } from './styled/modal-buttons.styled'
import {
  QueueList,
  QueueItem,
  QueueIcon,
  QueueName,
  RetryButton,
  UploadingLabel
} from './styled/queue.styled'
import { NotFound } from './styled/label-picker.styled'

interface Props {
  modal: BulkLabelModal
  onRunBulkLabel: () => void
  onRetryItem: (itemId: string) => void
  onRetryAllFailed: () => void
  onClose: () => void
}

export default function BulkLabelQueuePhase(props: Props): JSX.Element {
  const { modal, onRunBulkLabel, onRetryItem, onRetryAllFailed, onClose } = props
  const queue = modal.queue!
  const hasAnyFailed = queue.some((q) => q.status === 'failed' && !q.notFound)
  const allDone = queue.every((q) => q.status === 'done' || q.status === 'failed')

  return (
    <>
      <QueueList>
        {queue.map((item) => (
          <QueueItem key={item.id} $status={item.status}>
            <QueueIcon $status={item.status}>
              {item.status === 'pending' && '⏳'}
              {item.status === 'running' && (
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              )}
              {item.status === 'done' && '✓'}
              {item.status === 'failed' && '✕'}
            </QueueIcon>
            <QueueName $status={item.status}>
              {item.cardName}
              {item.notFound && <NotFound> (not found)</NotFound>}
            </QueueName>
            {!modal.uploading && item.status === 'failed' && !item.notFound && (
              <RetryButton onClick={() => onRetryItem(item.id)}>↺ Retry</RetryButton>
            )}
          </QueueItem>
        ))}
      </QueueList>
      <Footer>
        {modal.uploading && <UploadingLabel>Applying labels…</UploadingLabel>}
        {!modal.uploading && allDone && hasAnyFailed && (
          <StartButton onClick={onRetryAllFailed}>↺ Retry all failed</StartButton>
        )}
        {!modal.uploading && !allDone && (
          <StartButton
            onClick={onRunBulkLabel}
            disabled={queue.every((q) => q.status === 'failed' && q.notFound)}
          >
            Apply labels ({queue.filter((q) => q.status === 'pending').length} remaining)
          </StartButton>
        )}
        <CancelButton onClick={onClose} disabled={modal.uploading}>
          {allDone && !modal.uploading ? 'Close' : 'Cancel'}
        </CancelButton>
      </Footer>
    </>
  )
}
