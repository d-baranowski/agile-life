import styled from 'styled-components'

export const MeatballWrapper = styled.div`
  position: relative;
  margin-left: auto;
`

export const MeatballBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 30px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.78rem;
  letter-spacing: 1px;
  cursor: pointer;
  transition:
    background var(--transition),
    border-color var(--transition);

  &:hover,
  &[data-active] {
    background: rgba(147, 112, 219, 0.15);
    border-color: var(--color-accent);
  }

  ${({ $active }) =>
    $active &&
    `
    background: rgba(147, 112, 219, 0.15);
    border-color: var(--color-accent);
  `}
`

export const MeatballMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 500;
  min-width: 210px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const MeatballItem = styled.button<{ $active?: boolean }>`
  display: block;
  width: 100%;
  padding: 9px 14px;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background var(--transition);

  &:hover {
    background: rgba(147, 112, 219, 0.12);
  }

  ${({ $active }) =>
    $active &&
    `
    color: var(--color-accent);
    font-weight: 600;
  `}
`
