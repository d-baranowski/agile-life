import styled from 'styled-components'

export const InfoTable = styled.table`
  th {
    text-align: left;
    color: var(--color-text-muted);
    font-weight: 500;
    font-size: 12px;
  }

  td code {
    font-family: var(--font-mono);
    font-size: 12px;
    background: var(--color-surface-2);
    padding: 2px 6px;
    border-radius: 3px;
  }
`

export const SpTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0 12px;
  font-size: 13px;

  th {
    text-align: left;
    padding: 6px 10px;
    background: var(--color-surface-2);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  td {
    padding: 5px 10px;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }
`

export const SpInput = styled.input`
  width: 100%;
  max-width: 220px;
`

export const SpPointsInput = styled.input`
  width: 72px;
  text-align: center;
`

export const SpActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`

export const DebugHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

export const DebugTableWrap = styled.div`
  margin-top: 12px;
  overflow-x: auto;
`

export const DebugTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th {
    text-align: left;
    padding: 6px 10px;
    background: var(--color-surface-2);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  td {
    padding: 7px 10px;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: var(--color-surface);
  }
`

export const DebugCardName = styled.td`
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
`

export const DebugAge = styled.span`
  font-size: 11px;
  color: var(--color-text-muted);
`

export const DebugBadge = styled.span<{ $variant: 'action' | 'fallback' }>`
  display: inline-block;
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 11px;
  background: ${(p) =>
    p.$variant === 'action' ? 'rgba(39, 174, 96, 0.15)' : 'rgba(243, 156, 18, 0.15)'};
  color: ${(p) => (p.$variant === 'action' ? '#27ae60' : '#d68910')};
  border: 1px solid
    ${(p) => (p.$variant === 'action' ? 'rgba(39, 174, 96, 0.3)' : 'rgba(243, 156, 18, 0.3)')};
`
