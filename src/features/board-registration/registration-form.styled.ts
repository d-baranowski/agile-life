import styled, { css } from 'styled-components'

export const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
`

export const Optional = styled.span`
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: 12px;
`

export const Hint = styled.p`
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.6;
`

export const InfoPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, rgba(52, 152, 219, 0.08), rgba(52, 152, 219, 0.02)),
    var(--color-surface-2);

  h3 {
    font-size: 16px;
    margin: 0;
  }
`

export const GuideList = styled.ol`
  margin: 0;
  padding-left: 18px;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.7;
`

export const LinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`

export const ActionLink = styled.a<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition:
    background var(--transition),
    border-color var(--transition),
    color var(--transition),
    opacity var(--transition);

  &:hover {
    background: var(--color-surface-2);
    border-color: var(--color-accent);
  }

  ${(p) =>
    p.$disabled &&
    css`
      opacity: 0.55;
      cursor: not-allowed;
      border-color: var(--color-border);
      background: var(--color-surface);

      &:hover {
        opacity: 0.55;
        border-color: var(--color-border);
        background: var(--color-surface);
      }
    `}

  @media (max-width: 640px) {
    width: 100%;
  }
`

export const TipBox = styled.div`
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: rgba(243, 156, 18, 0.12);
  border: 1px solid rgba(243, 156, 18, 0.28);
  color: var(--color-text);
  font-size: 13px;
  line-height: 1.6;

  code {
    font-size: 12px;
  }
`
