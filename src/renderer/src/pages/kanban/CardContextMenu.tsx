import type { KanbanCard, TrelloMember, TrelloLabel } from '@shared/trello.types'
import { labelColor } from '../../lib/label-colors'
import type { ContextMenuState } from './kanban.types'
import styles from '../KanbanPage.module.css'

interface Props {
  contextMenu: ContextMenuState
  contextMenuRef: React.RefObject<HTMLDivElement | null>
  boardMembers: TrelloMember[]
  boardLabels: TrelloLabel[]
  onArchive: (cardId: string) => void
  onToggleMember: (cardId: string, memberId: string, assign: boolean) => void
  onToggleLabel: (cardId: string, label: TrelloLabel, assign: boolean) => void
}

export default function CardContextMenu({
  contextMenu,
  contextMenuRef,
  boardMembers,
  boardLabels,
  onArchive,
  onToggleMember,
  onToggleLabel
}: Props): JSX.Element {
  const card: KanbanCard = contextMenu.card
  return (
    <div
      ref={contextMenuRef}
      className={styles.contextMenu}
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <button className={styles.contextMenuItem} onClick={() => onArchive(card.id)}>
        🗄️ Archive card
      </button>
      {boardMembers.length > 0 && (
        <>
          <div className={styles.contextMenuDivider} />
          <div className={styles.contextMenuLabel}>Assign to:</div>
          {boardMembers.map((member) => {
            const assigned = card.members.some((m) => m.id === member.id)
            return (
              <button
                key={member.id}
                className={styles.contextMenuItem}
                onClick={() => onToggleMember(card.id, member.id, !assigned)}
              >
                <span className={styles.contextMenuCheck}>{assigned ? '✓' : ''}</span>
                {member.fullName}
              </button>
            )
          })}
        </>
      )}
      {boardLabels.length > 0 && (
        <>
          <div className={styles.contextMenuDivider} />
          <div className={styles.contextMenuLabel}>Labels:</div>
          {boardLabels.map((label) => {
            const assigned = card.labels.some((l) => l.id === label.id)
            return (
              <button
                key={label.id}
                className={styles.contextMenuItem}
                onClick={() => onToggleLabel(card.id, label, !assigned)}
              >
                <span className={styles.contextMenuCheck}>{assigned ? '✓' : ''}</span>
                <span
                  className={styles.contextMenuLabelDot}
                  style={{ background: labelColor(label.color) }}
                />
                {label.name || label.color}
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}
