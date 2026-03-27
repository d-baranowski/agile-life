/**
 * TemplatesPage — manage ticket template groups and individual templates.
 *
 * Left panel: template groups for the current board.
 * Right panel: templates in the selected group + "Generate cards" button.
 */
import { useState, useEffect, useCallback } from 'react'
import type { BoardConfig, EpicCardOption } from '@shared/board.types'
import type { KanbanColumn, TrelloLabel } from '@shared/trello.types'
import type {
  TemplateGroup,
  TicketTemplate,
  TicketTemplateInput,
  GenerateCardsResult
} from '@shared/template.types'
import { api } from '../hooks/useApi'
import styles from './TemplatesPage.module.css'

interface Props {
  board: BoardConfig
}

// ─── Placeholder hint text ─────────────────────────────────────────────────────

const PLACEHOLDER_HINT =
  'Supported placeholders: {{year}}, {{month}}, {{month_name}}, {{week}}, {{date}}'

// ─── Label color helper ────────────────────────────────────────────────────────

const TRELLO_COLORS: Record<string, string> = {
  green: '#61bd4f',
  yellow: '#f2d600',
  orange: '#ff9f1a',
  red: '#eb5a46',
  purple: '#c377e0',
  blue: '#0079bf',
  sky: '#00c2e0',
  lime: '#51e898',
  pink: '#ff78cb',
  black: '#344563'
}

function labelColor(color: string): string {
  return TRELLO_COLORS[color] ?? '#b3bac5'
}

// ─── Template form modal ───────────────────────────────────────────────────────

