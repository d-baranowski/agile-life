import styled from 'styled-components'

export const Container = styled.div`
  position: relative;
`

export const Trigger = styled.button<{ $open?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid ${(p) => (p.$open ? 'var(--color-primary)' : 'var(--color-border)')};
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  gap: 8px;
  outline: ${(p) => (p.$open ? 'none' : undefined)};

  &:hover {
    border-color: ${(p) => (p.$open ? 'var(--color-primary)' : 'var(--color-text-muted)')};
  }
`

export const TriggerLabel = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const TriggerArrow = styled.span`
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
`

export const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 200;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

export const SearchWrapper = styled.div`
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-surface);
  z-index: 1;
`

export const SearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  font-size: 0.78rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  outline: none;

  &:focus {
    border-color: var(--color-accent, #9370db);
  }
`

export const Option = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 12px;
  font-size: 0.8rem;
  background: ${(p) => (p.$active ? 'rgba(147, 112, 219, 0.12)' : 'none')};
  border: none;
  border-bottom: 1px solid var(--color-border);
  color: ${(p) => (p.$active ? 'var(--color-accent, #9370db)' : 'var(--color-text)')};
  cursor: pointer;
  text-align: left;
  transition: background var(--transition);
  gap: 2px;
  width: 100%;
  font-family: inherit;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${(p) => (p.$active ? 'rgba(147, 112, 219, 0.12)' : 'var(--color-surface-2)')};
  }
`

export const OptionName = styled.span`
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

export const OptionList = styled.span`
  font-size: 0.68rem;
  color: var(--color-text-muted);
`

export const Empty = styled.span`
  padding: 10px 12px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
`
