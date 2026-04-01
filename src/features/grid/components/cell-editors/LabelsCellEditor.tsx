import { useState, useCallback } from 'react'
import type { CustomCellEditorProps } from 'ag-grid-react'
import { useGridCellEditor } from 'ag-grid-react'
import type { GridRow } from '../../grid.types'
import type { TrelloLabel } from '../../../../trello/trello.types'
import { labelColor } from '../../../../lib/label-colors'
import { Dropdown, LabelItem, Check, LabelDot } from '../../styled/label-cell-editor.styled'

interface LabelEditorParams {
  boardLabels: TrelloLabel[]
  onToggleLabel: (cardId: string, label: TrelloLabel, assign: boolean) => void
}

type Props = CustomCellEditorProps<GridRow, TrelloLabel[]> & LabelEditorParams

export default function LabelsCellEditor(props: Props): JSX.Element {
  const { data, value, boardLabels, onToggleLabel } = props
  const [labels, setLabels] = useState<TrelloLabel[]>(value ?? [])

  useGridCellEditor({
    isCancelAfterEnd: () => true
  })

  const handleToggle = useCallback(
    (label: TrelloLabel) => {
      if (!data) return
      const assigned = labels.some((l) => l.id === label.id)
      const updated = assigned ? labels.filter((l) => l.id !== label.id) : [...labels, label]
      setLabels(updated)
      onToggleLabel(data.id, label, !assigned)
    },
    [data, labels, onToggleLabel]
  )

  return (
    <Dropdown>
      {boardLabels.map((label) => {
        const assigned = labels.some((l) => l.id === label.id)
        return (
          <LabelItem key={label.id} onClick={() => handleToggle(label)}>
            <Check>{assigned ? '✓' : ''}</Check>
            <LabelDot style={{ background: labelColor(label.color) }} />
            {label.name || label.color}
          </LabelItem>
        )
      })}
    </Dropdown>
  )
}
