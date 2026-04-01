import type { CustomCellRendererProps } from 'ag-grid-react'
import type { GridRow } from '../../grid.types'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  height: 100%;
`

const Chip = styled.span`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  background: var(--color-bg-subtle, #2d3748);
  color: var(--color-text, #e2e8f0);
  white-space: nowrap;
`

export default function MembersCellRenderer(
  props: CustomCellRendererProps<GridRow>
): JSX.Element | null {
  const members = props.data?.members
  if (!members || members.length === 0) return null

  return (
    <Wrapper>
      {members.map((m) => (
        <Chip key={m.id}>{m.fullName}</Chip>
      ))}
    </Wrapper>
  )
}
