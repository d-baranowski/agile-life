import type { AddCardModal } from './kanban.types'
import { Overlay, Modal, Header, Title, CloseButton } from './styled/modal-layout.styled'
import AddCardEditPhase from './AddCardEditPhase'
import AddCardQueuePhase from './AddCardQueuePhase'

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
          <AddCardEditPhase
            modal={modal}
            textareaRef={textareaRef}
            onTextChange={onTextChange}
            onRemovePreviewLine={onRemovePreviewLine}
            onStartUpload={onStartUpload}
            onClose={onClose}
          />
        )}

        {/* Queue phase */}
        {modal.queue !== null && (
          <AddCardQueuePhase
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
