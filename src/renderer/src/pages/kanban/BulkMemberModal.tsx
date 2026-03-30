import type { KanbanColumn } from '@shared/trello.types'
import type { BulkMemberModal } from './kanban.types'
import {
  Overlay,
  Modal,
  Header,
  Title,
  CloseButton,
  Body,
  PreviewList,
  PreviewItem,
  PreviewName,
  Footer,
  CancelButton,
  StartButton,
  QueueList,
  QueueItem,
  QueueIcon,
  QueueName,
  RetryButton,
  UploadingLabel
} from './AddCardModal.styled'

interface Props {
  modal: BulkMemberModal
  columns: KanbanColumn[]
  selectedCardIds: Set<string>
  onStart: () => void
  onRun: () => void
  onRetryItem: (itemId: string) => void
  onRetryAllFailed: () => void
  onClose: () => void
}

export default function BulkMemberModalComponent(props: Props): JSX.Element {
  const {
    modal,
    columns,
    selectedCardIds,
    onStart,
    onRun,
    onRetryItem,
    onRetryAllFailed,
    onClose
  } = props

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <strong>
              👤 {modal.assign ? 'Assign' : 'Remove'}: {modal.memberName}
            </strong>
          </Title>
          <CloseButton onClick={onClose} disabled={modal.running} title="Close (Esc)">
            ✕
          </CloseButton>
        </Header>

        {modal.queue === null && (
          <>
            <Body>
              <p style={{ margin: '0 0 10px', fontSize: '0.88rem', color: 'var(--color-text)' }}>
                {modal.assign ? 'Assign' : 'Remove'} <strong>{modal.memberName}</strong>{' '}
                {modal.assign ? 'to' : 'from'} {selectedCardIds.size} card
                {selectedCardIds.size !== 1 ? 's' : ''}:
              </p>
              <PreviewList>
                {(() => {
                  const allCards = columns.flatMap((col) => col.cards)
                  const cardMap = new Map(allCards.map((c) => [c.id, c]))
                  return Array.from(selectedCardIds).map((cardId) => (
                    <PreviewItem key={cardId}>
                      <PreviewName>{cardMap.get(cardId)?.name ?? cardId}</PreviewName>
                    </PreviewItem>
                  ))
                })()}
              </PreviewList>
            </Body>
            <Footer>
              <CancelButton onClick={onClose}>Cancel</CancelButton>
              <StartButton onClick={onStart}>
                {modal.assign ? 'Assign' : 'Remove'} for {selectedCardIds.size} card
                {selectedCardIds.size !== 1 ? 's' : ''}
              </StartButton>
            </Footer>
          </>
        )}

        {modal.queue !== null &&
          (() => {
            const hasAnyFailed = modal.queue.some((q) => q.status === 'failed')
            const allDone = modal.queue.every((q) => q.status === 'done' || q.status === 'failed')
            const pendingCount = modal.queue.filter((q) => q.status === 'pending').length
            return (
              <>
                <QueueList>
                  {modal.queue.map((item) => (
                    <QueueItem key={item.id} $status={item.status}>
                      <QueueIcon $status={item.status}>
                        {item.status === 'pending' && '⏳'}
                        {item.status === 'running' && (
                          <span
                            className="spinner"
                            style={{ width: 14, height: 14, borderWidth: 2 }}
                          />
                        )}
                        {item.status === 'done' && '✓'}
                        {item.status === 'failed' && '✕'}
                      </QueueIcon>
                      <QueueName $status={item.status}>{item.cardName}</QueueName>
                      {!modal.running && item.status === 'failed' && (
                        <RetryButton onClick={() => onRetryItem(item.id)}>↺ Retry</RetryButton>
                      )}
                    </QueueItem>
                  ))}
                </QueueList>
                <Footer>
                  {modal.running && (
                    <UploadingLabel>
                      {modal.assign ? 'Assigning' : 'Removing'} member…
                    </UploadingLabel>
                  )}
                  {!modal.running && allDone && hasAnyFailed && (
                    <StartButton onClick={onRetryAllFailed}>↺ Retry all failed</StartButton>
                  )}
                  {!modal.running && !allDone && pendingCount > 0 && (
                    <StartButton onClick={onRun}>
                      {modal.assign ? 'Assign' : 'Remove'} remaining ({pendingCount})
                    </StartButton>
                  )}
                  <CancelButton onClick={onClose} disabled={modal.running}>
                    {allDone && !modal.running ? 'Close' : 'Cancel'}
                  </CancelButton>
                </Footer>
              </>
            )
          })()}
      </Modal>
    </Overlay>
  )
}
