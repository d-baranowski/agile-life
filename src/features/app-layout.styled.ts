import styled, { css } from 'styled-components'

export const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
`

export const LoadingScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
  color: var(--color-text-muted);
`

export const Main = styled.main<{ $kanban?: boolean }>`
  flex: 1;
  overflow: auto;
  padding: 24px;

  ${(p) =>
    p.$kanban &&
    css`
      padding: 0;
      overflow: hidden;
    `}
`

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  text-align: center;

  h2 {
    font-size: 20px;
  }

  p {
    margin-bottom: 8px;
  }
`
