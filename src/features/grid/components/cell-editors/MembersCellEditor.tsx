import { useState, useCallback } from 'react'
import type { CustomCellEditorProps } from 'ag-grid-react'
import { useGridCellEditor } from 'ag-grid-react'
import type { TrelloMember } from '../../../../trello/trello.types'
import type { GridRow } from '../../grid.types'
import {
  EditorWrapper,
  MemberRow,
  ButtonRow,
  ConfirmButton,
  RejectButton
} from '../../styled/members-cell-editor.styled'

interface MemberEditorParams {
  boardMembers: TrelloMember[]
  onMembersConfirm: (cardId: string, newMembers: TrelloMember[], oldMembers: TrelloMember[]) => void
}

type Props = CustomCellEditorProps<GridRow, TrelloMember[]> & MemberEditorParams

export default function MembersCellEditor(props: Props): JSX.Element {
  const { data, value, boardMembers, onMembersConfirm, api: gridApi } = props
  const originalMembers = value ?? []
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(originalMembers.map((m) => m.id))
  )

  useGridCellEditor({
    isCancelAfterEnd: () => true
  })

  const handleToggle = useCallback((memberId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (!data) return
    const updatedMembers = boardMembers.filter((m) => selectedIds.has(m.id))
    onMembersConfirm(data.id, updatedMembers, originalMembers)
    gridApi.stopEditing()
  }, [data, boardMembers, selectedIds, onMembersConfirm, originalMembers, gridApi])

  const handleReject = useCallback(() => {
    gridApi.stopEditing(true)
  }, [gridApi])

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
      <ButtonRow>
        <ConfirmButton onClick={handleConfirm}>✓ Confirm</ConfirmButton>
        <RejectButton onClick={handleReject}>✕ Cancel</RejectButton>
      </ButtonRow>
    </EditorWrapper>
  )
}
