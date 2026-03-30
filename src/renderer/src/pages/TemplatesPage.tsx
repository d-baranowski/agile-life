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
import TemplateForm from './templates/TemplateForm'
import {
  Page,
  Sidebar,
  SidebarHeader,
  MainPanel,
  MainHeader,
  MainTitle,
  MainActions,
  EmptyState,
  NoSelection,
  GeneratingSpan
} from './templates/styled/templates-layout.styled'
import {
  GroupList,
  GroupItem,
  GroupItemName,
  GroupActions,
  IconBtn,
  EmptyGroups,
  GroupEditInput
} from './templates/styled/templates-groups.styled'
import {
  TemplateList,
  TemplateCard,
  TemplateCardHeader,
  TemplateName,
  TemplateCardBody,
  TemplateTitleCode,
  TemplateListLabel
} from './templates/styled/templates-cards.styled'
import { ResultBanner, ResultErrors } from './templates/styled/templates-form.styled'

interface Props {
  board: BoardConfig
}

// ─── Main page component ───────────────────────────────────────────────────────

export default function TemplatesPage(props: Props): JSX.Element {
  const { board } = props
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
    <Page>
      {/* ── Sidebar ── */}
      <Sidebar>
        <SidebarHeader>
          <span>Template Groups</span>
          <IconBtn title="New group" onClick={() => setShowNewGroupInput((v) => !v)}>
            +
          </IconBtn>
        </SidebarHeader>

        {showNewGroupInput && (
          <div style={{ padding: '8px 16px', display: 'flex', gap: 6 }}>
            <GroupEditInput
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

        <GroupList>
          {groups.length === 0 && <EmptyGroups>No groups yet. Click + to create one.</EmptyGroups>}
          {groups.map((g) => (
            <GroupItem
              key={g.id}
              $active={selectedGroupId === g.id}
              data-active={selectedGroupId === g.id}
              onClick={() => {
                if (editingGroupId !== g.id) setSelectedGroupId(g.id)
              }}
            >
              {editingGroupId === g.id ? (
                <GroupEditInput
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
                <GroupItemName>{g.name}</GroupItemName>
              )}
              <GroupActions>
                <IconBtn
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingGroupId(g.id)
                    setEditingGroupName(g.name)
                  }}
                >
                  ✎
                </IconBtn>
                <IconBtn
                  $danger
                  title="Delete group"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteGroup(g.id)
                  }}
                >
                  ✕
                </IconBtn>
              </GroupActions>
            </GroupItem>
          ))}
        </GroupList>
      </Sidebar>

      {/* ── Main panel ── */}
      <MainPanel>
        {selectedGroup === null ? (
          <NoSelection>Select a template group from the sidebar, or create one.</NoSelection>
        ) : (
          <>
            <MainHeader>
              <MainTitle>{selectedGroup.name}</MainTitle>
              <MainActions>
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
                    <GeneratingSpan>
                      <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      Generating…
                    </GeneratingSpan>
                  ) : (
                    '▶ Generate cards'
                  )}
                </button>
              </MainActions>
            </MainHeader>

            {generateResult && (
              <ResultBanner $variant={generateResult.failed === 0 ? 'success' : 'error'}>
                {generateResult.created} card{generateResult.created !== 1 ? 's' : ''} created
                {generateResult.failed > 0 && `, ${generateResult.failed} failed`}.
                {generateResult.errors.length > 0 && (
                  <ResultErrors>
                    {generateResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ResultErrors>
                )}
              </ResultBanner>
            )}

            {generateError && <ResultBanner $variant="error">{generateError}</ResultBanner>}

            <TemplateList>
              {templates.length === 0 ? (
                <EmptyState>
                  <span>No templates in this group yet.</span>
                  <span>Click &quot;+ Add template&quot; to create the first one.</span>
                </EmptyState>
              ) : (
                templates.map((t) => (
                  <TemplateCard key={t.id}>
                    <TemplateCardHeader>
                      <TemplateName>{t.name}</TemplateName>
                      <GroupActions $alwaysVisible>
                        <IconBtn
                          title="Edit"
                          onClick={() => {
                            setEditingTemplate(t)
                            setFormError(null)
                            setShowTemplateForm(true)
                          }}
                        >
                          ✎
                        </IconBtn>
                        <IconBtn $danger title="Delete" onClick={() => handleDeleteTemplate(t.id)}>
                          ✕
                        </IconBtn>
                      </GroupActions>
                    </TemplateCardHeader>
                    <TemplateCardBody>
                      <TemplateTitleCode>{t.titleTemplate}</TemplateTitleCode>
                      <TemplateListLabel>→ {t.listName}</TemplateListLabel>
                    </TemplateCardBody>
                  </TemplateCard>
                ))
              )}
            </TemplateList>
          </>
        )}
      </MainPanel>

      {/* ── Template form modal ── */}
      {showTemplateForm && (
        <TemplateForm
          initial={editingTemplate ?? undefined}
          groupId={selectedGroupId!}
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
    </Page>
  )
}
