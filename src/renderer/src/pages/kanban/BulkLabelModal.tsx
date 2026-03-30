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
  Footer
} from './styled/modal-layout.styled'
import { CancelButton, StartButton } from './styled/modal-buttons.styled'
import {
  QueueList,
  QueueItem,
  QueueIcon,
  QueueName,
  RetryButton,
  UploadingLabel
} from './styled/queue.styled'
import { PreviewList, PreviewItem, PreviewName } from './styled/preview.styled'
import { Textarea } from './styled/form.styled'
import {
  Section,
  SectionLabel,
  PickerGrid,
  LabelChip,
  ChipDot,
  ChipCheck,
  NotFound
} from './styled/label-picker.styled'

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

interface EditPhaseProps {
  modal: BulkLabelModalState
  boardLabels: TrelloLabel[]
  selectedCardCount: number
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onTextChange: (text: string) => void
  onToggleLabelSelection: (labelId: string) => void
  onStart: () => void
  onClose: () => void
}

function EditPhase(props: EditPhaseProps): JSX.Element {
  const {
    modal,
    boardLabels,
    selectedCardCount,
    textareaRef,
    onTextChange,
    onToggleLabelSelection,
    onStart,
    onClose
  } = props
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

interface QueuePhaseProps {
  modal: BulkLabelModalState
  onRunBulkLabel: () => void
  onRetryItem: (itemId: string) => void
  onRetryAllFailed: () => void
  onClose: () => void
}

function QueuePhase(props: QueuePhaseProps): JSX.Element {
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
