import type { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'
import {
  ColumnHeaderWrap,
  ColumnNameText,
  ColumnHeaderActions,
  ColumnSelectAllBtn,
  ColumnCountBadge,
  ColumnRemoveBtn
} from '../styled/column-header.styled'

interface Props {
  columnId: string
  columnName: string
  cardCount: number
  onSelectAll: (columnId: string) => void
  onRemove: (columnId: string) => void
  dragHandleProps?: DraggableProvidedDragHandleProps | null
}

export default function KanbanColumnHeader(props: Props): JSX.Element {
  const { columnId, columnName, cardCount, onSelectAll, onRemove, dragHandleProps } = props

  return (
    <ColumnHeaderWrap {...dragHandleProps}>
      <ColumnNameText>{columnName}</ColumnNameText>
      <ColumnHeaderActions>
        {cardCount > 0 && (
          <ColumnSelectAllBtn
            onClick={() => onSelectAll(columnId)}
            title={`Select all ${cardCount} cards in ${columnName}`}
            aria-label={`Select all cards in ${columnName}`}
          >
            ☑
          </ColumnSelectAllBtn>
        )}
        <ColumnCountBadge>{cardCount}</ColumnCountBadge>
        <ColumnRemoveBtn
          onClick={() => onRemove(columnId)}
          title={`Archive column "${columnName}"`}
          aria-label={`Archive column ${columnName}`}
        >
          ✕
        </ColumnRemoveBtn>
      </ColumnHeaderActions>
    </ColumnHeaderWrap>
  )
}
