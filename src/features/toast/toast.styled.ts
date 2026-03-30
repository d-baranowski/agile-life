import styled, { keyframes } from 'styled-components'

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

export const ToastWrapper = styled.div<{ $success: boolean }>`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${(p) => (p.$success ? 'var(--color-success, #27ae60)' : 'var(--color-danger)')};
  color: #fff;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  max-width: 400px;
  animation: ${slideIn} 200ms ease;
`

export const ToastMessage = styled.span`
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.4;
`

export const ToastCloseButton = styled.button`
  flex-shrink: 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 2px;
  transition: color var(--transition);

  &:hover {
    color: #fff;
  }
`

export const ToastLogsButton = styled.button`
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--radius-sm);
  color: #fff;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 2px 8px;
  transition: background var(--transition);
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`
