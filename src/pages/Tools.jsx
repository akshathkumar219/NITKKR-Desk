import { useEffect, useMemo, useRef, useState } from 'react'
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
  { id: 'links', label: 'LINKS', icon: LinkIcon, accent: 'var(--surface)', neutral: true },
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

  // "Now" was computed once per render with no ticker, so this panel kept
  // naming a class that had already ended until some unrelated state change
  // forced a re-render. Landing ticks at 30s and Rooms at 60s — match them.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const day = dayCode(now)
  const mins = minutesNow(now)

  const live = currentSession(sessions, day, mins)
  const next = nextSession(sessions, day, mins)
  const meal = currentMeal(mins)
  const menu = menuFor(profile.hostel, day)
  const mealItems = (menu[meal.key]?.items ?? []).slice(0, 2).join(', ')

  return (
    <Panel className="pad-page" id="skip">
      <p className="t-meta muted">SKIP GUARD</p>
      <p className="t-section mt-2">
        {live ? 'YOU ARE IN CLASS' : next ? 'ONE MORE TO GO' : 'BOARD IS CLEAR'}
      </p>
      <p className="t-body mt-2">
        {live
          ? `${live.name} · ${live.room || 'room TBA'} · ends ${fmtRange(live.start, live.end).split('–')[1]}`
          : next
            ? `${next.name} · ${next.room || 'room TBA'} · ${fmtRange(next.start, next.end)}`
            : 'Nothing else scheduled today.'}
      </p>
      <p className="t-meta muted mt-3">
        MESS · {meal.label}: {mealItems || 'SEE MESS BOARD'}
      </p>
      <p className="t-meta muted mt-3">
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
    <Panel className="pad-page" id="cgpa">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-meta muted">SGPA · LIVE ESTIMATE</p>
          <p className="t-stat mt-1">{sgpa.toFixed(2)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="CREDITS" value={credits} accent="var(--color-sky)" />
          <StatTile label="POINTS" value={points.toFixed(0)} accent="var(--color-violet)" />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="t-meta muted mt-4">NO COURSES YET — ADD YOUR FIRST ROW TO START.</p>
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
                <Trash2 className="icon-micro shrink-0" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn btn-go mt-4 flex items-center gap-1.5" onClick={add}>
        <Plus className="icon-micro shrink-0" strokeWidth={3} /> <span>ADD COURSE</span>
      </button>
      <p className="t-meta muted mt-3">
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
    <Panel className="pad-page" id="backup">
      <p className="t-meta muted">BACKUP / RESTORE</p>
      <p className="t-section mt-1">OFFLINE JSON SNAPSHOT</p>
      <p className="t-body mt-2">
        Your board, roll call, grades and profile as one file. This is the only way to
        recover if you clear your browser data — do it every few weeks.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary flex items-center gap-1.5" onClick={doExport}>
          <Download className="icon-micro shrink-0" strokeWidth={2.5} /> <span>EXPORT JSON</span>
        </button>
        <button type="button" className="btn flex items-center gap-1.5" onClick={() => fileRef.current?.click()}>
          <Upload className="icon-micro shrink-0" strokeWidth={2.5} /> <span>IMPORT JSON</span>
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
          className="t-body font-bold mt-3 border-2 p-2"
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

      <Panel className="pad-tight">
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="btn flex items-center gap-1.5"
              style={{ background: s.accent, color: s.neutral ? 'var(--text)' : 'var(--color-ink)' }}
            >
              <s.icon className="icon-micro shrink-0" strokeWidth={2.5} /> <span className="t-micro">{s.label}</span>
            </a>
          ))}
        </div>
      </Panel>

      <Panel className="grid gap-3 pad-page sm:grid-cols-3">
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
      <Panel className="pad-page" id="transport">
        <p className="t-meta muted">KURUKSHETRA TRANSPORT</p>
        <p className="t-section mt-1">OPEN DIRECTIONS IN MAPS</p>
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
      <Panel className="pad-page" id="links">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="t-meta muted">USEFUL LINKS</p>
            <p className="t-section mt-1">PORTALS & STUDY TOOLS</p>
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
              className="board pad-card transition-transform hover:-translate-y-0.5"
            >
              <Chip tone="var(--color-amber)">{l.tag}</Chip>
              <p className="t-card-title mt-2">{l.title}</p>
              <p className="t-body muted mt-1 normal-case">{l.description}</p>
            </a>
          ))}
        </div>
      </Panel>

      {/* ---- Placements ---- */}
      <Panel className="pad-page" id="placements">
        <p className="t-meta muted">PLACEMENT CHECKLIST</p>
        <p className="t-section mt-1">DRIVE PREP ESSENTIALS</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLACEMENT_CHECKLIST.map((item, i) => (
            <li key={item.title} className="board pad-card">
              <span className="t-meta muted">{String(i + 1).padStart(2, '0')}</span>
              <p className="t-card-title mt-1">{item.title}</p>
              <p className="t-body mt-1">{item.body}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Backup />
    </Shell>
  )
}
