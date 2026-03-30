import styled from 'styled-components'

export const TemplateList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const TemplateCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const TemplateCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const TemplateName = styled.span`
  font-weight: 500;
  font-size: 13px;
`

export const TemplateCardBody = styled.div`
  font-size: 12px;
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const TemplateTitleCode = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--color-surface-2);
  border-radius: 3px;
  padding: 2px 6px;
  display: inline-block;
  margin-top: 2px;
`

export const TemplateListLabel = styled.span`
  color: var(--color-text-muted);
  font-size: 11px;
`
