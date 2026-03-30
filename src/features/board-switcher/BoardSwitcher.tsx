import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { boardSelected, selectBoards, selectSelectedBoardId } from './boardsSlice'
import { registrationOpened } from '../../store/uiSlice'
import { AddButton, Container, Select } from './board-switcher.styled'

export default function BoardSwitcher(): JSX.Element {
  const dispatch = useAppDispatch()
  const boards = useAppSelector(selectBoards)
  const selectedBoardId = useAppSelector(selectSelectedBoardId)

  return (
    <Container>
      <AddButton
        className="btn-secondary"
        onClick={() => dispatch(registrationOpened())}
        title="Add board"
      >
        +
      </AddButton>
      <Select
        value={selectedBoardId ?? ''}
        onChange={(e) => e.target.value && dispatch(boardSelected(e.target.value))}
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
