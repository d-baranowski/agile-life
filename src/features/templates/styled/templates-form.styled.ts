import styled, { css } from 'styled-components'

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const FormLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
`

const formControlStyles = css`
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text);
  font-size: 13px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`

export const FormInput = styled.input`
  ${formControlStyles}
`

export const FormSelect = styled.select`
  ${formControlStyles}
`

export const FormTextarea = styled.textarea`
  ${formControlStyles}
  resize: vertical;
  min-height: 80px;
  font-family: var(--font-mono);
  font-size: 12px;
`

export const FormHint = styled.span`
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.5;

  code {
    background: var(--color-surface-2);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--font-mono);
  }
`

export const LabelPicker = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const LabelChip = styled.button<{ $selected: boolean }>`
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  border: 2px solid transparent;
  cursor: pointer;
  opacity: ${(p) => (p.$selected ? 1 : 0.6)};
  border-color: ${(p) => (p.$selected ? 'rgba(255, 255, 255, 0.7)' : 'transparent')};
  transition:
    opacity 0.1s,
    border-color 0.1s;

  &:hover {
    opacity: 0.85;
  }
`

export const ResultBanner = styled.div<{ $variant: 'success' | 'error' }>`
  margin: 0 20px 0;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: ${(p) =>
    p.$variant === 'success' ? 'rgba(39, 174, 96, 0.15)' : 'rgba(231, 76, 60, 0.15)'};
  border: 1px solid
    ${(p) => (p.$variant === 'success' ? 'rgba(39, 174, 96, 0.3)' : 'rgba(231, 76, 60, 0.3)')};
  color: ${(p) => (p.$variant === 'success' ? '#27ae60' : 'var(--color-danger)')};
`

export const ResultErrors = styled.ul`
  margin: 6px 0 0;
  padding-left: 16px;
  font-size: 12px;
`
