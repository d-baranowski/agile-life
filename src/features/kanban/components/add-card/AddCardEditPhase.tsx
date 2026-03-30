import type { AddCardModal } from '../../kanban.types'
import { Body, Footer } from '../../styled/modal-layout.styled'
import { CancelButton, StartButton } from '../../styled/modal-buttons.styled'
import { PreviewList, PreviewItem, PreviewName, PreviewRemove } from '../../styled/preview.styled'
import { Textarea } from '../../styled/form.styled'

interface Props {
  modal: AddCardModal
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onTextChange: (text: string) => void
  onRemovePreviewLine: (lineIdx: number) => void
  onStartUpload: () => void
  onClose: () => void
}

export default function AddCardEditPhase(props: Props): JSX.Element {
  const { modal, textareaRef, onTextChange, onRemovePreviewLine, onStartUpload, onClose } = props
  const previewLines = modal.text
    .split('\n')
    .map((line, idx) => ({ line: line.trim(), idx }))
    .filter(({ line }) => line.length > 0)

  return (
    <>
      <Body>
        <Textarea
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
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
