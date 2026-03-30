import styled from 'styled-components'

export const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 200px;
  max-width: 300px;
`

export const Select = styled.select`
  flex: 1;
  height: 32px;
  padding: 0 8px;
  font-size: 13px;
  background: var(--color-surface-2);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  width: auto;
`

export const AddButton = styled.button`
  height: 32px;
  width: 32px;
  padding: 0;
  font-size: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
`
