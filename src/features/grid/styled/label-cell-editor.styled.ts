import styled from 'styled-components'

export const Dropdown = styled.div`
  background: var(--color-surface, #2d3748);
  border: 1px solid var(--color-border, #4a5568);
  border-radius: var(--radius-md, 6px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  padding: 4px 0;
  min-width: 180px;
  max-width: 260px;
  max-height: 300px;
  overflow-y: auto;
`

export const LabelItem = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 14px;
  background: none;
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

export const Check = styled.span`
  display: inline-block;
  width: 14px;
  flex-shrink: 0;
  color: var(--color-accent, #63b3ed);
  font-weight: 700;
`

export const LabelDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
`
