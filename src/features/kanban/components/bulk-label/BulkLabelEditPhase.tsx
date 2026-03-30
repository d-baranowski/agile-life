import type { TrelloLabel } from '../../../../trello/trello.types'
import { labelColor } from '../../../../lib/label-colors'
import type { BulkLabelModal } from '../../kanban.types'
import { Body, Footer } from '../../styled/modal-layout.styled'
import { CancelButton, StartButton } from '../../styled/modal-buttons.styled'
import { PreviewList, PreviewItem, PreviewName } from '../../styled/preview.styled'
import { Textarea } from '../../styled/form.styled'
import {
  Section,
  SectionLabel,
  PickerGrid,
  LabelChip,
  ChipDot,
  ChipCheck
} from '../../styled/label-picker.styled'

interface Props {
  modal: BulkLabelModal
  boardLabels: TrelloLabel[]
  selectedCardCount: number
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onTextChange: (text: string) => void
  onToggleLabelSelection: (labelId: string) => void
  onStart: () => void
  onClose: () => void
}

export default function BulkLabelEditPhase(props: Props): JSX.Element {
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
              ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
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
