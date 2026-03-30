import { useState } from 'react'
import type { EpicCardOption } from '@shared/board.types'
import type { KanbanColumn, TrelloLabel } from '@shared/trello.types'
import type { TicketTemplate, TicketTemplateInput } from '@shared/template.types'
import { labelColor } from '../lib/label-colors'
import { EpicSelect } from '../components/EpicSelect'
import styles from './TemplatesPage.module.css'

const PLACEHOLDER_HINT =
  'Supported placeholders: {{year}}, {{month}}, {{month_name}}, {{week}}, {{date}}'

interface Props {
  initial?: TicketTemplate
  groupId: number
  boardId: string
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
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{initial ? 'Edit Template' : 'New Template'}</div>

        {error && <div className={`${styles.resultBanner} ${styles.error}`}>{error}</div>}

        <div className={styles.formField}>
          <label className={styles.formLabel}>Template name</label>
          <input
            className={styles.formInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly retrospective"
            autoFocus
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Card title</label>
          <input
            className={styles.formInput}
            value={titleTemplate}
            onChange={(e) => setTitleTemplate(e.target.value)}
            placeholder="e.g. Retro {{year}}-W{{week}}"
          />
          <span className={styles.formHint}>{PLACEHOLDER_HINT}</span>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Description (optional)</label>
          <textarea
            className={styles.formTextarea}
            value={descTemplate}
            onChange={(e) => setDescTemplate(e.target.value)}
            placeholder="e.g. Sprint {{week}} retrospective for {{year}}"
          />
          <span className={styles.formHint}>{PLACEHOLDER_HINT}</span>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Target list</label>
          <select
            className={styles.formSelect}
            value={listId}
            onChange={(e) => setListId(e.target.value)}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {boardLabels.length > 0 && (
          <div className={styles.formField}>
            <label className={styles.formLabel}>Labels (optional)</label>
            <div className={styles.labelPicker}>
              {boardLabels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  className={`${styles.labelChip} ${selectedLabelIds.includes(label.id) ? styles.labelChipSelected : ''}`}
                  style={{ backgroundColor: labelColor(label.color) }}
                  onClick={() => toggleLabel(label.id)}
                  title={label.name || label.color}
                >
                  {label.name || label.color}
                </button>
              ))}
            </div>
          </div>
        )}

        {epicCards.length > 0 && (
          <div className={styles.formField}>
            <label className={styles.formLabel}>Epic (optional)</label>
            <EpicSelect epicCards={epicCards} value={epicCardId} onChange={setEpicCardId} />
          </div>
        )}

        <div className={styles.modalFooter}>
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
        </div>
      </div>
    </div>
  )
}
