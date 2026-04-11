import styled from 'styled-components'

export const EntriesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const EntryRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
`

export const EntryFields = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
`

export const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.7rem;
  color: var(--color-text-muted);
`

export const FieldInput = styled.input`
  font-family: inherit;
  font-size: 0.8rem;
  padding: 4px 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
`

export const NoteInput = styled.input`
  font-family: inherit;
  font-size: 0.8rem;
  padding: 4px 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  width: 100%;
`

export const EntryActions = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
`

export const StatusBadge = styled.span<{ $running?: boolean }>`
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  color: ${(p) => (p.$running ? 'var(--color-accent)' : 'var(--color-text-muted)')};
  border: 1px solid ${(p) => (p.$running ? 'var(--color-accent)' : 'var(--color-border)')};
  margin-right: auto;
`

export const SmallButton = styled.button`
  font-family: inherit;
  font-size: 0.75rem;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const DangerButton = styled(SmallButton)`
  &:hover {
    border-color: #e85c5c;
    color: #e85c5c;
  }
`

export const AddEntrySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
`

export const EmptyState = styled.div`
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  padding: 20px;
`
