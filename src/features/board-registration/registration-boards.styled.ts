import styled, { css } from 'styled-components'

export const BoardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
`

export const BoardOption = styled.button<{ $selected?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  cursor: pointer;
  transition:
    border-color var(--transition),
    background var(--transition);
  color: var(--color-text);

  &:hover {
    border-color: var(--color-accent);
    background: rgba(233, 69, 96, 0.05);
  }

  ${(p) =>
    p.$selected &&
    css`
      border-color: var(--color-accent);
      background: rgba(233, 69, 96, 0.1);
    `}
`

export const BoardName = styled.span`
  font-weight: 500;
  font-size: 14px;
`

export const BoardDesc = styled.span`
  font-size: 12px;
  color: var(--color-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
