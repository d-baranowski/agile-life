import styled from 'styled-components'
import { SectionTitle } from './dashboard-layout.styled'

export const ChartWrapper = styled.div`
  height: 320px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
`

export const ChartHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  ${SectionTitle} {
    margin-bottom: 0;
  }
`

export const ChartNav = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const ChartNavBtn = styled.button`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 4px 10px;

  &:hover:not(:disabled) {
    background: var(--color-surface-2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

export const ChartNavLabel = styled.span`
  font-size: 12px;
  color: var(--color-text-muted);
  min-width: 160px;
  text-align: center;
`
