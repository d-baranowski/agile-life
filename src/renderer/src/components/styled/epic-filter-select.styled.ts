import styled from 'styled-components'

export const Container = styled.div`
  position: relative;
  min-width: 160px;
`

export const Trigger = styled.button<{ $open?: boolean }>`
  appearance: none;
  -webkit-appearance: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid ${(p) => (p.$open ? 'var(--color-accent)' : 'var(--color-border)')};
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.82rem;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  gap: 8px;
  transition: border-color var(--transition);
  outline: ${(p) => (p.$open ? 'none' : undefined)};

  &:hover {
    border-color: ${(p) => (p.$open ? 'var(--color-accent)' : 'var(--color-text-muted)')};
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
  z-index: 200;
  min-width: max(100%, 260px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`
