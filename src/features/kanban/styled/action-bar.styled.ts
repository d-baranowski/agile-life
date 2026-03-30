import styled from 'styled-components'

export const ActionBar = styled.div`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1500;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--color-surface);
  border: 1px solid rgba(147, 112, 219, 0.5);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
`

export const CardCount = styled.span`
  font-size: 0.82rem;
  font-weight: 600;
  color: #9370db;
`

export const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const ClearButton = styled.button`
  padding: 5px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  cursor: pointer;
  transition:
    border-color var(--transition),
    color var(--transition);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
`

export const ArchiveButton = styled.button`
  padding: 5px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(220, 80, 80, 0.5);
  background: rgba(220, 80, 80, 0.12);
  color: #e05555;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition),
    border-color var(--transition);

  &:hover:not(:disabled) {
    background: rgba(220, 80, 80, 0.25);
    border-color: rgba(220, 80, 80, 0.8);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
