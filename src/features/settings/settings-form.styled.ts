import styled, { css } from 'styled-components'

export const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
`

export const Label = styled.label<{ $row?: boolean }>`
  display: flex;
  flex-direction: ${(p) => (p.$row ? 'row' : 'column')};
  ${(p) =>
    p.$row &&
    css`
      align-items: center;
    `}
  gap: ${(p) => (p.$row ? '10px' : '6px')};
  font-size: 13px;
  font-weight: 500;
`

export const Hint = styled.span`
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.5;
`

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

export const SyncingLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`

export const ArchiveControls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin: 12px 0;
`

export const WeeksLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text);
`

export const WeeksInput = styled.input`
  width: 64px;
  text-align: center;
`

export const PreviewSection = styled.div`
  margin-top: 16px;
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
`

export const PreviewEmpty = styled.p`
  font-size: 13px;
  color: var(--color-text-muted);
  font-style: italic;
`

export const PreviewCount = styled.p`
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 10px;
`

export const PreviewList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
`

export const PreviewItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 13px;
`

export const PreviewCardName = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
`

export const PreviewCardMeta = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  color: var(--color-text-muted);
`

export const PreviewActions = styled.div`
  display: flex;
  gap: 10px;
`
