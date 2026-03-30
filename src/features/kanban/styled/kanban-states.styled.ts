import styled from 'styled-components'

export const Centred = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex: 1;
  padding: 48px 24px;
  color: var(--color-text-muted);
`

export const ErrorBanner = styled.div`
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.35);
  color: #e74c3c;
  border-radius: var(--radius-md);
  padding: 12px 16px;
  font-size: 0.875rem;
  max-width: 480px;
  text-align: center;
`

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text);

  p {
    margin: 0;
  }
`

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 1000;
  display: flex;
  align-items: stretch;
  justify-content: center;
`

export const ModalContent = styled.div`
  position: relative;
  background: var(--color-bg);
  width: 100%;
  max-width: 900px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

export const ModalClose = styled.button`
  position: sticky;
  top: 0;
  align-self: flex-end;
  margin: 12px 16px 0;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  z-index: 1;
  transition:
    border-color var(--transition),
    color var(--transition);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
`
