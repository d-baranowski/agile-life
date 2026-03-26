/**
 * Ticket Numbering — not yet implemented.
 * See docs/tickets/REQUIREMENTS.md for the full spec.
 */
import type { BoardConfig } from '@shared/board.types'

interface Props {
  board: BoardConfig
}

export default function TicketNumberingPage({ board }: Props): JSX.Element {
  return (
    <div style={{ padding: 32 }}>
      <h1>Ticket Numbering — {board.boardName}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 12 }}>
        Not yet implemented. See <code>docs/tickets/REQUIREMENTS.md</code>.
      </p>
    </div>
  )
}
