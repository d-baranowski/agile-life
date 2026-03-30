import styled from 'styled-components'

export const StatStrip = styled.div`
  display: flex;
  gap: 16px;
`

export const StatCard = styled.div`
  flex: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const StatValue = styled.span`
  font-size: 32px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
`

export const StatLabel = styled.span`
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

export const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const UserRow = styled.div`
  display: grid;
  grid-template-columns: 180px 1fr 48px;
  align-items: center;
  gap: 12px;
`

export const UserName = styled.span`
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const BarWrap = styled.div`
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
`

export const BarFill = styled.div`
  height: 100%;
  background: var(--color-accent);
  border-radius: 4px;
  transition: width 0.4s ease;
`

export const UserCount = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: var(--color-accent);
  text-align: right;
`
