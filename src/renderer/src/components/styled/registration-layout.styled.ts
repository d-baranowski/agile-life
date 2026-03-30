import styled, { css } from 'styled-components'

export const Container = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 40px;
`

export const Card = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 32px;
  width: 100%;
  max-width: 560px;
  box-shadow: var(--shadow-md);

  @media (max-width: 640px) {
    padding: 20px;
  }
`

export const RegistrationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;

  h2 {
    font-size: 20px;
  }

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
`

export const ErrorBanner = styled.div`
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: var(--color-danger);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 16px;
`

export const Steps = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
`

export const Step = styled.div<{ $active?: boolean; $done?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  opacity: 0.4;

  ${(p) =>
    p.$active &&
    css`
      opacity: 1;
    `}

  ${(p) =>
    p.$done &&
    css`
      opacity: 0.7;
    `}

  & + &::before {
    content: '';
    width: 24px;
    height: 1px;
    background: var(--color-border);
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    width: 100%;

    & + &::before {
      display: none;
    }
  }
`

export const StepNumber = styled.span<{ $active?: boolean; $done?: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;

  ${(p) =>
    p.$active &&
    css`
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: white;
    `}

  ${(p) =>
    p.$done &&
    css`
      background: var(--color-success);
      border-color: var(--color-success);
      color: white;
    `}
`

export const StepLabel = styled.span`
  font-size: 12px;
  white-space: nowrap;
`

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;

  @media (max-width: 640px) {
    flex-direction: column;

    button {
      width: 100%;
    }
  }
`
