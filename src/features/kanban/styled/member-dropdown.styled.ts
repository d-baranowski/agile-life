import styled from 'styled-components'

export const MemberDropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 200;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
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
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

export const MemberDropdownDivider = styled.div`
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
`

export const MemberDropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 7px 12px;
  text-align: left;
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background var(--transition);

  &:hover {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
`
