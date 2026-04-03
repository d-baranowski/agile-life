import styled from 'styled-components'

export const EditorWrapper = styled.div`
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 4px;
  padding: 4px 0;
  min-width: 180px;
  max-height: 240px;
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
