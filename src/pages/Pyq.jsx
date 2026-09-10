import { useMemo, useState } from 'react'
import { FileText, Search, X, EyeOff, Eye, RotateCcw, Check } from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, Panel } from '../ui'
import {
  PYQ_EXAMS,
  PYQ_YEARS,
  ALL_PAPERS,
  paperMatchesBranch,
  semestersForYear,
} from '../data/pyq'
import { useProfile } from '../lib/storage'
import { SORTED_BRANCHES, YEARS, DEFAULT_BRANCH, DEFAULT_YEAR } from '../data/campus'

function Viewer({ paper, onClose }) {
  if (!paper) return null
  return (
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
          <button
            type="button"
            className="btn !py-1.5 cursor-pointer flex items-center gap-1.5"
            onClick={onClose}
          >
            <X className="icon-micro shrink-0" strokeWidth={2.5} /> <span>CLOSE</span>
          </button>
          <p className="t-body font-bold" style={{ color: 'var(--color-fuchsia-ink)' }}>
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

export default function Pyq() {
  const { profile } = useProfile()

  // Default to student's saved profile branch and year
  const profileBranch = profile?.branch || DEFAULT_BRANCH || 'CSE'
  const profileYear = String(
    profile?.yearByBranch?.[profileBranch] || profile?.bioYear || DEFAULT_YEAR || '2',
  )

  const [branch, setBranch] = useState(profileBranch)
  const [year, setYear] = useState(profileYear)
  const [sem, setSem] = useState('ALL')
  const [exam, setExam] = useState('ALL')
  const [session, setSession] = useState('ALL')
  const [query, setQuery] = useState('')
  const [hideMissing, setHideMissing] = useState(false)
  const [paper, setPaper] = useState(null)

  // Dynamically compute available semesters for current year selection
  const availableSemesters = useMemo(() => {
    if (year === 'ALL') {
      return ['1', '2', '3', '4', '5']
    }
    return semestersForYear(year)
  }, [year])

  const handleYearChange = (newYear) => {
    setYear(newYear)
    if (newYear !== 'ALL') {
      const validSems = semestersForYear(newYear)
      if (sem !== 'ALL' && !validSems.includes(sem)) {
        setSem('ALL')
      }
    }
  }

  const handleResetToProfile = () => {
    setBranch(profileBranch)
    setYear(profileYear)
    setSem('ALL')
    setExam('ALL')
    setSession('ALL')
    setQuery('')
  }

  // Base papers matching academic filters (Branch, Year, Sem, Session)
  const baseAcademicPapers = useMemo(() => {
    return ALL_PAPERS.filter((p) => {
      if (session !== 'ALL' && p.session !== session) return false
      if (year !== 'ALL') {
        const validSems = semestersForYear(year)
        if (!validSems.includes(String(p.sem))) return false
      }
      if (sem !== 'ALL' && String(p.sem) !== String(sem)) return false
      if (branch !== 'ALL' && !paperMatchesBranch(p, branch)) return false
      return true
    })
  }, [session, year, sem, branch])

  // Compute paper counts for each exam sitting under current academic scope
  const examCounts = useMemo(() => {
    const counts = { ALL: baseAcademicPapers.length, MID1: 0, MID2: 0, END: 0 }
    for (const p of baseAcademicPapers) {
      if (p.exam && counts[p.exam] !== undefined) {
        counts[p.exam]++
      }
    }
    return counts
  }, [baseAcademicPapers])

  // Final filtered papers including Exam, Missing file toggle, and Search Query
  const papers = useMemo(() => {
    const q = query.trim().toUpperCase()
    return baseAcademicPapers.filter((p) => {
      if (exam !== 'ALL' && p.exam !== exam) return false
      if (hideMissing && !p.url) return false
      if (!q) return true
      return `${p.code} ${p.title} ${p.branch || ''}`.toUpperCase().includes(q)
    })
  }, [baseAcademicPapers, exam, hideMissing, query])

  const isProfileFiltered = branch === profileBranch && year === profileYear

  return (
    <Shell>
      <div className="space-y-4">
        {/* TOP COMMAND HEADER — Identical padding, alignment & structure to Timetable */}
        <Panel className="board board-hard bg-[var(--surface)] pad-page">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5">
            {/* Title & Icon — identical layout to Timetable */}
            <div className="flex items-center gap-3">
              <span
                className="icon-tile"
                style={{ background: 'var(--color-fuchsia)' }}
                aria-hidden
              >
                <FileText className="icon-lg" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <h1 className="t-masthead">
                  PYQS
                </h1>
              </div>
            </div>

            {/* Dropdown Selectors: BRANCH, YEAR, SEM — compact and styled identically to Timetable */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2">
              {/* Branch Selector */}
              <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border-strong)] rounded px-2 sm:px-2.5 py-1 sm:py-1.5 shadow-hard-sm transition-colors">
                <span className="t-meta muted mr-1 sm:mr-1.5">BRANCH</span>
                <select
                  aria-label="Branch"
                  className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  <option value="ALL" className="bg-[var(--surface)] text-[var(--text)]">
                    ALL
                  </option>
                  {SORTED_BRANCHES.map((b) => (
                    <option key={b.code} value={b.code} className="bg-[var(--surface)] text-[var(--text)]">
                      {b.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border-strong)] rounded px-2 sm:px-2.5 py-1 sm:py-1.5 shadow-hard-sm transition-colors">
                <span className="t-meta muted mr-1 sm:mr-1.5">YEAR</span>
                <select
                  aria-label="Year"
                  className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
                  value={year}
                  onChange={(e) => handleYearChange(e.target.value)}
                >
                  <option value="ALL" className="bg-[var(--surface)] text-[var(--text)]">
                    ALL
                  </option>
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-[var(--surface)] text-[var(--text)]">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester Selector */}
              <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border-strong)] rounded px-2 sm:px-2.5 py-1 sm:py-1.5 shadow-hard-sm transition-colors">
                <span className="t-meta muted mr-1 sm:mr-1.5">SEM</span>
                <select
                  aria-label="Semester"
                  className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
                  value={sem}
                  onChange={(e) => setSem(e.target.value)}
                >
                  <option value="ALL" className="bg-[var(--surface)] text-[var(--text)]">
                    ALL
                  </option>
                  {availableSemesters.map((s) => (
                    <option key={s} value={s} className="bg-[var(--surface)] text-[var(--text)]">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {!isProfileFiltered && (
                <button
                  type="button"
                  onClick={handleResetToProfile}
                  title={`Reset filter to your profile (${profileBranch} Year ${profileYear})`}
                  className="btn !py-1 sm:!py-1.5 !px-2 sm:!px-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-[var(--surface-2)] border-2 border-[var(--border-strong)] shadow-hard-sm hover:bg-[var(--surface-3)] cursor-pointer"
                >
                  <RotateCcw className="icon-micro shrink-0" />
                  <span className="hidden sm:inline">RESET</span>
                </button>
              )}
            </div>
          </div>

          {/* Controls Sub-Bar: Exam Switcher (Left) & Session Selector (Right) */}
          <div className="pt-3.5 border-t-2 border-[var(--border)] flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              {PYQ_EXAMS.map((e) => {
                const isActive = exam === e.id
                const count = examCounts[e.id] ?? 0
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setExam(e.id)}
                    className={`btn !px-1.5 sm:!px-3 !py-1 sm:!py-1.5 text-[11px] sm:text-xs md:text-sm font-bold uppercase flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-all ${
                      isActive
                        ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                        : 'bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                    }`}
                  >
                    <span>
                      {e.id === 'ALL' ? (
                        <>
                          <span className="hidden sm:inline">ALL EXAMS</span>
                          <span className="sm:hidden">ALL</span>
                        </>
                      ) : e.id === 'END' ? (
                        <>
                          <span className="hidden sm:inline">END SEM</span>
                          <span className="sm:hidden">END</span>
                        </>
                      ) : (
                        e.label
                      )}
                    </span>
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                        isActive
                          ? 'bg-[var(--bg)] text-[var(--text)]'
                          : 'bg-[var(--surface)] text-[var(--muted)]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Session Selector */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border-strong)] rounded px-2 sm:px-2.5 py-1 sm:py-1.5 shadow-hard-sm transition-colors">
                <span className="t-meta muted mr-1 sm:mr-1.5">SESSION</span>
                <select
                  aria-label="Session"
                  className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                >
                  <option value="ALL" className="bg-[var(--surface)] text-[var(--text)]">
                    ALL
                  </option>
                  {PYQ_YEARS.map((y) => (
                    <option key={y.id} value={y.id} className="bg-[var(--surface)] text-[var(--text)]">
                      {y.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Panel>

        {/* SEARCH & ACTION CONTROLS BAR — Identical pad-card & styling to Timetable */}
        <Panel className="board board-hard bg-[var(--surface)] pad-card shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search
                className="icon-sm pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50 text-[var(--text)]"
                strokeWidth={2}
                aria-hidden
              />
              <input
                className="field !pl-9 uppercase !py-2 text-xs sm:text-sm font-bold"
                placeholder="SEARCH PAPER / COURSE CODE..."
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                aria-label="Search papers"
              />
            </div>

            <button
              type="button"
              onClick={() => setHideMissing(!hideMissing)}
              title={hideMissing ? 'Showing only papers with a file' : 'Showing every paper'}
              className={`btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                hideMissing
                  ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
              }`}
            >
              {hideMissing ? <EyeOff className="icon-micro shrink-0" /> : <Eye className="icon-micro shrink-0" />}
              <span className="t-meta">{hideMissing ? 'WITH FILES' : 'ALL PAPERS'}</span>
            </button>
          </div>
        </Panel>

        {/* PAPER GRID */}
        {papers.length === 0 ? (
          <Panel className="board board-hard bg-[var(--surface)] pad-page text-center py-12">
            <p className="t-section text-[var(--text)]">NO PYQS MATCHING THIS FILTER</p>
            <p className="t-body muted mt-2 normal-case">
              Try switching Branch ({branch}), Year ({year}), Exam ({exam}), or clearing your search.
            </p>
            <button
              type="button"
              onClick={() => {
                setBranch('ALL')
                setYear('ALL')
                setSem('ALL')
                setExam('ALL')
                setSession('ALL')
                setQuery('')
              }}
              className="btn !py-2 !px-4 mt-4 font-bold text-xs uppercase cursor-pointer"
            >
              RESET ALL FILTERS
            </button>
          </Panel>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {papers.map((p, i) => {
              const examDef = PYQ_EXAMS.find((e) => e.id === p.exam)
              return (
                <button
                  key={`${p.code}-${p.sem}-${p.exam}-${p.url || i}`}
                  type="button"
                  onClick={() => setPaper(p)}
                  className="board board-hard bg-[var(--surface)] pad-card text-left transition-transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip tone="var(--color-fuchsia)">{p.code}</Chip>
                      {p.exam ? (
                        <Chip
                          style={{
                            background: examDef?.color || 'var(--surface-2)',
                            color: '#12121A',
                            fontWeight: 700,
                          }}
                        >
                          {examDef?.badge || p.exam}
                        </Chip>
                      ) : null}
                      {p.branch && p.branch !== 'ALL' && (
                        <Chip style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                          {p.branch}
                        </Chip>
                      )}
                    </div>
                    <p className="t-card-title mt-3 font-bold text-[var(--text)]">{p.title}</p>
                    <p className="t-meta muted mt-1.5">
                      {p.session} · SEMESTER {p.sem}
                    </p>
                  </div>

                  <p className="t-micro mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="font-bold text-[var(--color-fuchsia)]">VIEW PAPER →</span>
                    {!p.url ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
                        NO FILE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[var(--color-present)]/15 text-[var(--present-ink)] border border-[var(--color-present)]/40 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" /> PDF READY
                      </span>
                    )}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        <p className="t-meta muted">
          * PAPERS OPEN IN AN IN-APP VIEWER. PREVIEWS SOURCED FROM ARCHIVED NIT KURUKSHETRA EXAMS.
        </p>
      </div>

      <Viewer paper={paper} onClose={() => setPaper(null)} />
    </Shell>
  )
}
