import styled from 'styled-components'
import type { KanbanCard, TrelloMember, TrelloLabel } from '@shared/trello.types'
import { labelColor } from '../../lib/label-colors'
import type { ContextMenuState } from './kanban.types'

const Menu = styled.div`
  position: fixed;
  z-index: 2000;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  padding: 4px 0;
  min-width: 180px;
  max-width: 260px;
`

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 14px;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.82rem;
  color: var(--color-text);
  cursor: pointer;
  transition: background var(--transition);

  &:hover {
    background: var(--color-surface-2);
  }
`

const Divider = styled.div`
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
`

const Label = styled.div`
  padding: 4px 14px 2px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const Check = styled.span`
  display: inline-block;
  width: 14px;
  flex-shrink: 0;
  color: var(--color-accent);
  font-weight: 700;
`

const LabelDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
`

interface Props {
  contextMenu: ContextMenuState
  contextMenuRef: React.RefObject<HTMLDivElement | null>
  boardMembers: TrelloMember[]
  boardLabels: TrelloLabel[]
  onArchive: (cardId: string) => void
  onToggleMember: (cardId: string, memberId: string, assign: boolean) => void
  onToggleLabel: (cardId: string, label: TrelloLabel, assign: boolean) => void
}

export default function CardContextMenu(props: Props): JSX.Element {
  const {
    contextMenu,
    contextMenuRef,
    boardMembers,
    boardLabels,
    onArchive,
    onToggleMember,
    onToggleLabel
  } = props
  const card: KanbanCard = contextMenu.card
  return (
    <Menu ref={contextMenuRef} style={{ left: contextMenu.x, top: contextMenu.y }}>
      <MenuItem onClick={() => onArchive(card.id)}>🗄️ Archive card</MenuItem>
      {boardMembers.length > 0 && (
        <>
          <Divider />
          <Label>Assign to:</Label>
          {boardMembers.map((member) => {
            const assigned = card.members.some((m) => m.id === member.id)
            return (
              <MenuItem
                key={member.id}
                onClick={() => onToggleMember(card.id, member.id, !assigned)}
              >
                <Check>{assigned ? '✓' : ''}</Check>
                {member.fullName}
              </MenuItem>
            )
          })}
        </>
      )}
      {boardLabels.length > 0 && (
        <>
          <Divider />
          <Label>Labels:</Label>
          {boardLabels.map((label) => {
            const assigned = card.labels.some((l) => l.id === label.id)
            return (
              <MenuItem key={label.id} onClick={() => onToggleLabel(card.id, label, !assigned)}>
                <Check>{assigned ? '✓' : ''}</Check>
                <LabelDot style={{ background: labelColor(label.color) }} />
                {label.name || label.color}
              </MenuItem>
            )
          })}
        </>
      )}
    </Menu>
  )
}
