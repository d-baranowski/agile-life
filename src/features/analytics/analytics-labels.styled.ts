import styled from 'styled-components'

export const LabelList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export const LabelGroup = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
`

export const LabelHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border);
`

export const LabelDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
`

export const LabelName = styled.span`
  font-size: 13px;
  font-weight: 600;
`

export const LabelTotal = styled.span`
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-muted);
`
