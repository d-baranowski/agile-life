import styled from 'styled-components'

export const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const Title = styled.h1`
  font-size: 22px;
`

export const CardTitle = styled.h2`
  font-size: 15px;
  margin-bottom: 16px;
`

export const ErrorBanner = styled.div`
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: var(--color-danger);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
`

export const SuccessBanner = styled.div`
  background: rgba(39, 174, 96, 0.15);
  border: 1px solid rgba(39, 174, 96, 0.3);
  color: var(--color-success);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
`

export const ArchiveSuccess = styled.div`
  background: rgba(39, 174, 96, 0.15);
  border: 1px solid rgba(39, 174, 96, 0.3);
  color: #27ae60;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  margin: 12px 0;
`

export const Centred = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-muted);
  padding: 40px 0;
  justify-content: center;
`
