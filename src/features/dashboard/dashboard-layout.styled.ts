import styled from 'styled-components'

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

export const Title = styled.h1`
  font-size: 22px;
  margin-bottom: 4px;
`

export const LastSync = styled.span`
  font-size: 12px;
  color: var(--color-text-muted);
`

export const ErrorBanner = styled.div`
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: var(--color-danger);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
`

export const Loading = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-muted);
  padding: 40px 0;
  justify-content: center;
`

export const Empty = styled.div`
  padding: 40px;
  text-align: center;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
`

export const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
`

export const AnalyticsHint = styled.p`
  margin: 0;
  font-size: 13px;
`
