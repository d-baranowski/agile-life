import type { TemplateGroup, TicketTemplate, GenerateCardsResult } from '../templates/template.types'
import styled from 'styled-components'
import { resolvePlaceholders } from '../../lib/placeholders'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 1000;
  display: flex;
  align-items: stretch;
  justify-content: center;
`

const Modal = styled.div`
  position: relative;
  background: var(--color-bg);
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  align-self: center;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-surface);
`

const Title = styled.h2`
  font-size: 15px;
  font-weight: 600;
  margin: 0;
`

const CloseButton = styled.button`
  position: sticky;
  top: 0;
  align-self: flex-end;
  margin: 12px 16px 0;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  z-index: 1;
  transition:
    border-color var(--transition),
    color var(--transition);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
`

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const EmptyState = styled.p`
  font-size: 13px;
  color: var(--color-text-muted);
  font-style: italic;
  margin: 0;
`

const GroupRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
`

const Select = styled.select`
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text);
  font-size: 13px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`

const Preview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const PreviewTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const PreviewLoading = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 13px;
`

const PreviewList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const PreviewItem = styled.li`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 7px 12px;
`

const PreviewCardTitle = styled.span`
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
`

const PreviewMeta = styled.span`
  font-size: 11px;
  color: var(--color-text-muted);
  flex-shrink: 0;
`

const ResultBanner = styled.div`
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
`

const ResultSuccess = styled(ResultBanner)`
  background: rgba(39, 174, 96, 0.15);
  border: 1px solid rgba(39, 174, 96, 0.3);
  color: #27ae60;
`

const ResultError = styled(ResultBanner)`
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: var(--color-danger);
`

const ResultErrors = styled.ul`
  margin: 6px 0 0;
  padding-left: 16px;
  font-size: 12px;
`

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-surface);
`

interface Props {
  groups: TemplateGroup[]
  groupId: number | null
  templates: TicketTemplate[]
  loading: boolean
  generating: boolean
  result: GenerateCardsResult | null
  error: string | null
  onGroupChange: (groupId: number) => void
  onGenerate: () => void
  onClose: () => void
}

export default function GenerateTemplateModal(props: Props): JSX.Element {
  const {
    groups,
    groupId,
    templates,
    loading,
    generating,
    result,
    error,
    onGroupChange,
    onGenerate,
    onClose
  } = props

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>📋 Generate from Template</Title>
          <CloseButton onClick={onClose} title="Close (Esc)">
            ✕
          </CloseButton>
        </Header>

        <Body>
          {groups.length === 0 ? (
            <EmptyState>
              No template groups found for this board. Create groups in the Templates tab first.
            </EmptyState>
          ) : (
            <>
              <GroupRow>
                <Label>Template group</Label>
                <Select
                  value={groupId ?? ''}
                  onChange={(e) => onGroupChange(Number(e.target.value))}
                >
                  <option value="">— Select a group —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </GroupRow>

              {groupId !== null && (
                <Preview>
                  <PreviewTitle>Preview</PreviewTitle>
                  {loading ? (
                    <PreviewLoading>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      <span>Loading…</span>
                    </PreviewLoading>
                  ) : templates.length === 0 ? (
                    <EmptyState>
                      This group has no templates. Add templates in the Templates tab.
                    </EmptyState>
                  ) : (
                    <PreviewList>
                      {templates.map((t) => (
                        <PreviewItem key={t.id}>
                          <PreviewCardTitle>
                            {resolvePlaceholders(t.titleTemplate, new Date())}
                          </PreviewCardTitle>
                          <PreviewMeta>→ {t.listName}</PreviewMeta>
                        </PreviewItem>
                      ))}
                    </PreviewList>
                  )}
                </Preview>
              )}

              {result &&
                (result.failed === 0 ? (
                  <ResultSuccess>
                    {result.created} card{result.created !== 1 ? 's' : ''} created
                    {result.failed > 0 && `, ${result.failed} failed`}.
                    {result.errors.length > 0 && (
                      <ResultErrors>
                        {result.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ResultErrors>
                    )}
                  </ResultSuccess>
                ) : (
                  <ResultError>
                    {result.created} card{result.created !== 1 ? 's' : ''} created
                    {result.failed > 0 && `, ${result.failed} failed`}.
                    {result.errors.length > 0 && (
                      <ResultErrors>
                        {result.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ResultErrors>
                    )}
                  </ResultError>
                ))}

              {error && <ResultError>{error}</ResultError>}
            </>
          )}
        </Body>

        <Footer>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {groups.length > 0 && (
            <button
              className="btn-primary"
              onClick={onGenerate}
              disabled={groupId === null || templates.length === 0 || loading || generating}
            >
              {generating ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  Generating…
                </span>
              ) : (
                '▶ Generate cards'
              )}
            </button>
          )}
        </Footer>
      </Modal>
    </Overlay>
  )
}
