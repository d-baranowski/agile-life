import styled from 'styled-components'

export const CreateBoardToggle = styled.button`
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  cursor: pointer;
  font-size: 13px;
  transition:
    border-color var(--transition),
    background var(--transition);

  &:hover {
    border-color: var(--color-accent);
    background: rgba(233, 69, 96, 0.05);
  }
`

export const CreateBoardForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
`
