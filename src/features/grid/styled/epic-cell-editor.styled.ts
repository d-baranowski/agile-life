import styled from 'styled-components'

export const Dropdown = styled.div`
  background: var(--color-surface, #2d3748);
  border: 1px solid var(--color-border, #4a5568);
  border-radius: var(--radius-md, 6px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  padding: 4px 0;
  min-width: 200px;
  max-width: 280px;
  max-height: 320px;
  display: flex;
  flex-direction: column;
`

export const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  background: var(--color-surface-2, #4a5568);
  border: none;
  border-bottom: 1px solid var(--color-border, #4a5568);
  border-radius: var(--radius-md, 6px) var(--radius-md, 6px) 0 0;
  color: var(--color-text, #e2e8f0);
  font-size: 0.82rem;
  outline: none;
  box-sizing: border-box;

  &::placeholder {
    color: var(--color-text-muted, #a0aec0);
  }
`

export const OptionsList = styled.div`
  overflow-y: auto;
  flex: 1;
`

export const OptionItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 14px;
  background: ${(p) => (p.$active ? 'var(--color-surface-2, #4a5568)' : 'none')};
  border: none;
  text-align: left;
  font-size: 0.82rem;
  color: var(--color-text, #e2e8f0);
  cursor: pointer;
  transition: background var(--transition, 0.15s ease);

  &:hover {
    background: var(--color-surface-2, #4a5568);
  }
`
