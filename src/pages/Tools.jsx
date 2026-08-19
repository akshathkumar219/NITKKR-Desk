import { useMemo, useRef, useState } from 'react'
import {
  Bus,
  Briefcase,
  Calculator,
  Download,
  HardDriveDownload,
  Link as LinkIcon,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  Wrench,
} from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, Field, PageHeader, Panel, Select, StatTile } from '../ui'
import { KEYS, exportSnapshot, importSnapshot, useProfile, useStored } from '../lib/storage'
import { BRANCHES, HOSTELS, YEARS } from '../data/campus'
import { currentSession, nextSession, useBoard } from '../lib/board'
import { currentMeal, menuFor } from '../data/mess'
import { dayCode, fmtRange, minutesNow } from '../lib/time'
import {
  PLACEMENT_CHECKLIST,
  TRANSPORT,
  USEFUL_LINKS,
} from '../data/info'

const SECTIONS = [
  { id: 'skip', label: 'SKIP GUARD', icon: ShieldCheck, accent: 'var(--color-acid)' },
  { id: 'cgpa', label: 'CGPA', icon: Calculator, accent: 'var(--color-sky)' },
  { id: 'transport', label: 'TRANSPORT', icon: Bus, accent: 'var(--color-teal)' },
  { id: 'links', label: 'LINKS', icon: LinkIcon, accent: 'var(--surface)' },
  { id: 'placements', label: 'PLACEMENTS', icon: Briefcase, accent: 'var(--color-coral)' },
  { id: 'backup', label: 'BACKUP', icon: HardDriveDownload, accent: 'var(--color-amber)' },
]

// 10-point scale. Adjust to whatever NITKKR actually uses.
const GRADE_POINTS = [
  { value: '10', label: 'A+ · 10' },
  { value: '9', label: 'A · 9' },
  { value: '8', label: 'B+ · 8' },
  { value: '7', label: 'B · 7' },
  { value: '6', label: 'C+ · 6' },
  { value: '5', label: 'C · 5' },
  { value: '4', label: 'D · 4' },
  { value: '0', label: 'F · 0' },
]

/* ------------------------------------------------------------ Skip guard -- */

function SkipGuard() {
  const { profile, year } = useProfile()
  const { sessions } = useBoard(profile.branch, year)
  const day = dayCode()
  const mins = minutesNow()

  const live = currentSession(sessions, day, mins)
  const next = nextSession(sessions, day, mins)
  const meal = currentMeal(mins)
  const menu = menuFor(profile.hostel, day)
  const mealItems = (menu[meal.key] ?? []).slice(0, 2).join(', ')

  return (
    <Panel className="p-4 sm:p-5" id="skip">
      <p className="label muted">SKIP GUARD</p>
      <p className="heading mt-2 text-2xl">
        {live ? 'YOU ARE IN CLASS' : next ? 'ONE MORE TO GO' : 'BOARD IS CLEAR'}
      </p>
      <p className="mt-2 text-sm font-semibold">
        {live
          ? `${live.name} · ${live.room || 'room TBA'} · ends ${fmtRange(live.start, live.end).split('–')[1]}`
          : next
            ? `${next.name} · ${next.room || 'room TBA'} · ${fmtRange(next.start, next.end)}`
            : 'Nothing else scheduled today.'}
      </p>
      <p className="label muted mt-3">
        MESS · {meal.label}: {mealItems || 'SEE MESS BOARD'}
      </p>
      <p className="label muted mt-3">
        SKIP GUARD ONLY READS YOUR BOARD. FOR SAFE-TO-SKIP COUNTS, SEE ROLL CALL.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ CGPA -- */

function Cgpa() {
  const [rows, setRows] = useStored(KEYS.grades, [])

  const { credits, points, sgpa } = useMemo(() => {
    let c = 0
    let p = 0
    for (const r of rows) {
      const cr = Number(r.credits)
      const gp = Number(r.grade)
      if (!Number.isFinite(cr) || cr <= 0) continue
      c += cr
      p += cr * (Number.isFinite(gp) ? gp : 0)
    }
    return { credits: c, points: p, sgpa: c === 0 ? 0 : p / c }
  }, [rows])

  const add = () =>
    setRows((r) => [...r, { id: `g${Date.now()}${r.length}`, name: '', credits: '3', grade: '9' }])
  const patch = (id, next) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...next } : row)))
  const drop = (id) => setRows((r) => r.filter((row) => row.id !== id))

  return (
    <Panel className="p-4 sm:p-5" id="cgpa">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label muted">SGPA · LIVE ESTIMATE</p>
          <p className="heading mt-1 text-5xl">{sgpa.toFixed(2)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="CREDITS" value={credits} accent="var(--color-sky)" />
          <StatTile label="POINTS" value={points.toFixed(0)} accent="var(--color-violet)" />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="label muted mt-4">NO COURSES YET — ADD YOUR FIRST ROW TO START.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_72px_112px_auto] items-center gap-2">
              <input
                className="field"
                placeholder="COURSE"
                value={r.name}
                onChange={(e) => patch(r.id, { name: e.target.value })}
                aria-label="Course name"
              />
              <input
                className="field"
                type="number"
                min={0}
                max={12}
                value={r.credits}
                onChange={(e) => patch(r.id, { credits: e.target.value })}
                aria-label="Credits"
              />
              <Select
                options={GRADE_POINTS}
                value={String(r.grade)}
                onChange={(v) => patch(r.id, { grade: v })}
                aria-label="Grade"
              />
              <button
                type="button"
                className="btn !px-2"
                onClick={() => drop(r.id)}
                aria-label="Remove row"
              >
                <Trash2 size={14} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn btn-go mt-4" onClick={add}>
        <Plus size={14} strokeWidth={3} /> ADD COURSE
      </button>
      <p className="label muted mt-3">
        ASSUMES A 10-POINT SCALE. CHANGE GRADE_POINTS IN SRC/PAGES/TOOLS.JSX IF YOURS DIFFERS.
      </p>
    </Panel>
  )
}

