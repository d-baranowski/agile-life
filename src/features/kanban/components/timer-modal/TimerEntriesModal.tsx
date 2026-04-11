import { Overlay, Modal, Header, Title, CloseButton, Body } from '../../styled/modal-layout.styled'
import type { CardTimerEntry, TimerEntryEdit } from '../../../timers/timer.types'
import { EntriesList, EmptyState } from './TimerEntriesModal.styled'
import EditableEntry from './EditableEntry'
import CreateManualEntry from './CreateManualEntry'
import { formatDuration } from './timer-modal.utils'

interface Props {
  cardId: string
  cardName: string
  entries: CardTimerEntry[]
  loading: boolean
  onClose: () => void
  onUpdateEntry: (entryId: string, fields: TimerEntryEdit) => Promise<void> | void
  onDeleteEntry: (entryId: string, cardId: string) => Promise<void> | void
  onCreateManual: (
    cardId: string,
    fields: { startedAt: string; stoppedAt: string; durationSeconds: number; note: string }
  ) => Promise<void> | void
}

export default function TimerEntriesModal(props: Props): JSX.Element {
  const {
    cardId,
    cardName,
    entries,
    loading,
    onClose,
    onUpdateEntry,
    onDeleteEntry,
    onCreateManual
  } = props

  const totalSeconds = entries.reduce((acc, e) => acc + e.durationSeconds, 0)

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            Time entries for <strong>{cardName}</strong>
            <span style={{ marginLeft: 8, color: 'var(--color-text-muted)' }}>
              · total {formatDuration(totalSeconds)}
            </span>
          </Title>
          <CloseButton onClick={onClose} title="Close (Esc)">
            ✕
          </CloseButton>
        </Header>
        <Body>
          <CreateManualEntry cardId={cardId} onCreate={onCreateManual} />
          {loading && <EmptyState>Loading…</EmptyState>}
          {!loading && entries.length === 0 && (
            <EmptyState>No time tracked yet. Start the timer on the card.</EmptyState>
          )}
          {!loading && entries.length > 0 && (
            <EntriesList>
              {entries.map((entry) => (
                <EditableEntry
                  key={entry.id}
                  entry={entry}
                  onUpdate={onUpdateEntry}
                  onDelete={onDeleteEntry}
                />
              ))}
            </EntriesList>
          )}
        </Body>
      </Modal>
    </Overlay>
  )
}
