import { useMemo, useState } from 'react'
import { FileText, Search, X, EyeOff, Eye } from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, Panel } from '../ui'
import { PYQ_EXAMS, PYQ_PAPERS, PYQ_YEARS } from '../data/pyq'

function Viewer({ paper, onClose }) {
  if (!paper) return null
  return (
    // Opaque, not a translucent scrim. §5 rules out glass/translucent
    // surfaces, and letting the page bleed through also dropped the body copy
    // below 2:1 in light mode.
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'var(--bg)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`${paper.code} ${paper.title}`}
    >
      <div
        className="flex items-center justify-between gap-4 border-b-2 border-[var(--border)] px-4 py-3"
        style={{ background: 'var(--color-fuchsia)' }}
      >
        <div className="flex items-center gap-3">
          <button type="button" className="btn !py-1.5 cursor-pointer flex items-center gap-1.5" onClick={onClose}>
            <X className="icon-micro shrink-0" strokeWidth={2.5} /> <span>CLOSE</span>
          </button>
          <p className="t-body" style={{ color: 'var(--color-fuchsia-ink)' }}>
            {paper.code} · {paper.title}
          </p>
        </div>
        <p className="t-meta" style={{ color: 'var(--color-fuchsia-ink)' }}>
          VIEW ONLY
        </p>
      </div>

      <div className="grid flex-1 place-items-center p-6">
        {paper.url ? (
          <iframe
            title={`${paper.code} paper`}
            src={paper.url}
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="max-w-md text-center">
            <p className="t-masthead">no file attached</p>
            <p className="t-body muted mt-4 normal-case">
              This paper has no link yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/** One header dropdown, styled to match the timetable's BRANCH / YEAR / GROUP. */
function Picker({ label, value, onChange, children }) {
  return (
    <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border)] rounded px-2.5 py-1.5 shadow-2xs hover:border-[var(--border-strong)] transition-colors">
      <span className="t-micro muted mr-1.5">
        {label}
      </span>
      <select
        aria-label={label}
        className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  )
}

const SESSIONS = PYQ_YEARS.filter((y) => y.available)

export default function Pyq() {
  const [session, setSession] = useState(SESSIONS[0]?.id ?? '')
  const [exam, setExam] = useState('END')
  const [sem, setSem] = useState('ALL')
  const [query, setQuery] = useState('')
  const [hideMissing, setHideMissing] = useState(false)
  const [paper, setPaper] = useState(null)

  // Semesters present in this session, so the dropdown never offers an empty one.
  const semesters = useMemo(() => {
    const allPapers = PYQ_PAPERS[session] ?? []
    return [...new Set(allPapers.map((p) => p.sem).filter(Boolean))]
  }, [session])

  const papers = useMemo(() => {
    const allPapers = PYQ_PAPERS[session] ?? []
    const q = query.trim().toUpperCase()
    return allPapers.filter((p) => {
      // An untagged paper (blank Exam cell) shows under every exam.
      if (p.exam && p.exam !== exam) return false
      if (sem !== 'ALL' && p.sem !== sem) return false
      if (hideMissing && !p.url) return false
      if (!q) return true
      return `${p.code} ${p.title}`.toUpperCase().includes(q)
    })
  }, [session, exam, sem, hideMissing, query])

  const examLabel = PYQ_EXAMS.find((e) => e.id === exam)?.label ?? ''

  const hasAnyPapers = useMemo(() => {
    return Object.values(PYQ_PAPERS).some((list) => Array.isArray(list) && list.length > 0)
  }, [])

  if (!hasAnyPapers) {
    return (
      <Shell>
        <div className="space-y-4">
          {/* TOP COMMAND HEADER */}
          <Panel className="board board-hard bg-[var(--surface)] pad-page">
            <div className="flex items-center gap-3">
              <div
                className="icon-tile shrink-0"
                style={{
                  background: 'var(--color-fuchsia)',
                  color: 'var(--on-accent)',
                }}
                aria-hidden
              >
                <FileText className="icon-lg" strokeWidth={2.5} />
              </div>
              <h1 className="t-masthead text-[var(--text)]">
                PYQS
              </h1>
            </div>
          </Panel>

          {/* EMPTY STATE */}
          <Panel className="board board-hard bg-[var(--surface)] pad-page text-center py-12 sm:py-16">
            <p className="t-section text-[var(--text)]">NO PYQS AVAILABLE RIGHT NOW</p>
          </Panel>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="space-y-4">
        {/* TOP COMMAND HEADER */}
        <Panel className="board board-hard bg-[var(--surface)] pad-page">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="icon-tile shrink-0"
                style={{
                  background: 'var(--color-fuchsia)',
                  color: 'var(--on-accent)',
                }}
                aria-hidden
              >
                <FileText className="icon-lg" strokeWidth={2.5} />
              </div>
              <h1 className="t-masthead text-[var(--text)]">
                PYQS
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Picker label="SESSION" value={session} onChange={setSession}>
                {SESSIONS.map((y) => (
                  <option key={y.id} value={y.id} className="bg-[var(--surface)] text-[var(--text)]">
                    {y.label}
                  </option>
                ))}
              </Picker>

              <Picker label="EXAM" value={exam} onChange={setExam}>
                {PYQ_EXAMS.map((e) => (
                  <option key={e.id} value={e.id} className="bg-[var(--surface)] text-[var(--text)]">
                    {e.label}
                  </option>
                ))}
              </Picker>

              <Picker label="SEMESTER" value={sem} onChange={setSem}>
                <option value="ALL" className="bg-[var(--surface)] text-[var(--text)]">
                  ALL
                </option>
                {semesters.map((s) => (
                  <option key={s} value={s} className="bg-[var(--surface)] text-[var(--text)]">
                    {s}
                  </option>
                ))}
              </Picker>
            </div>
          </div>
        </Panel>

        {/* SEARCH & FILTER CONTROLS BAR */}
        <Panel className="board board-hard bg-[var(--surface)] pad-tight shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search
                className="icon-micro shrink-0 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50"
                strokeWidth={2}
                aria-hidden
              />
              <input
                className="field !pl-9 uppercase !py-2 text-xs sm:text-sm font-bold"
                placeholder="SEARCH PAPER / CODE..."
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                aria-label="Search papers"
              />
            </div>

            <button
              type="button"
              onClick={() => setHideMissing(!hideMissing)}
              title={hideMissing ? 'Showing only papers with a file' : 'Showing every paper'}
              className={`btn !py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                hideMissing
                  ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
              }`}
            >
              {hideMissing ? <EyeOff className="icon-micro shrink-0" /> : <Eye className="icon-micro shrink-0" />}
              <span className="t-micro">{hideMissing ? 'WITH FILES' : 'ALL PAPERS'}</span>
            </button>
          </div>
        </Panel>

        {/* PAPER GRID */}
        {papers.length === 0 ? (
          <Panel className="board board-hard bg-[var(--surface)] pad-page text-center">
            <p className="t-section text-[var(--text)]">NO PYQS AVAILABLE RIGHT NOW</p>
            <p className="t-body muted mt-2 normal-case">
              Nothing filed under {session} · {examLabel}
              {sem === 'ALL' ? '' : ` · ${sem}`}
              {hideMissing ? ' with a file attached' : ''}.
            </p>
          </Panel>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {papers.map((p) => (
              <button
                key={`${p.code}-${p.sem}`}
                type="button"
                onClick={() => setPaper(p)}
                className="board board-hard bg-[var(--surface)] pad-card text-left transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip tone="var(--color-fuchsia)">{p.code}</Chip>
                  {p.exam ? (
                    <Chip style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                      {PYQ_EXAMS.find((e) => e.id === p.exam)?.label ?? p.exam}
                    </Chip>
                  ) : null}
                </div>
                <p className="t-card-title mt-3">{p.title}</p>
                <p className="t-meta muted mt-1.5">
                  {session} · {p.sem}
                </p>
                <p className="t-micro mt-4 flex items-center justify-between">
                  <span>VIEW PAPER →</span>
                  {!p.url ? <span className="muted">NO FILE</span> : null}
                </p>
              </button>
            ))}
          </div>
        )}

        <p className="t-meta muted">
          * PAPERS OPEN IN A VIEW-ONLY VIEWER. ONLY HOST SCANS YOU HAVE PERMISSION
          TO SHARE.
        </p>
      </div>

      <Viewer paper={paper} onClose={() => setPaper(null)} />
    </Shell>
  )
}
