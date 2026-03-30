import styled from 'styled-components'

export const EpicWrapper = styled.div`
  position: relative;
`

export const EpicButton = styled.button`
  padding: 5px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(147, 112, 219, 0.5);
  background: rgba(147, 112, 219, 0.15);
  color: #9370db;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition),
    border-color var(--transition);

  &:hover {
    background: rgba(147, 112, 219, 0.28);
    border-color: rgba(147, 112, 219, 0.8);
  }
`

export const EpicDropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 100;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  min-width: 200px;
  max-width: 280px;
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

export const EpicSearchWrapper = styled.div`
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-surface);
  z-index: 1;
  flex-shrink: 0;
`

export const EpicSearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  font-size: 0.78rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  outline: none;
  font-family: inherit;

  &:focus {
    border-color: var(--color-accent, #9370db);
  }
`

export const EpicDropdownItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 12px;
  font-size: 0.8rem;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition);
  gap: 2px;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--color-surface-2);
  }
`

export const EpicName = styled.span`
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
`

export const EpicListLabel = styled.span`
  font-size: 0.68rem;
  color: var(--color-text-muted);
`
