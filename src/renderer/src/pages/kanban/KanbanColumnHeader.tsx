import {
  ColumnHeaderWrap,
  ColumnNameText,
  ColumnHeaderActions,
  ColumnSelectAllBtn,
  ColumnCountBadge
} from './styled/column-header.styled'

interface Props {
  columnId: string
  columnName: string
  cardCount: number
  onSelectAll: (columnId: string) => void
}

export default function KanbanColumnHeader(props: Props): JSX.Element {
  const { columnId, columnName, cardCount, onSelectAll } = props

  return (
    <ColumnHeaderWrap>
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
      </ColumnHeaderActions>
    </ColumnHeaderWrap>
  )
}
