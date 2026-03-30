import type { TrelloLabel } from '@shared/trello.types'
import type { BulkLabelModal as BulkLabelModalState } from './kanban.types'
import { Overlay, Modal, Header, Title, CloseButton } from './styled/modal-layout.styled'
import BulkLabelEditPhase from './BulkLabelEditPhase'
import BulkLabelQueuePhase from './BulkLabelQueuePhase'

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
          <BulkLabelEditPhase
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
          <BulkLabelQueuePhase
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
