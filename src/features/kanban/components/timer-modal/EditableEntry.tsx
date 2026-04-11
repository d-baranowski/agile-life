import { useState, useMemo } from 'react'
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
import { isoToLocalInput, localInputToIso, secondsToHms, hmsToSeconds } from './timer-modal.utils'

interface Props {
  entry: CardTimerEntry
  onUpdate: (entryId: string, fields: TimerEntryEdit) => Promise<void> | void
  onDelete: (entryId: string, cardId: string) => Promise<void> | void
}

interface EntryFormState {
  startedAt: string
  stoppedAt: string
  durationH: string
  durationM: string
  durationS: string
  note: string
}

function entryToFormState(entry: CardTimerEntry): EntryFormState {
  const { h, m, s } = secondsToHms(entry.durationSeconds)
  return {
    startedAt: isoToLocalInput(entry.startedAt),
    stoppedAt: isoToLocalInput(entry.stoppedAt),
    durationH: String(h),
    durationM: String(m),
    durationS: String(s),
    note: entry.note
  }
}

export default function EditableEntry(props: Props): JSX.Element {
  const { entry, onUpdate, onDelete } = props
  const [form, setForm] = useState<EntryFormState>(() => entryToFormState(entry))
  const [saving, setSaving] = useState(false)

  const isRunning = !form.stoppedAt

  const dirty = useMemo(() => {
    const current = entryToFormState(entry)
    return (
      current.startedAt !== form.startedAt ||
      current.stoppedAt !== form.stoppedAt ||
      current.durationH !== form.durationH ||
      current.durationM !== form.durationM ||
      current.durationS !== form.durationS ||
      current.note !== form.note
    )
  }, [entry, form])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await onUpdate(entry.id, {
        startedAt: localInputToIso(form.startedAt),
        stoppedAt: form.stoppedAt ? localInputToIso(form.stoppedAt) : null,
        durationSeconds: hmsToSeconds(
          Number(form.durationH) || 0,
          Number(form.durationM) || 0,
          Number(form.durationS) || 0
        ),
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
          Stopped
          <FieldInput
            type="datetime-local"
            value={form.stoppedAt}
            onChange={(e) => setForm({ ...form, stoppedAt: e.target.value })}
          />
        </FieldLabel>
      </EntryFields>

      <EntryFields style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <FieldLabel>
          Hours
          <FieldInput
            type="number"
            min={0}
            value={form.durationH}
            onChange={(e) => setForm({ ...form, durationH: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel>
          Minutes
          <FieldInput
            type="number"
            min={0}
            max={59}
            value={form.durationM}
            onChange={(e) => setForm({ ...form, durationM: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel>
          Seconds
          <FieldInput
            type="number"
            min={0}
            max={59}
            value={form.durationS}
            onChange={(e) => setForm({ ...form, durationS: e.target.value })}
          />
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
        <StatusBadge $running={isRunning}>{isRunning ? 'running' : 'stopped'}</StatusBadge>
        <SmallButton onClick={handleSave} disabled={!dirty || saving}>
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
