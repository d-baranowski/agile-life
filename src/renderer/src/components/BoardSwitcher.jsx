import styles from './BoardSwitcher.module.css';
export default function BoardSwitcher({ boards, selectedBoardId, onSelect, onAddNew }) {
    return (<div className={styles.container}>
      <button className={`btn-secondary ${styles.addBtn}`} onClick={onAddNew} title="Add board">
        +
      </button>
      <select className={styles.select} value={selectedBoardId ?? ''} onChange={(e) => e.target.value && onSelect(e.target.value)} disabled={boards.length === 0} aria-label="Select board">
        {boards.length === 0 ? (<option value="">No boards registered</option>) : (boards.map((board) => (<option key={board.boardId} value={board.boardId}>
              {board.boardName}
              {board.projectCode ? ` · ${board.projectCode}` : ''}
            </option>)))}
      </select>
    </div>);
}
