import styled from 'styled-components'

export const MemberWrapper = styled.div`
  position: relative;
`

export const MemberDropdown = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 200;
  background: var(--color-bg-elevated, #2d3748);
  border: 1px solid var(--color-border, #4a5568);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  min-width: 180px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 0;
`

export const MemberDropdownLabel = styled.div`
  padding: 4px 12px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted, #a0aec0);
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

export const MemberDropdownDivider = styled.div`
  height: 1px;
  background: var(--color-border, #4a5568);
  margin: 4px 0;
`

export const MemberDropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 7px 12px;
  text-align: left;
  background: none;
  border: none;
  color: var(--color-text, #e2e8f0);
  font-size: 0.82rem;
  cursor: pointer;

  &:hover {
    background: rgba(49, 130, 206, 0.15);
  }
`

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
