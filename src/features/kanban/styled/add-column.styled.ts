import styled from 'styled-components'

export const AddColumnWrapper = styled.div`
  flex-shrink: 0;
  width: 260px;
  display: flex;
  flex-direction: column;
  align-self: flex-start;
`

export const AddColumnBtn = styled.button`
  width: 100%;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  transition:
    color var(--transition),
    border-color var(--transition),
    background var(--transition);

  &:hover {
    color: var(--color-text);
    border-color: var(--color-accent);
    background: var(--color-surface-2);
  }
`

export const AddColumnForm = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-lg);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const AddColumnTextField = styled.input`
  width: 100%;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.85rem;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: var(--color-accent);
  }

  &::placeholder {
    color: var(--color-text-muted);
  }
`

export const AddColumnActions = styled.div`
  display: flex;
  gap: 6px;
`

export const AddColumnConfirmBtn = styled.button`
  flex: 1;
  padding: 5px 10px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition);

  &:hover {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const AddColumnCancelBtn = styled.button`
  padding: 5px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    color var(--transition),
    border-color var(--transition);

  &:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }
`
