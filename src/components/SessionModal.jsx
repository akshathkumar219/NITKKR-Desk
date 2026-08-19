import { useEffect, useState } from 'react'
import { Field, Modal, Select } from '../ui'
import { DAYS, fmtRange, parseTime } from '../lib/time'
import { SESSION_TYPES } from '../data/campus'

const blank = {
  day: 'MON',
  startText: '9:00 am',
  endText: '10:00 am',
  name: '',
  code: '',
  room: '',
  group: '',
  type: 'lecture',
}

function toText(mins) {
  if (mins == null) return ''
  const h24 = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = h24 < 12 ? 'am' : 'pm'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`
}

export default function SessionModal({ open, onClose, onSave, onDelete, session, defaultDay }) {
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (session) {
      setForm({
        day: session.day,
        startText: toText(session.start),
        endText: toText(session.end),
        name: session.name ?? '',
        code: session.code ?? '',
        room: session.room ?? '',
        group: session.group ?? '',
        type: session.type ?? 'lecture',
      })
    } else {
      setForm({ ...blank, day: defaultDay ?? 'MON' })
    }
  }, [open, session, defaultDay])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const start = parseTime(form.startText)
  const end = parseTime(form.endText)
  const preview = start !== null && end !== null && end > start ? fmtRange(start, end) : null

  function submit(e) {
    e.preventDefault()
    if (start === null || end === null) {
      setError('Could not read those times. Try "9:00 am" or "14:30".')
      return
    }
    if (end <= start) {
      setError('End time must be after the start time.')
      return
    }
    if (form.type !== 'break' && !form.name.trim()) {
      setError('Give the session a name.')
      return
    }
    onSave({
      day: form.day,
      start,
      end,
      name: form.name.trim() || 'Break',
      code: form.code.trim(),
      room: form.room.trim(),
      group: form.group.trim(),
      type: form.type,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={session ? 'EDIT SESSION' : 'ADD SESSION'}
      sub="CHANGES APPLY TO BOTH DAY AND WEEK VIEWS"
      footer={
        <>
          {session && onDelete ? (
            <button
              type="button"
              className="btn mr-auto"
              style={{ background: 'var(--color-coral)', color: '#12121A' }}
              onClick={() => {
                onDelete(session.id)
                onClose()
              }}
            >
              DELETE
            </button>
          ) : null}
          <button type="button" className="btn" onClick={onClose}>
            CANCEL
          </button>
          <button type="submit" form="session-form" className="btn btn-go">
            SAVE
          </button>
        </>
      }
    >
      <form id="session-form" className="space-y-4" onSubmit={submit}>
        <Field label="DAY" id="s-day">
          <Select id="s-day" options={DAYS} value={form.day} onChange={(v) => set({ day: v })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="START" id="s-start">
            <input
              id="s-start"
              className="field"
              value={form.startText}
              onChange={(e) => set({ startText: e.target.value })}
              placeholder="9:00 am"
            />
          </Field>
          <Field label="END" id="s-end">
            <input
              id="s-end"
              className="field"
              value={form.endText}
              onChange={(e) => set({ endText: e.target.value })}
              placeholder="10:00 am"
            />
          </Field>
        </div>

        {preview ? <p className="label muted">READS AS · {preview}</p> : null}

        <Field label="COURSE NAME" id="s-name">
          <input
            id="s-name"
            className="field"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="COURSE CODE" id="s-code">
            <input
              id="s-code"
              className="field"
              value={form.code}
              onChange={(e) => set({ code: e.target.value })}
              placeholder="CSPC-201"
            />
          </Field>
          <Field label="ROOM" id="s-room">
            <input
              id="s-room"
              className="field"
              value={form.room}
              onChange={(e) => set({ room: e.target.value })}
              placeholder="LT-3"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="GROUP / BATCH" id="s-group">
            <input
              id="s-group"
              className="field"
              value={form.group}
              onChange={(e) => set({ group: e.target.value })}
              placeholder="A1"
            />
          </Field>
          <Field label="TYPE" id="s-type">
            <Select
              id="s-type"
              options={SESSION_TYPES}
              value={form.type}
              onChange={(v) => set({ type: v })}
            />
          </Field>
        </div>

        {error ? (
          <p
            className="label border-2 p-2"
            style={{ borderColor: 'var(--color-absent)', color: 'var(--color-absent)' }}
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
