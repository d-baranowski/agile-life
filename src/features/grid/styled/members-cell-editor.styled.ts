import styled from 'styled-components'

export const EditorWrapper = styled.div`
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 4px;
  padding: 4px 0;
  min-width: 220px;
  max-height: 300px;
  overflow-y: auto;
`

export const MemberRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
  color: #e2e8f0;

  &:hover {
    background: #4a5568;
  }
`

export const ButtonRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 6px 10px;
  border-top: 1px solid #4a5568;
  margin-top: 4px;
`

export const ConfirmButton = styled.button`
  flex: 1;
  padding: 5px 8px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: #38a169;
  color: #fff;

  &:hover {
    background: #2f855a;
  }
`

export const RejectButton = styled.button`
  flex: 1;
  padding: 5px 8px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: #4a5568;
  color: #e2e8f0;

  &:hover {
    background: #718096;
  }
`
