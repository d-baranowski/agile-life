import type { CustomCellRendererProps } from 'ag-grid-react'
import type { GridRow } from '../../grid.types'
import { labelColor, labelTextColor } from '../../../../lib/label-colors'
import styled from 'styled-components'

const Chip = styled.span<{ $bg: string; $fg: string }>`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$fg};
  margin-right: 3px;
  white-space: nowrap;
`

const Wrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  height: 100%;
`

export default function LabelsCellRenderer(
  props: CustomCellRendererProps<GridRow>
): JSX.Element | null {
  const labels = props.data?.labels
  if (!labels || labels.length === 0) return null

  return (
    <Wrapper>
      {labels.map((label) => {
        const bg = labelColor(label.color)
        const fg = labelTextColor(bg)
        return (
          <Chip key={label.id} $bg={bg} $fg={fg}>
            {label.name || label.color}
          </Chip>
        )
      })}
    </Wrapper>
  )
}
