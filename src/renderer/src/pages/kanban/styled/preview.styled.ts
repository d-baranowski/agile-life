import styled from 'styled-components'

export const PreviewList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid var(--color-border);
  padding-top: 10px;
`

export const PreviewItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
`

export const PreviewName = styled.span`
  flex: 1;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PreviewRemove = styled.button`
  flex-shrink: 0;
  padding: 1px 5px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: color var(--transition);

  &:hover {
    color: var(--color-danger);
  }
`
