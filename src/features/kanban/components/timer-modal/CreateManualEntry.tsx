import { useState } from 'react'
import {
  AddEntrySection,
  EntryFields,
  FieldLabel,
  FieldInput,
  NoteInput,
  EntryActions,
  SmallButton
} from './TimerEntriesModal.styled'
import { isoToLocalInput, localInputToIso } from './timer-modal.utils'

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
  const [stoppedAt, setStoppedAt] = useState(nowLocal)
  const [durationMinutes, setDurationMinutes] = useState('15')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async (): Promise<void> => {
    if (!startedAt || !stoppedAt) return
    const mins = Number(durationMinutes) || 0
    setSaving(true)
    try {
      await onCreate(cardId, {
        startedAt: localInputToIso(startedAt),
        stoppedAt: localInputToIso(stoppedAt),
        durationSeconds: mins * 60,
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
          Stopped
          <FieldInput
            type="datetime-local"
            value={stoppedAt}
            onChange={(e) => setStoppedAt(e.target.value)}
          />
        </FieldLabel>
      </EntryFields>
      <EntryFields style={{ gridTemplateColumns: '1fr 2fr' }}>
        <FieldLabel>
          Duration (min)
          <FieldInput
            type="number"
            min={0}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
        </FieldLabel>
        <FieldLabel>
          Note
          <NoteInput
            type="text"
            value={note}
            placeholder="Optional note…"
            onChange={(e) => setNote(e.target.value)}
          />
        </FieldLabel>
      </EntryFields>
      <EntryActions>
        <SmallButton onClick={handleCreate} disabled={saving}>
          {saving ? 'Creating…' : '+ Add entry'}
        </SmallButton>
      </EntryActions>
    </AddEntrySection>
  )
}
