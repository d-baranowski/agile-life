import styled from 'styled-components'

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--color-bg-elevated, #2d3748);
  border-bottom: 1px solid var(--color-border, #4a5568);
`

export const SearchInput = styled.input`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border, #4a5568);
  background: var(--color-bg, #1a202c);
  color: var(--color-text, #e2e8f0);
  font-size: 13px;
  width: 200px;
  outline: none;

  &:focus {
    border-color: var(--color-primary, #3182ce);
  }
`

export const FilterBtn = styled.button<{ $active?: boolean }>`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border, #4a5568);
  background: ${(p) => (p.$active ? 'var(--color-primary, #3182ce)' : 'transparent')};
  color: var(--color-text, #e2e8f0);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: var(--color-bg-hover, #4a5568);
  }
`

export const Spacer = styled.div`
  flex: 1;
`

export const SelectionCount = styled.span`
  font-size: 12px;
  color: var(--color-text-muted, #a0aec0);
`

export const BulkBtn = styled.button`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border, #4a5568);
  background: transparent;
  color: var(--color-text, #e2e8f0);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: var(--color-bg-hover, #4a5568);
  }
`

export const ExportBtn = styled.button`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-primary, #3182ce);
  background: transparent;
  color: var(--color-primary, #3182ce);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: var(--color-primary, #3182ce);
    color: #fff;
  }
`
