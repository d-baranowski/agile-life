/**
 * TemplatesPage — manage ticket template groups and individual templates.
 *
 * Left panel: template groups for the current board.
 * Right panel: templates in the selected group + "Generate cards" button.
 */
import { useEffect } from 'react'
import type { BoardConfig } from '../../lib/board.types'
import TemplateForm from './TemplateForm'
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
} from './styled/templates-layout.styled'
import {
  GroupList,
  GroupItem,
  GroupItemName,
  GroupActions,
  IconBtn,
  EmptyGroups,
  GroupEditInput
} from './styled/templates-groups.styled'
import {
  TemplateList,
  TemplateCard,
  TemplateCardHeader,
  TemplateName,
  TemplateCardBody,
  TemplateTitleCode,
  TemplateListLabel
} from './styled/templates-cards.styled'
import { ResultBanner, ResultErrors } from './styled/templates-form.styled'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchTemplatePageData,
  fetchTemplates,
  createTemplateGroup,
  renameTemplateGroup,
  deleteTemplateGroup,
  deleteTemplate,
  generateCards,
  templatesPageReset,
  groupSelected,
  groupEditStarted,
  groupEditCancelled,
  editingGroupNameChanged,
  newGroupNameChanged,
  newGroupInputToggled,
  newGroupInputClosed,
  templateFormOpened
} from './templatesSlice'

interface Props {
  board: BoardConfig
}

// ─── Main page component ───────────────────────────────────────────────────────

export default function TemplatesPage(props: Props): JSX.Element {
  const { board } = props
  const dispatch = useAppDispatch()

  const groups = useAppSelector((s) => s.templates.groups)
  const selectedGroupId = useAppSelector((s) => s.templates.selectedGroupId)
  const templates = useAppSelector((s) => s.templates.templates)
  const editingGroupId = useAppSelector((s) => s.templates.editingGroupId)
  const editingGroupName = useAppSelector((s) => s.templates.editingGroupName)
  const newGroupName = useAppSelector((s) => s.templates.newGroupName)
  const showNewGroupInput = useAppSelector((s) => s.templates.showNewGroupInput)
  const showTemplateForm = useAppSelector((s) => s.templates.showTemplateForm)
  const generating = useAppSelector((s) => s.templates.generating)
  const generateResult = useAppSelector((s) => s.templates.generateResult)
  const generateError = useAppSelector((s) => s.templates.generateError)

  useEffect(() => {
    dispatch(templatesPageReset())
    dispatch(fetchTemplatePageData({ boardId: board.boardId, epicBoardId: board.epicBoardId }))
  }, [dispatch, board.boardId, board.epicBoardId])

  useEffect(() => {
    if (selectedGroupId !== null) {
      dispatch(fetchTemplates({ boardId: board.boardId, groupId: selectedGroupId }))
    }
  }, [dispatch, board.boardId, selectedGroupId])

  // ── Group CRUD ────────────────────────────────────────────────────────────

  const handleCreateGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    dispatch(createTemplateGroup({ boardId: board.boardId, name }))
  }

  const handleRenameGroup = (id: number) => {
    const name = editingGroupName.trim()
    if (!name) {
      dispatch(groupEditCancelled())
      return
    }
    dispatch(renameTemplateGroup({ boardId: board.boardId, groupId: id, name }))
  }

  const handleDeleteGroup = (id: number) => {
    if (!confirm('Delete this group and all its templates?')) return
    dispatch(deleteTemplateGroup({ boardId: board.boardId, groupId: id }))
  }

  // ── Template CRUD ─────────────────────────────────────────────────────────

  const handleDeleteTemplate = (id: number) => {
    if (!confirm('Delete this template?')) return
    dispatch(deleteTemplate({ boardId: board.boardId, templateId: id }))
  }

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = () => {
    if (selectedGroupId === null) return
    dispatch(generateCards({ boardId: board.boardId, groupId: selectedGroupId }))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  return (
    <Page>
      {/* ── Sidebar ── */}
      <Sidebar>
        <SidebarHeader>
          <span>Template Groups</span>
          <IconBtn title="New group" onClick={() => dispatch(newGroupInputToggled())}>
            +
          </IconBtn>
        </SidebarHeader>

        {showNewGroupInput && (
          <div style={{ padding: '8px 16px', display: 'flex', gap: 6 }}>
            <GroupEditInput
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => dispatch(newGroupNameChanged(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateGroup()
                if (e.key === 'Escape') dispatch(newGroupInputClosed())
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
                if (editingGroupId !== g.id) dispatch(groupSelected(g.id))
              }}
            >
              {editingGroupId === g.id ? (
                <GroupEditInput
                  value={editingGroupName}
                  onChange={(e) => dispatch(editingGroupNameChanged(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameGroup(g.id)
                    if (e.key === 'Escape') dispatch(groupEditCancelled())
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
                    dispatch(groupEditStarted({ id: g.id, name: g.name }))
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
                  onClick={() => dispatch(templateFormOpened(null))}
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
                        <IconBtn title="Edit" onClick={() => dispatch(templateFormOpened(t))}>
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
      {showTemplateForm && <TemplateForm boardId={board.boardId} />}
    </Page>
  )
}
