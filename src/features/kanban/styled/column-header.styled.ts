import styled from 'styled-components'

export const ColumnSelectAllBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  cursor: pointer;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition:
    opacity var(--transition),
    background var(--transition),
    color var(--transition);

  &:hover {
    background: rgba(147, 112, 219, 0.15);
    color: var(--color-accent);
  }
`

export const ColumnHeaderWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;

  &:hover ${ColumnSelectAllBtn} {
    opacity: 1;
  }
`

export const ColumnNameText = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const ColumnCountBadge = styled.span`
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: var(--color-bg);
  border-radius: 10px;
  padding: 1px 7px;
  flex-shrink: 0;
  margin-left: 8px;
`

export const ColumnHeaderActions = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`
