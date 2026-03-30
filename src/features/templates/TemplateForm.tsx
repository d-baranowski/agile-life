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
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  templateFormClosed,
  saveTemplate,
  formNameChanged,
  formTitleTemplateChanged,
  formDescTemplateChanged,
  formListIdChanged,
  formLabelToggled,
  formEpicCardIdChanged
} from './templatesSlice'

const PLACEHOLDER_HINT =
  'Supported placeholders: {{year}}, {{month}}, {{month_name}}, {{week}}, {{date}}'

interface Props {
  boardId: string
}

export default function TemplateForm(props: Props): JSX.Element {
  const { boardId } = props
  const dispatch = useAppDispatch()

  const editingTemplate = useAppSelector((s) => s.templates.editingTemplate)
  const selectedGroupId = useAppSelector((s) => s.templates.selectedGroupId)
  const lists = useAppSelector((s) => s.templates.lists)
  const boardLabels = useAppSelector((s) => s.templates.boardLabels)
  const epicCards = useAppSelector((s) => s.templates.epicCards)
  const saving = useAppSelector((s) => s.templates.formSaving)
  const error = useAppSelector((s) => s.templates.formError)

  const name = useAppSelector((s) => s.templates.formName)
  const titleTemplate = useAppSelector((s) => s.templates.formTitleTemplate)
  const descTemplate = useAppSelector((s) => s.templates.formDescTemplate)
  const listId = useAppSelector((s) => s.templates.formListId)
  const selectedLabelIds = useAppSelector((s) => s.templates.formSelectedLabelIds)
  const epicCardId = useAppSelector((s) => s.templates.formEpicCardId)

  const handleSubmit = () => {
    const selectedList = lists.find((l) => l.id === listId)
    dispatch(
      saveTemplate({
        boardId,
        existingId: editingTemplate?.id ?? null,
        groupId: selectedGroupId!,
        input: {
          groupId: selectedGroupId!,
          name: name.trim(),
          titleTemplate: titleTemplate.trim(),
          descTemplate: descTemplate.trim(),
          listId,
          listName: selectedList?.name ?? '',
          labelIds: selectedLabelIds,
          epicCardId: epicCardId !== '' ? epicCardId : null,
          position: editingTemplate?.position ?? 0
        }
      })
    )
  }

  return (
    <ModalOverlay>
      <ModalContent>
        <ModalTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</ModalTitle>

        {error && <ResultBanner $variant="error">{error}</ResultBanner>}

        <FormField>
          <FormLabel>Template name</FormLabel>
          <FormInput
            value={name}
            onChange={(e) => dispatch(formNameChanged(e.target.value))}
            placeholder="e.g. Weekly retrospective"
            autoFocus
          />
        </FormField>

        <FormField>
          <FormLabel>Card title</FormLabel>
          <FormInput
            value={titleTemplate}
            onChange={(e) => dispatch(formTitleTemplateChanged(e.target.value))}
            placeholder="e.g. Retro {{year}}-W{{week}}"
          />
          <FormHint>{PLACEHOLDER_HINT}</FormHint>
        </FormField>

        <FormField>
          <FormLabel>Description (optional)</FormLabel>
          <FormTextarea
            value={descTemplate}
            onChange={(e) => dispatch(formDescTemplateChanged(e.target.value))}
            placeholder="e.g. Sprint {{week}} retrospective for {{year}}"
          />
          <FormHint>{PLACEHOLDER_HINT}</FormHint>
        </FormField>

        <FormField>
          <FormLabel>Target list</FormLabel>
          <FormSelect value={listId} onChange={(e) => dispatch(formListIdChanged(e.target.value))}>
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
                  onClick={() => dispatch(formLabelToggled(label.id))}
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
            <EpicSelect
              epicCards={epicCards}
              value={epicCardId}
              onChange={(v) => dispatch(formEpicCardIdChanged(v))}
            />
          </FormField>
        )}

        <ModalFooter>
          <button
            className="btn-secondary"
            onClick={() => dispatch(templateFormClosed())}
            disabled={saving}
          >
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
