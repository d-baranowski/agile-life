import styled from 'styled-components'

export const GroupList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
`

export const GroupActions = styled.div<{ $alwaysVisible?: boolean }>`
  display: flex;
  gap: 4px;
  opacity: ${(p) => (p.$alwaysVisible ? 1 : 0)};
  transition: opacity 0.1s;
`

export const GroupItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  border-radius: 0;
  transition: background 0.1s;
  gap: 6px;
  background: ${(p) => (p.$active ? 'var(--color-surface-2)' : 'transparent')};
  font-weight: ${(p) => (p.$active ? 500 : 'normal')};

  &:hover {
    background: var(--color-surface-2);
  }

  &:hover ${GroupActions}, ${() => `&[data-active='true'] ${GroupActions}`} {
    opacity: 1;
  }
`

export const GroupItemName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const IconBtn = styled.button<{ $danger?: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  line-height: 1;
  transition:
    color 0.1s,
    background 0.1s;

  &:hover {
    color: ${(p) => (p.$danger ? 'var(--color-danger)' : 'var(--color-text)')};
    background: var(--color-border);
  }
`

export const EmptyGroups = styled.div`
  padding: 20px 16px;
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
`

export const GroupEditInput = styled.input`
  flex: 1;
  padding: 2px 6px;
  font-size: 13px;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  min-width: 0;

  &:focus {
    outline: none;
  }
`
