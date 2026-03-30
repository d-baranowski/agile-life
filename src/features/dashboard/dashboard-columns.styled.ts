import styled from 'styled-components'

export const ColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`

export const ColumnCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color var(--transition);

  &:hover {
    border-color: var(--color-accent);
  }
`

export const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const ColumnName = styled.span`
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const ColumnCount = styled.span`
  font-size: 22px;
  font-weight: 700;
  color: var(--color-accent);
  flex-shrink: 0;
`

export const ColumnBar = styled.div`
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
`

export const ColumnBarFill = styled.div`
  height: 100%;
  background: var(--color-accent);
  border-radius: 2px;
  transition: width 0.4s ease;
`

export const ColumnPercent = styled.span`
  font-size: 11px;
  color: var(--color-text-muted);
`
