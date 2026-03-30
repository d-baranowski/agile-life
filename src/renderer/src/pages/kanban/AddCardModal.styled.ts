import styled, { css } from 'styled-components'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 1000;
  display: flex;
  align-items: stretch;
  justify-content: center;
`

export const Modal = styled.div`
  position: relative;
  background: var(--color-bg);
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-surface);
`

export const Title = styled.span`
  font-size: 0.9rem;
  color: var(--color-text-muted);

  strong {
    color: var(--color-text);
  }
`

export const CloseButton = styled.button`
  position: sticky;
  top: 0;
  align-self: flex-end;
  margin: 0;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  z-index: 1;
  transition:
    border-color var(--transition),
    color var(--transition);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
`

export const Body = styled.div`
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex: 1;
`

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

export const PreviewList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid var(--color-border);
  padding-top: 10px;
`

export const PreviewItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
`

export const PreviewName = styled.span`
  flex: 1;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PreviewRemove = styled.button`
  flex-shrink: 0;
  padding: 1px 5px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: color var(--transition);

  &:hover {
    color: var(--color-danger);
  }
`

export const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-surface);
`

export const CancelButton = styled.button`
  padding: 6px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  transition:
    border-color var(--transition),
    color var(--transition);

  &:hover:not(:disabled) {
    border-color: var(--color-text-muted);
    color: var(--color-text);
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

export const StartButton = styled.button`
  padding: 6px 14px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition);

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

export const QueueList = styled.div`
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
`

export const QueueItem = styled.div<{ $status?: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  transition: border-color var(--transition);

  ${(p) =>
    p.$status === 'running' &&
    css`
      border-color: var(--color-info);
    `}

  ${(p) =>
    p.$status === 'done' &&
    css`
      border-color: var(--color-success);
    `}

  ${(p) =>
    p.$status === 'failed' &&
    css`
      border-color: var(--color-danger);
    `}
`

export const QueueIcon = styled.span<{ $status?: string }>`
  flex-shrink: 0;
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;

  ${(p) =>
    p.$status === 'done' &&
    css`
      color: var(--color-success);
      font-weight: 700;
    `}

  ${(p) =>
    p.$status === 'failed' &&
    css`
      color: var(--color-danger);
      font-weight: 700;
    `}
`

export const QueueName = styled.span<{ $status?: string }>`
  flex: 1;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${(p) =>
    p.$status === 'failed' &&
    css`
      color: var(--color-text-muted);
      text-decoration: line-through;
    `}
`

export const RemoveButton = styled.button`
  flex-shrink: 0;
  padding: 1px 5px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: color var(--transition);

  &:hover {
    color: var(--color-danger);
  }
`

export const RetryButton = styled.button`
  flex-shrink: 0;
  padding: 3px 8px;
  background: none;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition:
    background var(--transition),
    color var(--transition);

  &:hover {
    background: var(--color-danger);
    color: #fff;
  }
`

export const UploadingLabel = styled.span`
  flex: 1;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  font-style: italic;
`

export const BulkArchiveButton = styled.button`
  padding: 5px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(220, 80, 80, 0.5);
  background: rgba(220, 80, 80, 0.12);
  color: #e05555;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition),
    border-color var(--transition);

  &:hover:not(:disabled) {
    background: rgba(220, 80, 80, 0.25);
    border-color: rgba(220, 80, 80, 0.8);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
