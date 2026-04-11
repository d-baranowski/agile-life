import { useMemo, useState } from 'react'
import {
  AddEntrySection,
  EntryFields,
  FieldLabel,
  FieldInput,
  NoteInput,
  EntryActions,
  SmallButton
} from './TimerEntriesModal.styled'
import {
  isoToLocalInput,
  localInputToIso,
  parseDurationString,
  addSecondsToIso
} from './timer-modal.utils'

interface Props {
  cardId: string
  onCreate: (
    cardId: string,
    fields: { startedAt: string; stoppedAt: string; durationSeconds: number; note: string }
  ) => Promise<void> | void
}

export default function CreateManualEntry(props: Props): JSX.Element {
  const { cardId, onCreate } = props
  const nowLocal = isoToLocalInput(new Date().toISOString())
  const [startedAt, setStartedAt] = useState(nowLocal)
  const [duration, setDuration] = useState('15m')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const parsed = useMemo(() => parseDurationString(duration), [duration])
  const invalid = parsed === null || parsed <= 0

  const handleCreate = async (): Promise<void> => {
    if (!startedAt || invalid) return
    const startedIso = localInputToIso(startedAt)
    const seconds = parsed ?? 0
    setSaving(true)
    try {
      await onCreate(cardId, {
        startedAt: startedIso,
        stoppedAt: addSecondsToIso(startedIso, seconds),
        durationSeconds: seconds,
        note
      })
      setNote('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AddEntrySection>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        Forgot to start the timer? Log an entry manually:
      </div>
      <EntryFields>
        <FieldLabel>
          Started
          <FieldInput
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
        </FieldLabel>
        <FieldLabel>
          Duration
          <FieldInput
            type="text"
            value={duration}
            placeholder="e.g. 1h 30m"
            onChange={(e) => setDuration(e.target.value)}
            style={invalid ? { borderColor: '#e85c5c' } : undefined}
          />
        </FieldLabel>
      </EntryFields>
      <FieldLabel>
        Note
        <NoteInput
          type="text"
          value={note}
          placeholder="Optional note…"
          onChange={(e) => setNote(e.target.value)}
        />
      </FieldLabel>
      <EntryActions>
        <SmallButton onClick={handleCreate} disabled={saving || invalid}>
          {saving ? 'Creating…' : '+ Add entry'}
        </SmallButton>
      </EntryActions>
    </AddEntrySection>
  )
}
