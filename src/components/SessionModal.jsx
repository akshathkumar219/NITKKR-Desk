import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Field, Modal, Select } from '../ui'
import { DAYS, fmtRange, parseTime } from '../lib/time'
import { SESSION_TYPES } from '../data/campus'
import { ACCENTS } from '../lib/palette'

// Body text in this modal is fixed at 14px (everything except the title).
const TXT = { fontSize: 14 }

const COLOR_PRESETS = ACCENTS.map((a) => ({ label: a.label, value: a.value, bg: a.value, text: a.ink }))

const CUTOFF_OPTIONS = [
  { value: '75', label: '75% (Institute Standard)' },
  { value: '80', label: '80% (Strict Theory)' },
  { value: '85', label: '85% (Strict Lab)' },
  { value: '65', label: '65% (Lenient)' },
  { value: '0', label: '0% (Exempt / Optional)' },
]

const blank = {
  day: 'MON',
  startText: '9:00 am',
  endText: '10:00 am',
  name: '',
  code: '',
  room: '',
  group: '',
  type: 'lecture',
  accent: '',
  instructor: '',
  note: '',
  targetCutoff: '75',
}

function toText(mins) {
  if (mins == null) return ''
  const h24 = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = h24 < 12 ? 'am' : 'pm'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`
}

export default function SessionModal({ open, onClose, onSave, onDelete, session, defaultDay, prefill }) {
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
        accent: session.accent ?? '',
        instructor: session.instructor ?? '',
        note: session.note ?? '',
        targetCutoff: String(session.targetCutoff ?? '75'),
      })
    } else {
      setForm({
        ...blank,
        day: defaultDay ?? 'MON',
        ...(prefill || {}),
      })
    }
  }, [open, session, defaultDay, prefill])

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
      accent: form.accent || '',
      instructor: form.instructor.trim(),
      note: form.note.trim(),
      targetCutoff: form.targetCutoff ? Number(form.targetCutoff) : 75,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={session ? 'EDIT SESSION' : 'ADD SESSION'}
      sub="CUSTOMIZE CLASS DETAILS, ACCENT COLOR & ATTENDANCE CUTOFF"
      subStyle={TXT}
      showCloseButton={false}
      closeOnBackdrop={false}
      closeOnEscape={false}
      footer={
        <>
          {session && onDelete ? (
            <button
              type="button"
              className="btn mr-auto cursor-pointer font-black uppercase tracking-wider shadow-hard-sm"
              style={{ background: 'var(--color-coral)', color: 'var(--on-accent)', ...TXT }}
              onClick={() => {
                onDelete(session.id)
                onClose()
              }}
            >
              DELETE
            </button>
          ) : null}
          <button
            type="button"
            className="btn cursor-pointer font-bold uppercase tracking-wider"
            style={TXT}
            onClick={onClose}
          >
            CANCEL
          </button>
          <button
            type="submit"
            form="session-form"
            className="btn btn-go cursor-pointer font-black uppercase tracking-wider shadow-hard-sm"
            style={TXT}
          >
            SAVE SESSION
          </button>
        </>
      }
    >
      <form id="session-form" className="space-y-3 max-h-[65vh] overflow-y-auto pr-1 no-scrollbar" onSubmit={submit}>
        <Field label="DAY" id="s-day" labelStyle={TXT}>
          <Select id="s-day" options={DAYS} value={form.day} onChange={(v) => set({ day: v })} style={TXT} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="START" id="s-start" labelStyle={TXT}>
            <input
              id="s-start"
              className="field !py-2 text-xs"
              style={TXT}
              value={form.startText}
              onChange={(e) => set({ startText: e.target.value })}
              placeholder="9:00 am"
            />
          </Field>
          <Field label="END" id="s-end" labelStyle={TXT}>
            <input
              id="s-end"
              className="field !py-2 text-xs"
              style={TXT}
              value={form.endText}
              onChange={(e) => set({ endText: e.target.value })}
              placeholder="10:00 am"
            />
          </Field>
        </div>

        {preview ? (
          <p className="t-micro muted" style={TXT}>
            READS AS · {preview}
          </p>
        ) : null}

        <Field label="COURSE NAME" id="s-name" labelStyle={TXT}>
          <input
            id="s-name"
            className="field uppercase !py-2 text-xs"
            style={TXT}
            value={form.name}
            onChange={(e) => set({ name: e.target.value.toUpperCase() })}
            placeholder="DATA STRUCTURES"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="COURSE CODE" id="s-code" labelStyle={TXT}>
            <input
              id="s-code"
              className="field uppercase !py-2 text-xs"
              style={TXT}
              value={form.code}
              onChange={(e) => set({ code: e.target.value.toUpperCase() })}
              placeholder="CSPC-201"
            />
          </Field>
          <Field label="ROOM" id="s-room" labelStyle={TXT}>
            <input
              id="s-room"
              className="field uppercase !py-2 text-xs"
              style={TXT}
              value={form.room}
              onChange={(e) => set({ room: e.target.value.toUpperCase() })}
              placeholder="LT-3"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="GROUP / BATCH" id="s-group" labelStyle={TXT}>
            <input
              id="s-group"
              className="field uppercase !py-2 text-xs"
              style={TXT}
              value={form.group}
              onChange={(e) => set({ group: e.target.value.toUpperCase() })}
              placeholder="G1"
            />
          </Field>
          <Field label="SESSION TYPE" id="s-type" labelStyle={TXT}>
            <Select
              id="s-type"
              options={SESSION_TYPES}
              value={form.type}
              onChange={(v) => set({ type: v })}
              style={TXT}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="INSTRUCTOR / PROFESSOR" id="s-instructor" labelStyle={TXT}>
            <input
              id="s-instructor"
              className="field uppercase !py-2 text-xs"
              style={TXT}
              value={form.instructor}
              onChange={(e) => set({ instructor: e.target.value.toUpperCase() })}
              placeholder="DR. SHARMA (OPTIONAL)"
            />
          </Field>
          <Field label="TARGET CUTOFF" id="s-cutoff" labelStyle={TXT}>
            <Select
              id="s-cutoff"
              options={CUTOFF_OPTIONS}
              value={form.targetCutoff}
              onChange={(v) => set({ targetCutoff: v })}
              style={TXT}
            />
          </Field>
        </div>

        <Field label="NOTE / REMINDER" id="s-note" labelStyle={TXT}>
          <input
            id="s-note"
            className="field uppercase !py-2 text-xs"
            style={TXT}
            value={form.note}
            onChange={(e) => set({ note: e.target.value.toUpperCase() })}
            placeholder="E.G. BRING LAB MANUAL / ASSIGNMENT DUE"
          />
        </Field>

        {/* ACCENT COLOR PALETTE SWATCH SELECTOR */}
        <div className="pt-1">
          <label className="t-meta muted flex items-center gap-1.5 mb-2" style={TXT}>
            CLASS ACCENT COLOR
          </label>
          <div className="w-fit inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded bg-[var(--surface-2)] border-2 border-[var(--border)]">
            {COLOR_PRESETS.map((c) => {
              const active = form.accent === c.value
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => set({ accent: c.value })}
                  className={`grid size-7.5 place-items-center rounded border-2 cursor-pointer transition-all hover:scale-110 ${
                    active ? 'border-white ring-2 ring-black dark:ring-white scale-105' : 'border-black/30'
                  }`}
                  style={{ background: c.bg }}
                  title={c.label}
                  aria-label={c.label}
                >
                  {active ? (
                    <Check className="icon-micro shrink-0" strokeWidth={2.5} style={{ color: c.text }} />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {error ? (
          <p
            className="t-body font-bold border-2 p-2"
            style={{ borderColor: 'var(--absent-ink)', color: 'var(--absent-ink)', ...TXT }}
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
