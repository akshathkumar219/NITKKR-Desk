import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import RestoreBackupModal from '../components/RestoreBackupModal'
import { Chip, Field, PageHeader, Panel, Select, StatTile } from '../ui'
import {
  KEYS,
  exportSnapshot,
  generateExportFilename,
  parseAndValidateSnapshot,
  restoreSnapshot,
  useProfile,
  useStored,
} from '../lib/storage'
import { BRANCHES, HOSTELS, YEARS } from '../data/campus'
import { coursesOf, currentSession, filterSessionsByGroup, nextSession, useBoard } from '../lib/board'
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
  { value: '8', label: 'B · 8' },
  { value: '6', label: 'C · 6' },
  { value: '4', label: 'D · 4' },
  { value: '2', label: 'E · 2' },
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
  const { profile, year, group } = useProfile()
  const { sessions } = useBoard(profile.branch, year)
  const branchKey = `${profile.branch}-${year}`
  const [allGrades, setAllGrades] = useStored(KEYS.grades, {})

  const defaultCourses = useMemo(() => {
    const effectiveSessions = filterSessionsByGroup(sessions, group)
    const rawCourses = coursesOf(effectiveSessions)
    return rawCourses.map((c, i) => {
      const isLab = c.category === 'LAB' || c.type === 'lab' || (c.name || '').toUpperCase().includes('LAB')
      return {
        id: `g_${c.key || c.name}_${i}`,
        name: c.name,
        credits: isLab ? '2' : '4',
        grade: '9',
      }
    })
  }, [sessions, group])

  const rows = useMemo(() => {
    if (allGrades && !Array.isArray(allGrades) && Array.isArray(allGrades[branchKey]) && allGrades[branchKey].length > 0) {
      return allGrades[branchKey]
    }
    if (Array.isArray(allGrades) && allGrades.length > 0) {
      return allGrades
    }
    return defaultCourses
  }, [allGrades, branchKey, defaultCourses])

  const setRows = useCallback(
    (updater) => {
      setAllGrades((prev) => {
        const curList =
          (!Array.isArray(prev) && Array.isArray(prev?.[branchKey]) && prev[branchKey].length > 0)
            ? prev[branchKey]
            : (Array.isArray(prev) && prev.length > 0)
              ? prev
              : defaultCourses
        const nextList = typeof updater === 'function' ? updater(curList) : updater
        if (Array.isArray(prev)) {
          return { [branchKey]: nextList }
        }
        return { ...prev, [branchKey]: nextList }
      })
    },
    [branchKey, defaultCourses, setAllGrades],
  )

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
  const { profile } = useProfile()
  const fileRef = useRef(null)
  const [msg, setMsg] = useState(null)
  const [pendingRestore, setPendingRestore] = useState(null)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)

  function doExport() {
    const data = exportSnapshot()
    const fileName = generateExportFilename(profile)
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ ok: true, text: `Backup exported as ${fileName}` })
  }

  async function handleFileSelect(file) {
    try {
      const text = await file.text()
      const validated = parseAndValidateSnapshot(text)
      setPendingRestore(validated)
      setRestoreModalOpen(true)
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not parse that backup file.' })
    }
  }

  async function handleConfirmRestore(snapshot) {
    try {
      restoreSnapshot(snapshot, { cleanBeforeRestore: true })
      setRestoreModalOpen(false)
      setPendingRestore(null)
      window.location.reload()
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not restore backup.' })
      setRestoreModalOpen(false)
    }
  }

  return (
    <Panel className="pad-page" id="backup">
      <p className="t-meta muted">BACKUP / RESTORE</p>
      <p className="t-section mt-1">OFFLINE JSON SNAPSHOT</p>
      <p className="t-body mt-2">
        Your entire board, subjects, roll call, grades, CGPA, to-dos and profile as one file.
        This is the only way to recover if you clear your browser data or switch devices.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary flex items-center gap-1.5 cursor-pointer" onClick={doExport}>
          <Download className="icon-micro shrink-0" strokeWidth={2.5} /> <span>EXPORT BACKUP</span>
        </button>
        <button type="button" className="btn flex items-center gap-1.5 cursor-pointer" onClick={() => fileRef.current?.click()}>
          <Upload className="icon-micro shrink-0" strokeWidth={2.5} /> <span>IMPORT BACKUP</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json,.md"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFileSelect(f)
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

      <RestoreBackupModal
        open={restoreModalOpen}
        onClose={() => {
          setRestoreModalOpen(false)
          setPendingRestore(null)
        }}
        backupData={pendingRestore}
        onConfirmRestore={handleConfirmRestore}
      />
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
