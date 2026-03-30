import styled from 'styled-components'
import type { TrelloLabel } from '@shared/trello.types'
import { labelColor } from '../../lib/label-colors'
import type { BulkLabelModal as BulkLabelModalState } from './kanban.types'
import {
  Overlay,
  Modal,
  Header,
  Title,
  CloseButton,
  Body,
  Textarea,
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

const Section = styled.div`
  display: flex;
  flex-direction: column;
`

const SectionLabel = styled.div`
  padding: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const PickerGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const LabelChip = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${(p) => (p.$selected ? 'var(--chip-color, var(--color-accent))' : 'var(--color-border)')};
  background: ${(p) =>
    p.$selected
      ? 'color-mix(in srgb, var(--chip-color, var(--color-accent)) 15%, transparent)'
      : 'var(--color-surface)'};
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    border-color var(--transition),
    background var(--transition);

  &:hover {
    border-color: var(--chip-color, var(--color-accent));
  }
`

const ChipDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
`

const ChipCheck = styled.span`
  margin-left: 2px;
  color: var(--chip-color, var(--color-accent));
  font-weight: 700;
  font-size: 0.75rem;
`

const NotFound = styled.span`
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
`

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

export default function BulkLabelModal(props: Props): JSX.Element {
  const {
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
  } = props
  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <strong>Bulk Label Cards</strong>
          </Title>
          <CloseButton onClick={onClose} disabled={modal.uploading} title="Close (Esc)">
            ✕
          </CloseButton>
        </Header>

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

        {modal.queue !== null && (
          <QueuePhase
            modal={modal}
            onRunBulkLabel={onRunBulkLabel}
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
      <Body>
        <Section>
          <SectionLabel>Select labels to apply:</SectionLabel>
          <PickerGrid>
            {boardLabels.map((label) => {
              const selected = modal.selectedLabelIds.has(label.id)
              return (
                <LabelChip
                  key={label.id}
                  $selected={selected}
                  onClick={() => onToggleLabelSelection(label.id)}
                  style={{ '--chip-color': labelColor(label.color) } as React.CSSProperties}
                >
                  <ChipDot style={{ background: labelColor(label.color) }} />
                  {label.name || label.color}
                  {selected && <ChipCheck>✓</ChipCheck>}
                </LabelChip>
              )
            })}
          </PickerGrid>
        </Section>
        {!modal.fromSelection && (
          <Section>
            <SectionLabel>Enter card names to label (one per line):</SectionLabel>
            <Textarea
              ref={textareaRef}
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
                <PreviewList>
                  {previewLines.map((line, idx) => (
                    <PreviewItem key={idx}>
                      <PreviewName>{line}</PreviewName>
                    </PreviewItem>
                  ))}
                </PreviewList>
              ) : null
            })()}
          </Section>
        )}
      </Body>
      <Footer>
        <CancelButton onClick={onClose}>Cancel</CancelButton>
        {modal.fromSelection ? (
          <StartButton onClick={onStart} disabled={modal.selectedLabelIds.size === 0}>
            Apply to {selectedCardCount} card{selectedCardCount !== 1 ? 's' : ''}
          </StartButton>
        ) : (
          <StartButton
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
          </StartButton>
        )}
      </Footer>
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
