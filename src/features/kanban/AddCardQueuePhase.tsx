import type { QueueItem } from './kanban.types'
import { Footer } from './styled/modal-layout.styled'
import { CancelButton, StartButton } from './styled/modal-buttons.styled'
import {
  QueueList,
  QueueItem as StyledQueueItem,
  QueueIcon,
  QueueName,
  RemoveButton,
  RetryButton,
  UploadingLabel
} from './styled/queue.styled'

interface Props {
  queue: QueueItem[]
  uploading: boolean
  onRemoveQueueItem: (itemId: string) => void
  onRetryItem: (itemId: string) => void
  onRetryAllFailed: () => void
  onClose: () => void
}

export default function AddCardQueuePhase(props: Props): JSX.Element {
  const { queue, uploading, onRemoveQueueItem, onRetryItem, onRetryAllFailed, onClose } = props
  const hasAnyFailed = queue.some((q) => q.status === 'failed')
  const allDone = queue.every((q) => q.status === 'done' || q.status === 'failed')

  return (
    <>
      <QueueList>
        {queue.map((item) => (
          <StyledQueueItem key={item.id} $status={item.status}>
            <QueueIcon $status={item.status}>
              {item.status === 'pending' && '⏳'}
              {item.status === 'running' && (
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              )}
              {item.status === 'done' && '✓'}
              {item.status === 'failed' && '✕'}
            </QueueIcon>
            <QueueName $status={item.status}>{item.name}</QueueName>
            {!uploading && item.status === 'pending' && (
              <RemoveButton onClick={() => onRemoveQueueItem(item.id)} title="Remove">
                ✕
              </RemoveButton>
            )}
            {!uploading && item.status === 'failed' && (
              <RetryButton onClick={() => onRetryItem(item.id)}>↺ Retry</RetryButton>
            )}
          </StyledQueueItem>
        ))}
      </QueueList>
      <Footer>
        {uploading && <UploadingLabel>Uploading…</UploadingLabel>}
        {!uploading && allDone && hasAnyFailed && (
          <StartButton onClick={onRetryAllFailed}>↺ Retry all failed</StartButton>
        )}
        <CancelButton onClick={onClose} disabled={uploading}>
          {allDone && !uploading ? 'Close' : 'Cancel'}
        </CancelButton>
      </Footer>
    </>
  )
}
