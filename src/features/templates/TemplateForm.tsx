import { useState } from 'react'
import type { EpicCardOption } from '../../lib/board.types'
import type { KanbanColumn, TrelloLabel } from '../../trello/trello.types'
import type { TicketTemplate, TicketTemplateInput } from './template.types'
import { labelColor } from '../../lib/label-colors'
import { EpicSelect } from './EpicSelect'
import {
  ModalOverlay,
  ModalContent,
  ModalTitle,
  ModalFooter
} from './styled/templates-modal.styled'
import {
  FormField,
  FormLabel,
  FormInput,
  FormSelect,
  FormTextarea,
  FormHint,
  LabelPicker,
  LabelChip,
  ResultBanner
} from './styled/templates-form.styled'

const PLACEHOLDER_HINT =
  'Supported placeholders: {{year}}, {{month}}, {{month_name}}, {{week}}, {{date}}'

interface Props {
  initial?: TicketTemplate
  groupId: number
  lists: KanbanColumn[]
  boardLabels: TrelloLabel[]
  epicCards: EpicCardOption[]
  onSave: (input: TicketTemplateInput) => void
  onCancel: () => void
  saving: boolean
  error: string | null
}

export default function TemplateForm(props: Props): JSX.Element {
  const { initial, groupId, lists, boardLabels, epicCards, onSave, onCancel, saving, error } = props
  const [name, setName] = useState(initial?.name ?? '')
  const [titleTemplate, setTitleTemplate] = useState(initial?.titleTemplate ?? '')
  const [descTemplate, setDescTemplate] = useState(initial?.descTemplate ?? '')
  const [listId, setListId] = useState(initial?.listId ?? lists[0]?.id ?? '')
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(initial?.labelIds ?? [])
  // Empty string maps to the "— None —" select option; converted to null on save.
  const [epicCardId, setEpicCardId] = useState<string>(initial?.epicCardId ?? '')

  const toggleLabel = (id: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = () => {
    const selectedList = lists.find((l) => l.id === listId)
    onSave({
      groupId,
      name: name.trim(),
      titleTemplate: titleTemplate.trim(),
      descTemplate: descTemplate.trim(),
      listId,
      listName: selectedList?.name ?? '',
      labelIds: selectedLabelIds,
      epicCardId: epicCardId !== '' ? epicCardId : null,
      position: initial?.position ?? 0
    })
  }

  return (
    <ModalOverlay>
      <ModalContent>
        <ModalTitle>{initial ? 'Edit Template' : 'New Template'}</ModalTitle>

        {error && <ResultBanner $variant="error">{error}</ResultBanner>}

        <FormField>
          <FormLabel>Template name</FormLabel>
          <FormInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly retrospective"
            autoFocus
          />
        </FormField>

        <FormField>
          <FormLabel>Card title</FormLabel>
          <FormInput
            value={titleTemplate}
            onChange={(e) => setTitleTemplate(e.target.value)}
            placeholder="e.g. Retro {{year}}-W{{week}}"
          />
          <FormHint>{PLACEHOLDER_HINT}</FormHint>
        </FormField>

        <FormField>
          <FormLabel>Description (optional)</FormLabel>
          <FormTextarea
            value={descTemplate}
            onChange={(e) => setDescTemplate(e.target.value)}
            placeholder="e.g. Sprint {{week}} retrospective for {{year}}"
          />
          <FormHint>{PLACEHOLDER_HINT}</FormHint>
        </FormField>

        <FormField>
          <FormLabel>Target list</FormLabel>
          <FormSelect value={listId} onChange={(e) => setListId(e.target.value)}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </FormSelect>
        </FormField>

        {boardLabels.length > 0 && (
          <FormField>
            <FormLabel>Labels (optional)</FormLabel>
            <LabelPicker>
              {boardLabels.map((label) => (
                <LabelChip
                  key={label.id}
                  type="button"
                  $selected={selectedLabelIds.includes(label.id)}
                  style={{ backgroundColor: labelColor(label.color) }}
                  onClick={() => toggleLabel(label.id)}
                  title={label.name || label.color}
                >
                  {label.name || label.color}
                </LabelChip>
              ))}
            </LabelPicker>
          </FormField>
        )}

        {epicCards.length > 0 && (
          <FormField>
            <FormLabel>Epic (optional)</FormLabel>
            <EpicSelect epicCards={epicCards} value={epicCardId} onChange={setEpicCardId} />
          </FormField>
        )}

        <ModalFooter>
          <button className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !titleTemplate.trim() || !listId}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  )
}
