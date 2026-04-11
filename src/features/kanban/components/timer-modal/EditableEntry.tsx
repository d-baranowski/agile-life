import { useEffect, useMemo, useState } from 'react'
import type { CardTimerEntry, TimerEntryEdit } from '../../../timers/timer.types'
import {
  EntryRow,
  EntryFields,
  FieldLabel,
  FieldInput,
  NoteInput,
  EntryActions,
  StatusBadge,
  SmallButton,
  DangerButton
} from './TimerEntriesModal.styled'
import {
  isoToLocalInput,
  localInputToIso,
  formatDurationInput,
  parseDurationString,
  addSecondsToIso
} from './timer-modal.utils'

interface Props {
  entry: CardTimerEntry
  onUpdate: (entryId: string, fields: TimerEntryEdit) => Promise<void> | void
  onDelete: (entryId: string, cardId: string) => Promise<void> | void
}

interface FormState {
  startedAt: string
  duration: string
  note: string
}

function entryToForm(entry: CardTimerEntry): FormState {
  return {
    startedAt: isoToLocalInput(entry.startedAt),
    duration: formatDurationInput(entry.durationSeconds),
    note: entry.note
  }
}

export default function EditableEntry(props: Props): JSX.Element {
  const { entry, onUpdate, onDelete } = props
  const isRunning = entry.stoppedAt === null
  const [form, setForm] = useState<FormState>(() => entryToForm(entry))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(entryToForm(entry))
  }, [entry])

  // Live elapsed tick while running — updates the read-only display.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isRunning) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [isRunning])

  const liveElapsed = isRunning
    ? Math.max(0, Math.floor((now - new Date(entry.startedAt).getTime()) / 1000))
    : entry.durationSeconds

  const parsedDuration = useMemo(() => parseDurationString(form.duration), [form.duration])
  const durationInvalid = !isRunning && parsedDuration === null

  const dirty = useMemo(() => {
    const current = entryToForm(entry)
    return (
      current.startedAt !== form.startedAt ||
      current.duration !== form.duration ||
      current.note !== form.note
    )
  }, [entry, form])

  const handleSave = async (): Promise<void> => {
    if (durationInvalid) return
    const startedIso = localInputToIso(form.startedAt)
    if (isRunning) {
      await onUpdate(entry.id, {
        startedAt: startedIso,
        stoppedAt: null,
        durationSeconds: 0,
        note: form.note
      })
      return
    }
    const seconds = parsedDuration ?? 0
    setSaving(true)
    try {
      await onUpdate(entry.id, {
        startedAt: startedIso,
        stoppedAt: addSecondsToIso(startedIso, seconds),
        durationSeconds: seconds,
        note: form.note
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <EntryRow>
      <EntryFields>
        <FieldLabel>
          Started
          <FieldInput
            type="datetime-local"
            value={form.startedAt}
            onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel>
          Duration
          {isRunning ? (
            <FieldInput type="text" value={formatDurationInput(liveElapsed)} disabled />
          ) : (
            <FieldInput
              type="text"
              value={form.duration}
              placeholder="e.g. 1h 30m"
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              style={durationInvalid ? { borderColor: '#e85c5c' } : undefined}
            />
          )}
        </FieldLabel>
      </EntryFields>

      <FieldLabel>
        Note
        <NoteInput
          type="text"
          value={form.note}
          placeholder="Optional note…"
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </FieldLabel>

      <EntryActions>
        <StatusBadge $running={isRunning}>
          {isRunning ? 'running — stop from the card' : 'stopped'}
        </StatusBadge>
        <SmallButton onClick={handleSave} disabled={!dirty || saving || durationInvalid}>
          {saving ? 'Saving…' : 'Save'}
        </SmallButton>
        <DangerButton
          onClick={() => {
            if (confirm('Delete this entry and its Trello comment?')) {
              onDelete(entry.id, entry.cardId)
            }
          }}
        >
          Delete
        </DangerButton>
      </EntryActions>
    </EntryRow>
  )
}
