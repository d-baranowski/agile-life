import styled, { css } from 'styled-components'

/* ── Card wrapper ────────────────────────────────────────────────────────── */

export const CardWrapper = styled.div<{
  $dragging?: boolean
  $duplicate?: boolean
  $selected?: boolean
}>`
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition:
    box-shadow var(--transition),
    border-color var(--transition);
  user-select: none;

  &:hover {
    border-color: var(--color-accent);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  ${(p) =>
    p.$dragging &&
    css`
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      border-color: var(--color-accent);
      cursor: grabbing;
      transform: rotate(1.5deg);
    `}

  ${(p) =>
    p.$selected &&
    css`
      border-color: rgba(147, 112, 219, 0.7);
      background: rgba(147, 112, 219, 0.07);
    `}

  ${(p) =>
    p.$duplicate &&
    css`
      border-color: rgba(232, 184, 75, 0.5);

      &:hover {
        border-color: #e8b84b;
      }
    `}
`

/* ── Card header row (name + checkbox) ───────────────────────────────────── */

export const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
`

export const CardName = styled.span`
  font-size: 0.82rem;
  color: var(--color-text);
  line-height: 1.4;
  flex: 1;
  min-width: 0;
`

/* ── Card selection checkbox ──────────────────────────────────────────────── */

export const Checkbox = styled.button<{ $checked?: boolean }>`
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--transition),
    background var(--transition),
    border-color var(--transition);
  padding: 0;
  line-height: 1;

  ${CardWrapper}:hover & {
    opacity: 1;
  }

  ${(p) =>
    p.$checked &&
    css`
      background: rgba(147, 112, 219, 0.85);
      border-color: rgba(147, 112, 219, 0.9);
      opacity: 1;
    `}
`

/* ── Card footer (labels + actions row) ───────────────────────────────────── */

export const CardFooter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const CardActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
`

export const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
`

export const ColumnAge = styled.span`
  font-size: 0.68rem;
  color: var(--color-text-muted);
  opacity: 0.7;
  white-space: nowrap;

  ${CardWrapper}:hover & {
    opacity: 1;
  }
`

export const TrelloLink = styled.a`
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-decoration: none;
  opacity: 0;
  transition:
    opacity var(--transition),
    color var(--transition);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  line-height: 1;

  ${CardWrapper}:hover & {
    opacity: 1;
  }

  &:hover {
    color: var(--color-accent);
    background: rgba(233, 69, 96, 0.1);
  }
`

/* ── Labels ───────────────────────────────────────────────────────────────── */

export const Labels = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

export const Label = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
`

/* ── Members ──────────────────────────────────────────────────────────────── */

export const Members = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`

export const MemberAvatar = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

/* ── Duplicate badge ─────────────────────────────────────────────────────── */

export const DuplicateBadge = styled.span`
  display: inline-block;
  margin-right: 4px;
  font-size: 0.75rem;
  color: #e8b84b;
  flex-shrink: 0;
`

/* ── Epic board hint ─────────────────────────────────────────────────────── */

export const EpicBoardHint = styled.span`
  font-size: 0.7rem;
  color: var(--color-text-muted);
  opacity: 0.7;
`

/* ── Epic label / assignment on story card ───────────────────────────────── */

export const EpicRow = styled.div`
  position: relative;
`

export const EpicChip = styled.button<{ $empty?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.72rem;
  cursor: pointer;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${(p) =>
    p.$empty
      ? css`
          font-weight: 500;
          background: transparent;
          border: 1px dashed var(--color-border);
          color: var(--color-text-muted);
          transition:
            border-color var(--transition),
            color var(--transition);
          opacity: 0;

          ${CardWrapper}:hover & {
            opacity: 1;
          }

          &:hover {
            border-color: rgba(147, 112, 219, 0.5);
            color: #9370db;
          }
        `
      : css`
          font-weight: 600;
          background: rgba(147, 112, 219, 0.2);
          border: 1px solid rgba(147, 112, 219, 0.45);
          color: #9370db;
          transition:
            background var(--transition),
            border-color var(--transition);

          &:hover {
            background: rgba(147, 112, 219, 0.32);
            border-color: rgba(147, 112, 219, 0.7);
          }
        `}
`

/* ── Epic dropdown ───────────────────────────────────────────────────────── */

export const EpicDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  min-width: 200px;
  max-width: 260px;
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

export const EpicDropdownSearch = styled.div`
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-surface);
  z-index: 1;
`

export const EpicDropdownSearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px;
  font-size: 0.78rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  outline: none;

  &:focus {
    border-color: var(--color-accent, #9370db);
  }
`

export const EpicDropdownItem = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 12px;
  font-size: 0.8rem;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition);
  gap: 2px;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--color-surface-2);
  }

  ${(p) =>
    p.$active &&
    css`
      background: rgba(147, 112, 219, 0.12);
      color: #9370db;
    `}
`

export const EpicDropdownName = styled.span`
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
`

export const EpicDropdownListName = styled.span`
  font-size: 0.68rem;
  color: var(--color-text-muted);
`
