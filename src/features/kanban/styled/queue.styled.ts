import styled, { css } from 'styled-components'

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