interface TemplateFormProps {
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

function TemplateForm({
  initial,
  groupId,
  boardId: _boardId,
  lists,
  boardLabels,
  epicCards,
  onSave,
  onCancel,
  saving,
  error
}: TemplateFormProps): JSX.Element {
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
            <select
              className={styles.formSelect}
              value={epicCardId}
              onChange={(e) => setEpicCardId(e.target.value)}
            >
              <option value="">— None —</option>
              {epicCards.map((e) => (
                <option key={e.id} value={e.id}>
                  [{e.listName}] {e.name}
                </option>
              ))}
            </select>
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

// ─── Main page component ───────────────────────────────────────────────────────

export default function TemplatesPage({ board }: Props): JSX.Element {
  const [groups, setGroups] = useState<TemplateGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [templates, setTemplates] = useState<TicketTemplate[]>([])
  const [lists, setLists] = useState<KanbanColumn[]>([])
  const [boardLabels, setBoardLabels] = useState<TrelloLabel[]>([])
  const [epicCards, setEpicCards] = useState<EpicCardOption[]>([])

  // Group editing
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Generate
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<GenerateCardsResult | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const loadGroups = useCallback(async () => {
    const result = await api.templates.getGroups(board.boardId)
    if (result.success && result.data) {
      setGroups(result.data)
    }
  }, [board.boardId])

  const loadLists = useCallback(async () => {
    const result = await api.trello.getBoardData(board.boardId)
    if (result.success && result.data) {
      setLists(result.data)
    }
  }, [board.boardId])

  const loadBoardLabels = useCallback(async () => {
    const result = await api.templates.getBoardLabels(board.boardId)
    if (result.success && result.data) {
      setBoardLabels(result.data)
    }
  }, [board.boardId])

  const loadEpicCards = useCallback(async () => {
    if (!board.epicBoardId) return
    const result = await api.epics.getCards(board.boardId)
    if (result.success && result.data) {
      setEpicCards(result.data)
    }
  }, [board.boardId, board.epicBoardId])

  const loadTemplates = useCallback(async () => {
    if (selectedGroupId === null) {
      setTemplates([])
      return
    }
    const result = await api.templates.getTemplates(board.boardId, selectedGroupId)
    if (result.success && result.data) {
      setTemplates(result.data)
    }
  }, [board.boardId, selectedGroupId])

  useEffect(() => {
    setGroups([])
    setSelectedGroupId(null)
    setTemplates([])
    setGenerateResult(null)
    setGenerateError(null)
    loadGroups()
    loadLists()
    loadBoardLabels()
    loadEpicCards()
  }, [loadGroups, loadLists, loadBoardLabels, loadEpicCards])

  useEffect(() => {
    loadTemplates()
    setGenerateResult(null)
    setGenerateError(null)
  }, [loadTemplates])

  // ── Group CRUD ────────────────────────────────────────────────────────────

  const handleCreateGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    const result = await api.templates.createGroup(board.boardId, { name })
    if (result.success && result.data) {
      setGroups((prev) => [...prev, result.data!])
      setSelectedGroupId(result.data.id)
      setNewGroupName('')
      setShowNewGroupInput(false)
    }
  }

  const handleRenameGroup = async (id: number) => {
    const name = editingGroupName.trim()
    if (!name) {
      setEditingGroupId(null)
      return
    }
    const result = await api.templates.updateGroup(board.boardId, id, { name })
    if (result.success) {
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)))
    }
    setEditingGroupId(null)
  }

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Delete this group and all its templates?')) return
    const result = await api.templates.deleteGroup(board.boardId, id)
    if (result.success) {
      setGroups((prev) => prev.filter((g) => g.id !== id))
      if (selectedGroupId === id) setSelectedGroupId(null)
    }
  }

  // ── Template CRUD ─────────────────────────────────────────────────────────

  const handleSaveTemplate = async (input: TicketTemplateInput) => {
    setFormSaving(true)
    setFormError(null)
    if (editingTemplate) {
      const result = await api.templates.updateTemplate(board.boardId, editingTemplate.id, input)
      if (result.success) {
        setShowTemplateForm(false)
        setEditingTemplate(null)
        await loadTemplates()
      } else {
        setFormError(result.error ?? 'Failed to update template.')
      }
    } else {
      const result = await api.templates.createTemplate(board.boardId, input)
      if (result.success) {
        setShowTemplateForm(false)
        await loadTemplates()
      } else {
        setFormError(result.error ?? 'Failed to create template.')
      }
    }
    setFormSaving(false)
  }

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Delete this template?')) return
    const result = await api.templates.deleteTemplate(board.boardId, id)
    if (result.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    }
  }

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (selectedGroupId === null) return
    setGenerating(true)
    setGenerateResult(null)
    setGenerateError(null)
    const result = await api.templates.generateCards(board.boardId, selectedGroupId)
    if (result.success && result.data) {
      setGenerateResult(result.data)
    } else {
      setGenerateError(result.error ?? 'Failed to generate cards.')
    }
    setGenerating(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  return (
    <div className={styles.page}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span>Template Groups</span>
          <button
            className={styles.iconBtn}
            title="New group"
            onClick={() => setShowNewGroupInput((v) => !v)}
          >
            +
          </button>
        </div>

        {showNewGroupInput && (
          <div style={{ padding: '8px 16px', display: 'flex', gap: 6 }}>
            <input
              className={styles.groupEditInput}
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateGroup()
                if (e.key === 'Escape') setShowNewGroupInput(false)
              }}
              autoFocus
            />
            <button
              className="btn-primary"
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={handleCreateGroup}
            >
              Add
            </button>
          </div>
        )}

        <div className={styles.groupList}>
          {groups.length === 0 && (
            <div className={styles.emptyGroups}>No groups yet. Click + to create one.</div>
          )}
          {groups.map((g) => (
            <div
              key={g.id}
              className={`${styles.groupItem} ${selectedGroupId === g.id ? styles.active : ''}`}
              onClick={() => {
                if (editingGroupId !== g.id) setSelectedGroupId(g.id)
              }}
            >
              {editingGroupId === g.id ? (
                <input
                  className={styles.groupEditInput}
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameGroup(g.id)
                    if (e.key === 'Escape') setEditingGroupId(null)
                  }}
                  onBlur={() => handleRenameGroup(g.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={styles.groupItemName}>{g.name}</span>
              )}
              <div className={styles.groupActions}>
                <button
                  className={styles.iconBtn}
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingGroupId(g.id)
                    setEditingGroupName(g.name)
                  }}
                >
                  ✎
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.danger}`}
                  title="Delete group"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteGroup(g.id)
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main panel ── */}
      <div className={styles.main}>
        {selectedGroup === null ? (
          <div className={styles.noSelection}>
            Select a template group from the sidebar, or create one.
          </div>
        ) : (
          <>
            <div className={styles.mainHeader}>
              <span className={styles.mainTitle}>{selectedGroup.name}</span>
              <div className={styles.mainActions}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setEditingTemplate(null)
                    setFormError(null)
                    setShowTemplateForm(true)
                  }}
                >
                  + Add template
                </button>
                <button
                  className="btn-primary"
                  onClick={handleGenerate}
                  disabled={generating || templates.length === 0}
                  title="Create Trello cards from all templates in this group"
                >
                  {generating ? (
                    <span className={styles.generating}>
                      <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      Generating…
                    </span>
                  ) : (
                    '▶ Generate cards'
                  )}
                </button>
              </div>
            </div>

            {generateResult && (
              <div
                className={`${styles.resultBanner} ${generateResult.failed === 0 ? styles.success : styles.error}`}
              >
                {generateResult.created} card{generateResult.created !== 1 ? 's' : ''} created
                {generateResult.failed > 0 && `, ${generateResult.failed} failed`}.
                {generateResult.errors.length > 0 && (
                  <ul className={styles.resultErrors}>
                    {generateResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {generateError && (
              <div className={`${styles.resultBanner} ${styles.error}`}>{generateError}</div>
            )}

            <div className={styles.templateList}>
              {templates.length === 0 ? (
                <div className={styles.emptyState}>
                  <span>No templates in this group yet.</span>
                  <span>Click &quot;+ Add template&quot; to create the first one.</span>
                </div>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className={styles.templateCard}>
                    <div className={styles.templateCardHeader}>
                      <span className={styles.templateName}>{t.name}</span>
                      <div className={styles.groupActions} style={{ opacity: 1 }}>
                        <button
                          className={styles.iconBtn}
                          title="Edit"
                          onClick={() => {
                            setEditingTemplate(t)
                            setFormError(null)
                            setShowTemplateForm(true)
                          }}
                        >
                          ✎
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.danger}`}
                          title="Delete"
                          onClick={() => handleDeleteTemplate(t.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className={styles.templateCardBody}>
                      <span className={styles.templateTitle}>{t.titleTemplate}</span>
                      <span className={styles.templateList_}>→ {t.listName}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Template form modal ── */}
      {showTemplateForm && (
        <TemplateForm
          initial={editingTemplate ?? undefined}
          groupId={selectedGroupId!}
          boardId={board.boardId}
          lists={lists}
          boardLabels={boardLabels}
          epicCards={epicCards}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setShowTemplateForm(false)
            setEditingTemplate(null)
          }}
          saving={formSaving}
          error={formError}
        />
      )}
    </div>
  )
}
