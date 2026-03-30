import type { BoardConfig } from '@shared/board.types'
import { AddButton, Container, Select } from './styled/board-switcher.styled'

interface Props {
  boards: BoardConfig[]
  selectedBoardId: string | null
  onSelect: (boardId: string) => void
  onAddNew: () => void
}

export default function BoardSwitcher(props: Props): JSX.Element {
  const { boards, selectedBoardId, onSelect, onAddNew } = props

  return (
    <Container>
      <AddButton className="btn-secondary" onClick={onAddNew} title="Add board">
        +
      </AddButton>
      <Select
        value={selectedBoardId ?? ''}
        onChange={(e) => e.target.value && onSelect(e.target.value)}
        disabled={boards.length === 0}
        aria-label="Select board"
      >
        {boards.length === 0 ? (
          <option value="">No boards registered</option>
        ) : (
          boards.map((board) => (
            <option key={board.boardId} value={board.boardId}>
              {board.boardName}
              {board.projectCode ? ` · ${board.projectCode}` : ''}
            </option>
          ))
        )}
      </Select>
    </Container>
  )
}
