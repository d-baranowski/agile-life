import styled, { css } from 'styled-components'
import type { CardStatus } from './tickets.types'

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-bottom: 16px;

  thead tr {
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  th {
    padding: 6px 8px;
    color: var(--color-text-muted);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
  }

  td {
    padding: 6px 8px;
  }

  tbody tr {
    border-bottom: 1px solid var(--color-border);
  }
`

export const CellMuted = styled.td`
  color: var(--color-text-muted);
`

export const ActionsCol = styled.th`
  width: 90px;
  text-align: right;
`

export const StatusCol = styled.th`
  width: 130px;
`

export const StatusCell = styled.td`
  white-space: nowrap;
`

const rowStatusStyles: Record<CardStatus, ReturnType<typeof css>> = {
  success: css`
    opacity: 0.75;
  `,
  'in-progress': css`
    background: rgba(52, 152, 219, 0.06);
  `,
  error: css`
    background: rgba(231, 76, 60, 0.06);
  `,
  cancelled: css`
    opacity: 0.45;
  `,
  queued: css``
}

export const CardRow = styled.tr<{ $status: CardStatus }>`
  transition: background 0.15s;
  ${(p) => rowStatusStyles[p.$status]}
`

const badgeBase = css`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
`

export const BadgeQueued = styled.span`
  ${badgeBase}
  gap: 5px;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
`

export const BadgeInProgress = styled.span`
  ${badgeBase}
  gap: 6px;
  color: var(--color-info);
  background: rgba(52, 152, 219, 0.12);
`

export const BadgeSuccess = styled.span`
  ${badgeBase}
  gap: 5px;
  color: var(--color-success);
  background: rgba(39, 174, 96, 0.12);
`

export const BadgeCancelled = styled.span`
  ${badgeBase}
  gap: 5px;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  text-decoration: line-through;
  opacity: 0.7;
`

export const BadgeError = styled.span`
  ${badgeBase}
  gap: 6px;
  color: var(--color-danger);
  background: rgba(231, 76, 60, 0.12);
`

export const ProposedName = styled.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-success);
`

export const RemoveBtn = styled.button`
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  transition:
    color 0.15s,
    border-color 0.15s;

  &:hover {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }
`

export const ErrorToggle = styled.button`
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: 11px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
`

export const ErrorDetailRow = styled.tr`
  td {
    padding: 4px 8px 8px 8px;
    background: rgba(231, 76, 60, 0.06);
  }
`

export const ErrorDetail = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-danger);
  word-break: break-all;
`
