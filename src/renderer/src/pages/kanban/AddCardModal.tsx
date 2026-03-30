import type { AddCardModal, QueueItem } from './kanban.types'
import { Overlay, Modal, Header, Title, CloseButton, Body, Footer } from './styled/modal-layout.styled'
import { CancelButton, StartButton } from './styled/modal-buttons.styled'
import { QueueList, QueueItem as StyledQueueItem, QueueIcon, QueueName, RemoveButton, RetryButton, UploadingLabel } from './styled/queue.styled'
import { PreviewList, PreviewItem, PreviewName, PreviewRemove } from './styled/preview.styled'
import { Textarea } from './styled/form.styled'

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

export default function AddCardModalComponent(props: Props): JSX.Element {
  const {
    modal,
    textareaRef,
    onTextChange,
    onRemovePreviewLine,
    onRemoveQueueItem,
    onStartUpload,
    onRetryItem,
    onRetryAllFailed,
    onClose
  } = props

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Header>
          <Title>
            Add cards to <strong>{modal.listName}</strong>
          </Title>
          <CloseButton onClick={onClose} disabled={modal.uploading} title="Close (Esc)">
            ✕
          </CloseButton>
        </Header>

        {/* Edit phase */}
        {modal.queue === null && (
          <EditPhase
            {...{ modal, textareaRef, onTextChange, onRemovePreviewLine, onStartUpload, onClose }}
          />
        )}

        {/* Queue phase */}
        {modal.queue !== null && (
          <QueuePhase
            queue={modal.queue}
            uploading={modal.uploading}
            onRemoveQueueItem={onRemoveQueueItem}
            onRetryItem={onRetryItem}
            onRetryAllFailed={onRetryAllFailed}
            onClose={onClose}
          />
        )}
      </Modal>
    </Overlay>
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
      <Body>
        <Textarea
          ref={textareaRef}
          placeholder={'Paste from Excel or type card names — one per line'}
          value={modal.text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={5}
        />
        {previewLines.length > 0 && (
          <PreviewList>
            {previewLines.map(({ line, idx }) => (
              <PreviewItem key={idx}>
                <PreviewName>{line}</PreviewName>
                <PreviewRemove onClick={() => onRemovePreviewLine(idx)} title="Remove this item">
                  ✕
                </PreviewRemove>
              </PreviewItem>
            ))}
          </PreviewList>
        )}
      </Body>
      <Footer>
        <CancelButton onClick={onClose}>Cancel</CancelButton>
        <StartButton onClick={onStartUpload} disabled={previewLines.length === 0}>
          Start upload ({previewLines.length} card
          {previewLines.length !== 1 ? 's' : ''})
        </StartButton>
      </Footer>
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
