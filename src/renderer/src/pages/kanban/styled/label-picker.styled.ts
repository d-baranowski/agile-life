import styled from 'styled-components'

export const Section = styled.div`
  display: flex;
  flex-direction: column;
`

export const SectionLabel = styled.div`
  padding: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

export const PickerGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const LabelChip = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${(p) => (p.$selected ? 'var(--chip-color, var(--color-accent))' : 'var(--color-border)')};
  background: ${(p) =>
    p.$selected
      ? 'color-mix(in srgb, var(--chip-color, var(--color-accent)) 15%, transparent)'
      : 'var(--color-surface)'};
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    border-color var(--transition),
    background var(--transition);

  &:hover {
    border-color: var(--chip-color, var(--color-accent));
  }
`

export const ChipDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
`

export const ChipCheck = styled.span`
  margin-left: 2px;
  color: var(--chip-color, var(--color-accent));
  font-weight: 700;
  font-size: 0.75rem;
`

export const NotFound = styled.span`
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
`
