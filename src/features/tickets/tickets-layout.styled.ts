import styled, { css } from 'styled-components'

export const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const Title = styled.h1`
  font-size: 22px;
`

export const Description = styled.p`
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.6;

  code {
    background: var(--color-surface-2);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: var(--font-mono);
  }
`

export const ErrorBanner = styled.div`
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: var(--color-danger);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
`

export const CardTitle = styled.h2`
  font-size: 15px;
  margin-bottom: 16px;
`

export const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
  margin-bottom: 16px;
`

export const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
`

export const Hint = styled.span`
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: 12px;
`

export const PreviewBox = styled.div`
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: 13px;
  margin-bottom: 16px;
  color: var(--color-text-muted);
`

export const Code = styled.span`
  font-family: var(--font-mono);
  color: var(--color-text);
  font-size: 14px;
`

export const StatusRow = styled.div`
  display: flex;
`

export const StatusBadge = styled.span<{ $variant: 'ok' | 'warn' }>`
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;

  ${(p) =>
    p.$variant === 'ok'
      ? css`
          background: rgba(39, 174, 96, 0.15);
          color: var(--color-success);
        `
      : css`
          background: rgba(243, 156, 18, 0.15);
          color: var(--color-warning);
        `}
`

export const Actions = styled.div`
  display: flex;
  gap: 12px;
`
