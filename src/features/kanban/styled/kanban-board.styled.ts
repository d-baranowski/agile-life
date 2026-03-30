import styled from 'styled-components'

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`

export const SearchBar = styled.div`
  padding: 2px 24px 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
`

export const SearchInput = styled.input`
  width: 100%;
  max-width: 360px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.82rem;
  outline: none;
  transition: border-color var(--transition);

  &:focus {
    border-color: var(--color-accent);
  }

  &::placeholder {
    color: var(--color-text-muted);
  }
`

export const EpicFilterSelectStyled = styled.select`
  padding: 6px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.82rem;
  outline: none;
  cursor: pointer;
  max-width: 220px;
  transition: border-color var(--transition);

  &:focus {
    border-color: var(--color-accent);
  }
`

export const ClearSelectionBtn = styled.button`
  padding: 5px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(147, 112, 219, 0.5);
  background: rgba(147, 112, 219, 0.15);
  color: #9370db;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--transition),
    border-color var(--transition);

  &:hover {
    background: rgba(147, 112, 219, 0.28);
    border-color: rgba(147, 112, 219, 0.8);
  }
`

export const Board = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  align-items: stretch;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--color-bg);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 4px;
  }
`

export const Column = styled.div`
  flex-shrink: 0;
  width: 260px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
`

export const CardList = styled.div<{ $isDragOver?: boolean }>`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 40px;
  transition: background var(--transition);

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
  }

  ${({ $isDragOver }) =>
    $isDragOver &&
    `
    background: rgba(233, 69, 96, 0.06);
  `}
`

export const AddCardBtn = styled.button`
  display: block;
  width: 100%;
  padding: 7px 12px;
  background: none;
  border: none;
  border-top: 1px solid var(--color-border);
  text-align: left;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    color var(--transition),
    background var(--transition);
  flex-shrink: 0;

  &:hover {
    color: var(--color-text);
    background: var(--color-surface-2);
  }
`
