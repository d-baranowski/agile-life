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

export const SyncBtn = styled.button<{ $iconOnly?: boolean }>`
  height: 32px;
  padding: ${(p) => (p.$iconOnly ? '0 10px' : '0 12px')};
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
`

export const NavDropdownWrapper = styled.div`
  position: relative;
  flex-shrink: 0;
`

export const NavDropdownButton = styled.button`
  height: 32px;
  padding: 0 14px 0 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: var(--color-text);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover {
    border-color: var(--color-accent);
  }
`

export const NavDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 160px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
`

export const NavDropdownItem = styled.button<{ $active?: boolean }>`
  background: transparent;
  color: var(--color-text-muted);
  border: none;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;

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
