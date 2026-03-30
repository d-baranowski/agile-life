import styled, { css } from 'styled-components'

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 16px;
  height: 52px;
  flex-shrink: 0;
  gap: 16px;
`

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
`

export const Logo = styled.span`
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  color: var(--color-text);
  letter-spacing: -0.02em;
`

export const SyncBtn = styled.button`
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
`

export const SyncingLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`

export const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
`

export const NavBtn = styled.button<{ $active?: boolean }>`
  background: transparent;
  color: var(--color-text-muted);
  border: none;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  white-space: nowrap;
  transition:
    background var(--transition),
    color var(--transition);

  &:hover {
    background: var(--color-surface-2);
    color: var(--color-text);
  }

  ${(p) =>
    p.$active &&
    css`
      background: rgba(233, 69, 96, 0.15);
      color: var(--color-accent);
    `}
`
