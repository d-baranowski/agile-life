import styled from 'styled-components'

export const DangerCard = styled.div`
  border-color: rgba(231, 76, 60, 0.3);
`

export const DangerTitle = styled.h2`
  font-size: 15px;
  margin-bottom: 16px;
  color: var(--color-danger);
`

export const ConfirmDelete = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  p {
    font-size: 14px;
  }
`
