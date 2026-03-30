import styled from 'styled-components'

export const Page = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
`

export const Sidebar = styled.aside`
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
  font-size: 13px;
`

export const MainPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export const MainHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border);
  gap: 12px;
`

export const MainTitle = styled.span`
  font-weight: 600;
  font-size: 15px;
`

export const MainActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 10px;
  color: var(--color-text-muted);
  font-size: 13px;
  padding: 40px;
  text-align: center;
`

export const NoSelection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--color-text-muted);
  font-size: 13px;
`

export const GeneratingSpan = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`
