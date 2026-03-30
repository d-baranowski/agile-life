import styled from 'styled-components'

export const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-accent);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.85rem;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  font-family: inherit;
  flex-shrink: 0;

  &::placeholder {
    color: var(--color-text-muted);
  }
`