/* ---------------------------------------------------------------- Backup -- */

function Backup() {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState(null)

  function doExport() {
    const blob = new Blob([JSON.stringify(exportSnapshot(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nitkkr-board-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ ok: true, text: 'Backup downloaded.' })
  }

  async function doImport(file) {
    try {
      const text = await file.text()
      const n = importSnapshot(JSON.parse(text))
      setMsg({ ok: true, text: `Restored ${n} section${n === 1 ? '' : 's'}.` })
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not read that file.' })
    }
  }

  return (
    <Panel className="p-4 sm:p-5" id="backup">
      <p className="label muted">BACKUP / RESTORE</p>
      <p className="heading mt-1 text-xl">OFFLINE JSON SNAPSHOT</p>
      <p className="mt-2 text-sm font-medium">
        Your board, roll call, grades and profile as one file. This is the only way to
        recover if you clear your browser data — do it every few weeks.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={doExport}>
          <Download size={14} strokeWidth={2.5} /> EXPORT JSON
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          <Upload size={14} strokeWidth={2.5} /> IMPORT JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doImport(f)
            e.target.value = ''
          }}
        />
      </div>

      {msg ? (
        <p
          className="label mt-3 border-2 p-2"
          style={{ borderColor: msg.ok ? 'var(--color-present)' : 'var(--color-absent)' }}
          role="status"
        >
          {msg.text}
        </p>
      ) : null}
    </Panel>
  )
}

/* ------------------------------------------------------------------ Page -- */

export default function Tools() {
  const { profile, year, setBranch, setYear, update } = useProfile()

  return (
    <Shell>
      <PageHeader
        icon={Wrench}
        accent="var(--color-violet)"
        eyebrow="TOOLKIT"
        title="STUDENT TOOLS"
        sub="SKIP GUARD · CGPA · TRANSPORT · LINKS · PLACEMENTS · BACKUP"
      />

      <Panel className="p-3">
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="btn"
              style={{ background: s.accent, color: 'var(--color-ink)' }}
            >
              <s.icon size={14} strokeWidth={2.5} /> {s.label}
            </a>
          ))}
        </div>
      </Panel>

      <Panel className="grid gap-3 p-4 sm:grid-cols-3">
        <Field label="BRANCH" id="t-branch">
          <Select
            id="t-branch"
            options={BRANCHES.map((b) => ({ value: b.code, label: b.name }))}
            value={profile.branch}
            onChange={(v) => setBranch(v)}
          />
        </Field>
        <Field label="YEAR" id="t-year">
          <Select
            id="t-year"
            options={YEARS.map((y) => ({ value: y, label: `Year ${y}` }))}
            value={year}
            onChange={setYear}
          />
        </Field>
        <Field label="HOSTEL" id="t-hostel">
          <Select
            id="t-hostel"
            options={HOSTELS.map((h) => ({ value: h.code, label: h.name }))}
            value={profile.hostel}
            onChange={(v) => update({ hostel: v, hostelPicked: true })}
          />
        </Field>
      </Panel>

      <SkipGuard />
      <Cgpa />

      {/* ---- Transport ---- */}
      <Panel className="p-4 sm:p-5" id="transport">
        <p className="label muted">KURUKSHETRA TRANSPORT</p>
        <p className="heading mt-1 text-xl">OPEN DIRECTIONS IN MAPS</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TRANSPORT.map((t) => (
            <a
              key={t.name}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              {t.name}
            </a>
          ))}
        </div>
      </Panel>

      {/* ---- Links ---- */}
      <Panel className="p-4 sm:p-5" id="links">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="label muted">USEFUL LINKS</p>
            <p className="heading mt-1 text-xl">PORTALS & STUDY TOOLS</p>
          </div>
          <Chip>{USEFUL_LINKS.length} LINKS</Chip>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {USEFUL_LINKS.map((l) => (
            <a
              key={l.title}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="board p-3 transition-transform hover:-translate-y-0.5"
            >
              <Chip tone="var(--color-amber)">{l.tag}</Chip>
              <p className="heading mt-2 text-base">{l.title}</p>
              <p className="label muted mt-1 normal-case">{l.description}</p>
            </a>
          ))}
        </div>
      </Panel>

      {/* ---- Placements ---- */}
      <Panel className="p-4 sm:p-5" id="placements">
        <p className="label muted">PLACEMENT CHECKLIST</p>
        <p className="heading mt-1 text-xl">DRIVE PREP ESSENTIALS</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLACEMENT_CHECKLIST.map((item, i) => (
            <li key={item.title} className="board p-3">
              <span className="label muted">{String(i + 1).padStart(2, '0')}</span>
              <p className="heading mt-1 text-base">{item.title}</p>
              <p className="mt-1 text-sm font-medium">{item.body}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Backup />
    </Shell>
  )
}
