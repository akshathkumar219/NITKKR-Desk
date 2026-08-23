import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Field, Modal, Select } from '../ui'
import { ACCENTS } from '../lib/palette'

// Body text in this modal is fixed at 14px (everything except the title),
// matching SessionModal.jsx.
const TXT = { fontSize: 14 }

const COLOR_PRESETS = ACCENTS.map((a) => ({ label: a.label, value: a.value }))

const CUTOFF_OPTIONS = [
  { value: '75', label: '75% (Institute Standard)' },
  { value: '80', label: '80% (Strict Theory)' },
  { value: '85', label: '85% (Strict Lab)' },
  { value: '65', label: '65% (Lenient)' },
  { value: '0', label: '0% (Exempt / Optional)' },
]

export default function SubjectModal({ open, onClose, onSave, onDelete, course }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [instructor, setInstructor] = useState('')
  const [accent, setAccent] = useState('')
  const [targetCutoff, setTargetCutoff] = useState('75')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (course) {
      setName(course.name ?? '')
      setCode(course.code ?? '')
      const firstSession = course.sessions?.[0] || {}
      setInstructor(firstSession.instructor ?? '')
      setAccent(firstSession.accent ?? '')
      setTargetCutoff(String(firstSession.targetCutoff ?? '75'))
    }
  }, [open, course])

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a course name.')
      return
    }

    onSave({
      name: name.trim().toUpperCase(),
      code: code.trim().toUpperCase() || null,
      instructor: instructor.trim().toUpperCase() || null,
      accent: accent || null,
      targetCutoff: Number(targetCutoff),
    })
    onClose()
  }

  if (!open || !course) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`EDIT SUBJECT · ${course.code || course.name}`}
      sub="CUSTOMIZE COURSE NAME, CODE, PROFESSOR, ACCENT COLOR & ATTENDANCE CUTOFF"
      subStyle={TXT}
      showCloseButton={false}
      closeOnBackdrop={false}
      closeOnEscape={false}
      footer={
        <>
          {onDelete ? (
            <button
              type="button"
              className="btn mr-auto cursor-pointer font-black uppercase tracking-wider shadow-hard-sm"
              style={{ background: 'var(--color-coral)', color: 'var(--on-accent)', ...TXT }}
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to delete "${course.name}" and all its weekly timetable slots?`,
                  )
                ) {
                  onDelete(course.key)
                  onClose()
                }
              }}
            >
              DELETE COURSE
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
            form="subject-edit-form"
            className="btn btn-go cursor-pointer font-black uppercase tracking-wider shadow-hard-sm"
            style={TXT}
          >
            SAVE CHANGES
          </button>
        </>
      }
    >
      <form id="subject-edit-form" className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <p
            className="t-meta bg-[var(--color-absent)] text-[var(--on-accent)] font-bold p-2 rounded"
            style={TXT}
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Field label="COURSE NAME" id="subj-name" required labelStyle={TXT}>
          <input
            id="subj-name"
            className="field uppercase text-xs"
            style={TXT}
            placeholder="E.G. DATA STRUCTURES"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            required
            autoFocus
          />
        </Field>

        <div className="space-y-4">
          <Field label="COURSE CODE (OPTIONAL)" id="subj-code" labelStyle={TXT}>
            <input
              id="subj-code"
              className="field uppercase text-xs"
              style={TXT}
              placeholder="E.G. CSP-201"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </Field>

          <Field label="INSTRUCTOR / PROFESSOR (OPTIONAL)" id="subj-prof" labelStyle={TXT}>
            <input
              id="subj-prof"
              className="field uppercase text-xs"
              style={TXT}
              placeholder="E.G. DR. SHARMA"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value.toUpperCase())}
            />
          </Field>
        </div>

        <div className="space-y-4 pt-3 border-t border-[var(--border)]">
          {/* ACCENT — a single non-wrapping row of swatches; hover/aria-label
              carries the colour name instead of a text line underneath. */}
          <div className="space-y-1.5">
            <label className="t-meta text-[var(--text)] flex items-center gap-1.5" style={TXT}>
              <span>ACCENT COLOR</span>
            </label>
            <div className="flex flex-nowrap items-center gap-2 pt-0.5">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = accent === preset.value
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setAccent(preset.value)}
                    title={preset.label}
                    aria-label={preset.label}
                    aria-pressed={isSelected}
                    className={`size-9 shrink-0 rounded grid place-items-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[3px] border-[var(--text)] scale-105 shadow-hard-sm'
                        : 'border-2 border-[var(--border)] hover:scale-105'
                    }`}
                    style={{ background: preset.value }}
                  >
                    {isSelected ? (
                      <Check className="icon-sm" strokeWidth={3.5} color="var(--on-accent)" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Per-Subject Target Cutoff */}
          <Field
            label="TARGET ATTENDANCE REQUIREMENT"
            id="subj-cutoff"
            labelStyle={TXT}
            hintStyle={TXT}
            hint="Calculates Safe Skips and warnings specifically for this subject."
          >
            <Select
              id="subj-cutoff"
              value={targetCutoff}
              onChange={setTargetCutoff}
              options={CUTOFF_OPTIONS}
              style={TXT}
            />
          </Field>
        </div>
      </form>
    </Modal>
  )
}
