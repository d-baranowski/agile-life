import styled from 'styled-components'

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`

export const ModalContent = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
  padding: 24px;
  width: 480px;
  max-width: calc(100vw - 40px);
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const ModalTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
`

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`
