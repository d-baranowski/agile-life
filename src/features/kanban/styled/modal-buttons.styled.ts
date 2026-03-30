import styled from 'styled-components'

export const CancelButton = styled.button`
  padding: 6px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  transition:
    border-color var(--transition),
    color var(--transition);

  &:hover:not(:disabled) {
    border-color: var(--color-text-muted);
    color: var(--color-text);
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

export const StartButton = styled.button`
  padding: 6px 14px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition);

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

export const BulkArchiveButton = styled.button`
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
