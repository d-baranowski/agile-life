import { useState, useCallback } from 'react'
import type { CustomCellEditorProps } from 'ag-grid-react'
import type { TrelloMember } from '../../../../trello/trello.types'
import type { GridRow } from '../../grid.types'
import { EditorWrapper, MemberRow } from '../../styled/members-cell-editor.styled'

type Props = CustomCellEditorProps<GridRow, TrelloMember[]> & {
  boardMembers: TrelloMember[]
}

export default function MembersCellEditor(props: Props): JSX.Element {
  const { value, onValueChange, boardMembers } = props
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((value ?? []).map((m) => m.id))
  )

  const handleToggle = useCallback(
    (memberId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(memberId)) {
          next.delete(memberId)
        } else {
          next.add(memberId)
        }
        const updatedMembers = boardMembers.filter((m) => next.has(m.id))
        onValueChange(updatedMembers)
        return next
      })
    },
    [boardMembers, onValueChange]
  )

  return (
    <EditorWrapper>
      {boardMembers.map((m) => (
        <MemberRow key={m.id}>
          <input
            type="checkbox"
            checked={selectedIds.has(m.id)}
            onChange={() => handleToggle(m.id)}
          />
          {m.fullName}
        </MemberRow>
      ))}
    </EditorWrapper>
  )
}
