import styled, { css, keyframes } from 'styled-components'

type SummaryVariant = 'running' | 'success' | 'partial'

const summaryVariantStyles: Record<SummaryVariant, ReturnType<typeof css>> = {
  running: css`
    background: rgba(52, 152, 219, 0.1);
    border: 1px solid rgba(52, 152, 219, 0.25);
    color: var(--color-info);
  `,
  success: css`
    background: rgba(39, 174, 96, 0.1);
    border: 1px solid rgba(39, 174, 96, 0.3);
    color: var(--color-success);
  `,
  partial: css`
    background: rgba(243, 156, 18, 0.1);
    border: 1px solid rgba(243, 156, 18, 0.3);
    color: var(--color-warning);
  `
}

export const ProgressSummary = styled.div<{ $variant: SummaryVariant }>`
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 16px;
  ${(p) => summaryVariantStyles[p.$variant]}
`

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

export const Spinner = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid rgba(52, 152, 219, 0.3);
  border-top-color: var(--color-info);
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  flex-shrink: 0;
`

export const SummarySpinner = styled.span`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(52, 152, 219, 0.3);
  border-top-color: var(--color-info);
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  flex-shrink: 0;
`
