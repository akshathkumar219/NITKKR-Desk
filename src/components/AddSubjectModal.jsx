import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Field, Modal, Select } from '../ui'
import { ACCENTS } from '../lib/palette'

// Body text in this modal is fixed at 14px (everything except the title),
// matching SessionModal.jsx / SubjectModal.jsx.
const TXT = { fontSize: 14 }

const COLOR_PRESETS = ACCENTS.map((a) => ({ label: a.label, value: a.value, bg: a.value, text: 'var(--on-accent)' }))

const CATEGORY_OPTIONS = [
  { value: 'CORE CS', label: 'CORE CS (Data Structures, OS, DAA, OOP...)' },
  { value: 'MATHS', label: 'MATHEMATICS / STATS' },
  { value: 'LAB', label: 'LABORATORY / PRACTICAL' },
  { value: 'THEORY', label: 'THEORY / LECTURE' },
  { value: 'ELECTIVE', label: 'DEPARTMENT / OPEN ELECTIVE' },
  { value: 'TUTORIAL', label: 'TUTORIAL SESSION' },
  { value: 'OTHER', label: 'OTHER COURSE' },
]

const CREDIT_OPTIONS = [
  { value: '4', label: '4.0 CREDITS (Standard Theory)' },
  { value: '3', label: '3.0 CREDITS (Core / Elective)' },
  { value: '2', label: '2.0 CREDITS (Lab / Practical)' },
  { value: '1.5', label: '1.5 CREDITS (Seminar / Mini-project)' },
  { value: '5', label: '5.0 CREDITS (Comprehensive Course)' },
]

const CUTOFF_OPTIONS = [
  { value: '65', label: '65% (Institute Standard)' },
  { value: '75', label: '75% (Strict Theory)' },
  { value: '80', label: '80% (Strict Lab)' },
  { value: '85', label: '85% (Very Strict)' },
  { value: '0', label: '0% (Exempt / Optional)' },
]

export default function AddSubjectModal({ open, onClose, onAdd }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('CORE CS')
  const [credits, setCredits] = useState('4')
  const [instructor, setInstructor] = useState('')
  const [room, setRoom] = useState('')
  const [accent, setAccent] = useState('var(--color-sky)')
  const [targetCutoff, setTargetCutoff] = useState('65')
  const [error, setError] = useState('')

  function handleCategoryChange(val) {
    setCategory(val)
    if (val === 'LAB') {
      setCredits('2')
      setAccent('var(--color-coral)')
    } else if (val === 'MATHS') {
      setCredits('4')
      setAccent('var(--color-acid)')
    } else if (val === 'CORE CS' || val === 'THEORY') {
      setCredits('4')
      setAccent('var(--color-sky)')
    } else if (val === 'TUTORIAL') {
      setAccent('var(--color-teal)')
    } else if (val === 'ELECTIVE') {
      setCredits('3')
    }
  }


  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim().toUpperCase()
    if (!trimmed) {
      setError('Please provide a course name.')
      return
    }

    onAdd({
      name: trimmed,
      code: code.trim().toUpperCase() || `SUBJ-${Math.floor(100 + Math.random() * 900)}`,
      category,
      credits: Number(credits) || 4,
      instructor: instructor.trim().toUpperCase() || null,
      room: room.trim().toUpperCase() || 'TBD',
      accent: accent || 'var(--color-sky)',
      targetCutoff: Number(targetCutoff) || 65,
    })

    setName('')
    setCode('')
    setInstructor('')
    setRoom('')
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ADD CUSTOM SUBJECT"
      sub="ENROLL A NEW COURSE, ELECTIVE, OR LAB WORKSPACE"
      subStyle={TXT}
      showCloseButton={false}
      closeOnBackdrop={false}
      closeOnEscape={false}
      footer={
        <>
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
            form="add-subject-form"
            className="btn btn-go cursor-pointer font-black uppercase tracking-wider shadow-hard-sm"
            style={TXT}
          >
            <Plus className="icon-micro" strokeWidth={3} />
            <span>CREATE COURSE</span>
          </button>
        </>
      }
    >
      <form id="add-subject-form" className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <p
            className="t-meta bg-[var(--color-absent)] text-[var(--on-accent)] font-bold p-2 rounded"
            style={TXT}
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Field label="COURSE / SUBJECT NAME" id="new-subj-name" required labelStyle={TXT}>
          <input
            id="new-subj-name"
            className="field uppercase text-xs"
            style={TXT}
            placeholder="E.G. CLOUD COMPUTING & DISTRIBUTED SYSTEMS"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="COURSE CODE (OPTIONAL)" id="new-subj-code" labelStyle={TXT}>
            <input
              id="new-subj-code"
              className="field uppercase text-xs font-mono"
              style={TXT}
              placeholder="E.G. CSPC-311"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </Field>

          <Field label="COURSE CATEGORY" id="new-subj-category" labelStyle={TXT}>
            <Select
              id="new-subj-category"
              value={category}
              onChange={handleCategoryChange}
              options={CATEGORY_OPTIONS}
              style={TXT}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="CREDITS (Ci)" id="new-subj-credits" labelStyle={TXT}>
            <Select
              id="new-subj-credits"
              value={credits}
              onChange={setCredits}
              options={CREDIT_OPTIONS}
              style={TXT}
            />
          </Field>

          <Field label="ASSIGNED ROOM / LAB" id="new-subj-room" labelStyle={TXT}>
            <input
              id="new-subj-room"
              className="field uppercase text-xs"
              style={TXT}
              placeholder="E.G. LT-3 / CL-2"
              value={room}
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
            />
          </Field>
        </div>

        <Field label="PROFESSOR / INSTRUCTOR (OPTIONAL)" id="new-subj-prof" labelStyle={TXT}>
          <input
            id="new-subj-prof"
            className="field uppercase text-xs"
            style={TXT}
            placeholder="E.G. DR. VIKRAM SINGH"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value.toUpperCase())}
          />
        </Field>

        {/* Accent Color identity */}
        <div className="space-y-1.5">
          <label className="t-meta text-[var(--text)] flex items-center gap-1.5" style={TXT}>
            <span>ACCENT COLOR IDENTITY</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-0.5">
            {COLOR_PRESETS.map((preset) => {
              const isSelected = accent === preset.value
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setAccent(preset.value)}
                  className={`flex items-center justify-center p-2 rounded border-2 t-micro font-black transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--text)] ring-2 ring-[var(--text)]/30 scale-105'
                      : 'border-[var(--border)] hover:border-[var(--text)]'
                  }`}
                  style={{ background: preset.bg, color: preset.text, ...TXT }}
                >
                  <span className="truncate">{preset.label.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        </div>

        <Field
          label="TARGET ATTENDANCE REQUIREMENT"
          id="new-subj-cutoff"
          labelStyle={TXT}
          hintStyle={TXT}
          hint="Calculates Safe Skips and warnings specifically for this subject."
        >
          <Select
            id="new-subj-cutoff"
            value={targetCutoff}
            onChange={setTargetCutoff}
            options={CUTOFF_OPTIONS}
            style={TXT}
          />
        </Field>
      </form>
    </Modal>
  )
}
