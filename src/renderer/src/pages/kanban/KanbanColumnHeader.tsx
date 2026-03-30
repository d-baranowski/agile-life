import styles from '../KanbanPage.module.css'

interface Props {
  columnId: string
  columnName: string
  cardCount: number
  onSelectAll: (columnId: string) => void
}

export default function KanbanColumnHeader(props: Props): JSX.Element {
  const { columnId, columnName, cardCount, onSelectAll } = props

  return (
    <div className={styles.columnHeader}>
      <span className={styles.columnName}>{columnName}</span>
      <div className={styles.columnHeaderActions}>
        {cardCount > 0 && (
          <button
            className={styles.columnSelectAllBtn}
            onClick={() => onSelectAll(columnId)}
            title={`Select all ${cardCount} cards in ${columnName}`}
            aria-label={`Select all cards in ${columnName}`}
          >
            ☑
          </button>
        )}
        <span className={styles.columnCount}>{cardCount}</span>
      </div>
    </div>
  )
}
