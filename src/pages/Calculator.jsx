import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Calculator,
  Plus,
  Trash2,
  TrendingUp,
  Target,
  GraduationCap,
  RotateCcw,
  BookOpen,
  Award,
  FileCheck2,
  Layers,
  Percent,
  CheckCircle2,
} from 'lucide-react'
import Shell from '../components/Shell'
import { KEYS, useProfile, useStored } from '../lib/storage'
import { coursesOf, filterSessionsByGroup, useBoard } from '../lib/board'
import {
  getSemesterCourses,
  getTotalSemesterCredits,
  getDefaultSemesterForYear,
} from '../data/curriculum'

// NIT Kurukshetra standard grading scale from CGPA.md
const GRADE_POINTS = [
  { grade: 'A+', desc: 'Outstanding / Excellent', points: 10, tone: 'var(--color-acid)' },
  { grade: 'A', desc: 'Very Good', points: 9, tone: 'var(--color-acid)' },
  { grade: 'B', desc: 'Good', points: 8, tone: 'var(--color-sky)' },
  { grade: 'C', desc: 'Average / Fair', points: 6, tone: 'var(--color-amber)' },
  { grade: 'D', desc: 'Pass / Marginal (Minimum)', points: 4, tone: 'var(--color-teal)' },
  { grade: 'E', desc: 'Required to Improve', points: 2, tone: 'var(--color-coral)' },
  { grade: 'F', desc: 'Fail / Repeat Course', points: 0, tone: 'var(--disruption)' },
]

const DEFAULT_SEMESTERS = [
  { sem: 1, label: 'Semester 1', credits: '20', sgpa: '', active: false },
  { sem: 2, label: 'Semester 2', credits: '20', sgpa: '', active: false },
  { sem: 3, label: 'Semester 3', credits: '20', sgpa: '', active: false },
  { sem: 4, label: 'Semester 4', credits: '20', sgpa: '', active: false },
  { sem: 5, label: 'Semester 5', credits: '20', sgpa: '', active: false },
  { sem: 6, label: 'Semester 6', credits: '20', sgpa: '', active: false },
  { sem: 7, label: 'Semester 7', credits: '20', sgpa: '', active: false },
  { sem: 8, label: 'Semester 8', credits: '20', sgpa: '', active: false },
]

export default function CalculatorPage() {
  const { profile, year, group } = useProfile()
  const defaultSem = getDefaultSemesterForYear(year)
  const [activeSemester, setActiveSemester] = useState(defaultSem)

  useEffect(() => {
    setActiveSemester(getDefaultSemesterForYear(year))
  }, [year])

  const { sessions } = useBoard(profile.branch, year)
  const branchKey = `${profile.branch}-${year}`
  const semStorageKey = `${profile.branch}-sem-${activeSemester}`

  const [activeTab, setActiveTab] = useState('SGPA') // 'SGPA' | 'CGPA' | 'FORECAST' | 'RULES'

  // SGPA Course Rows stored in localStorage (supports per branch-semester, branch-year, and legacy array)
  const [allGrades, setAllGrades] = useStored(KEYS.grades, {})

  // Compute default courses for active branch and semester from official curriculum
  const defaultCoursesForBranch = useMemo(() => {
    const semCourses = getSemesterCourses(profile.branch, activeSemester)
    if (semCourses.length > 0) {
      return semCourses
        .filter((c) => {
          const raw = String(c.credits || '').replace(/[^0-9.]/g, '')
          return raw !== '' && parseFloat(raw) > 0 && c.category !== 'NC'
        })
        .map((c, i) => {
          const raw = String(c.credits || '4').replace(/[^0-9.]/g, '')
          return {
            id: `c_${c.code || c.title}_${i}`,
            code: c.code || 'THEORY',
            name: c.title || c.name,
            credits: raw || '4',
            grade: 'A',
            category: c.category || 'PC',
          }
        })
    }

    const effectiveSessions = filterSessionsByGroup(sessions, group)
    const rawCourses = coursesOf(effectiveSessions)
    return rawCourses.map((c, i) => {
      const isLab = c.category === 'LAB' || c.type === 'lab' || (c.name || '').toUpperCase().includes('LAB')
      return {
        id: `c_${c.key || c.name}_${i}`,
        code: c.code || (isLab ? 'LAB' : 'THEORY'),
        name: c.name,
        credits: isLab ? '2' : '4',
        grade: 'A',
      }
    })
  }, [profile.branch, activeSemester, sessions, group])

  // Active courses for current branch & semester
  const courses = useMemo(() => {
    if (allGrades && !Array.isArray(allGrades)) {
      if (Array.isArray(allGrades[semStorageKey]) && allGrades[semStorageKey].length > 0) {
        return allGrades[semStorageKey]
      }
      if (Array.isArray(allGrades[branchKey]) && allGrades[branchKey].length > 0) {
        return allGrades[branchKey]
      }
    }
    // Backward compatibility if grades was stored as a flat array
    if (Array.isArray(allGrades) && allGrades.length > 0) {
      return allGrades
    }
    return defaultCoursesForBranch
  }, [allGrades, semStorageKey, branchKey, defaultCoursesForBranch])

  const setCourses = useCallback(
    (updater) => {
      setAllGrades((prev) => {
        const curList =
          (!Array.isArray(prev) && Array.isArray(prev?.[semStorageKey]) && prev[semStorageKey].length > 0)
            ? prev[semStorageKey]
            : (!Array.isArray(prev) && Array.isArray(prev?.[branchKey]) && prev[branchKey].length > 0)
              ? prev[branchKey]
              : (Array.isArray(prev) && prev.length > 0)
                ? prev
                : defaultCoursesForBranch
        const nextList = typeof updater === 'function' ? updater(curList) : updater
        if (Array.isArray(prev)) {
          return { [semStorageKey]: nextList }
        }
        return { ...prev, [semStorageKey]: nextList }
      })
    },
    [semStorageKey, branchKey, defaultCoursesForBranch, setAllGrades],
  )

  // Multi-semester cumulative CGPA records stored in localStorage
  const [semesters, setSemesters] = useStored(KEYS.cgpaSemesters, DEFAULT_SEMESTERS)

  // Auto-apply official scheme credits if current records still have generic 20 credits
  useEffect(() => {
    if (semesters && semesters.every((s) => s.credits === '20')) {
      const hasOfficial = [1, 2, 3, 4, 5, 6, 7, 8].some(
        (s) => getTotalSemesterCredits(profile.branch, s) !== 20,
      )
      if (hasOfficial) {
        setSemesters((prev) =>
          (prev || DEFAULT_SEMESTERS).map((s) => ({
            ...s,
            credits: String(getTotalSemesterCredits(profile.branch, s.sem) || 20),
          })),
        )
      }
    }
  }, [profile.branch, semesters, setSemesters])

  const applyOfficialCredits = () => {
    setSemesters((prev) =>
      (prev || DEFAULT_SEMESTERS).map((s) => ({
        ...s,
        credits: String(getTotalSemesterCredits(profile.branch, s.sem) || 20),
      })),
    )
  }

  // CGPA Forecaster state
  const [currentCgpaInput, setCurrentCgpaInput] = useState('')
  const [completedSemsInput, setCompletedSemsInput] = useState('')
  const [targetCgpaInput, setTargetCgpaInput] = useState('')
  const [totalDegreeSems, setTotalDegreeSems] = useState('8')

  // Load official curriculum courses
  const syncFromCurriculum = () => {
    setCourses(defaultCoursesForBranch)
  }

  // Auto-fill SGPA courses from current active timetable
  const importFromTimetable = () => {
    const effectiveSessions = filterSessionsByGroup(sessions, group)
    const rawCourses = coursesOf(effectiveSessions)
    const list = rawCourses.map((c, i) => {
      const isLab = c.category === 'LAB' || c.type === 'lab' || (c.name || '').toUpperCase().includes('LAB')
      return {
        id: `c_${c.key || c.name}_${i}`,
        code: c.code || (isLab ? 'LAB' : 'THEORY'),
        name: c.name,
        credits: isLab ? '2' : '4',
        grade: 'A',
      }
    })
    setCourses(list.length > 0 ? list : defaultCoursesForBranch)
  }

  const addCourse = () => {
    setCourses((prev) => [
      ...prev,
      { id: `c_${Date.now()}_${prev.length}`, code: 'SUBJ', name: '', credits: '3', grade: 'A' },
    ])
  }

  const updateCourse = (id, patch) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const deleteCourse = (id) => {
    setCourses((prev) => prev.filter((c) => c.id !== id))
  }

  const resetCourses = () => {
    setCourses(defaultCoursesForBranch)
  }

  // Calculate SGPA (Formula: sum(Ci * Gi) / sum(Ci))
  const { totalCredits, totalQualityPoints, sgpa, sgpaPercentage } = useMemo(() => {
    let credits = 0
    let points = 0
    courses.forEach((c) => {
      const cr = parseFloat(c.credits) || 0
      const gradeObj = GRADE_POINTS.find((g) => g.grade === c.grade) || GRADE_POINTS[1]
      const gp = gradeObj.points
      if (cr > 0) {
        credits += cr
        points += cr * gp
      }
    })
    const calc = credits > 0 ? points / credits : 0
    // NIT Kurukshetra official rule: Equivalent % = SGPA * 9.00
    const pct = calc * 9.0
    return {
      totalCredits: credits,
      totalQualityPoints: points,
      sgpa: calc,
      sgpaPercentage: pct,
    }
  }, [courses])

  // Calculate Cumulative CGPA across Semesters (Formula: sum(Tk * SGPAk) / sum(Tk))
  const { cumulativeCredits, cumulativePoints, cumulativeCgpa, cgpaPercentage, completedSemCount } = useMemo(() => {
    let creds = 0
    let pts = 0
    let count = 0

    semesters.forEach((s) => {
      const cr = parseFloat(s.credits) || 0
      const semSgpa = parseFloat(s.sgpa)
      if (s.active && cr > 0 && !isNaN(semSgpa) && semSgpa >= 0) {
        creds += cr
        pts += cr * semSgpa
        count += 1
      }
    })

    const cgpa = creds > 0 ? pts / creds : 0
    const pct = cgpa * 9.0 // Official NITKKR multiplier

    return {
      cumulativeCredits: creds,
      cumulativePoints: pts,
      cumulativeCgpa: cgpa,
      cgpaPercentage: pct,
      completedSemCount: count,
    }
  }, [semesters])

  const updateSemester = (semNum, patch) => {
    setSemesters((prev) => prev.map((s) => (s.sem === semNum ? { ...s, ...patch } : s)))
  }

  // Calculate Target Forecast (Credit-Weighted)
  const forecast = useMemo(() => {
    const cur = parseFloat(currentCgpaInput) || 0
    const done = parseInt(completedSemsInput, 10) || 0
    const target = parseFloat(targetCgpaInput) || 0
    const total = parseInt(totalDegreeSems, 10) || 8
    const remaining = Math.max(0, total - done)

    if (remaining === 0 || done === 0) {
      return { requiredSgpa: 0, status: 'N/A', remaining: 0, possible: true, maxPossible: 0 }
    }

    // Formula: (Target * Total - Cur * Done) / Remaining
    const required = (target * total - cur * done) / remaining
    const maxPossible = (cur * done + 10.0 * remaining) / total
    const possible = required <= 10.0 && required >= 0

    let status = 'ACHIEVABLE'
    const tone = 'var(--color-coral)'

    if (required > 10.0) {
      status = 'MATHEMATICALLY IMPOSSIBLE'
    } else if (required > 9.0) {
      status = 'OUTSTANDING / DISTINCTION REQUIRED'
    } else if (required > 8.0) {
      status = 'MODERATE EFFORT'
    } else {
      status = 'EASILY ATTAINABLE'
    }

    return {
      requiredSgpa: Math.max(0, required),
      status,
      tone,
      remaining,
      possible,
      maxPossible,
    }
  }, [currentCgpaInput, completedSemsInput, targetCgpaInput, totalDegreeSems])

  return (
    <Shell>
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* TOP CONTROL HEADER */}
        <header className="board board-hard bg-[var(--surface)] pad-page flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="icon-tile shrink-0"
              style={{
                background: 'var(--color-coral)',
                color: 'var(--on-accent)',
              }}
              aria-hidden
            >
              <Calculator className="icon-lg" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="t-masthead">
                CGPA CALCULATOR
              </h1>
            </div>
          </div>

          {/* TAB SWITCHERS */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'SGPA', label: 'SEMESTER SGPA', icon: BookOpen },
              { id: 'CGPA', label: 'CUMULATIVE CGPA', icon: Layers },
              { id: 'FORECAST', label: 'TARGET SIMULATOR', icon: Target },
              { id: 'RULES', label: 'ORDINANCES & %', icon: FileCheck2 },
            ].map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn !py-1.5 !px-3 !text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'ring-2 ring-black dark:ring-white scale-105 shadow-hard-sm'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={
                    active
                      ? { background: 'var(--text)', color: 'var(--bg)' }
                      : undefined
                  }
                >
                  <tab.icon className="icon-micro shrink-0" strokeWidth={2.5} />
                  <span className="t-micro">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </header>

        {/* ========================================================= */}
        {/* TAB 1: SEMESTER SGPA CALCULATOR */}
        {/* ========================================================= */}
        {activeTab === 'SGPA' && (
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* HERO STATS GAUGES */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3">
              <div className="board board-hard pad-card bg-[var(--surface)] border-l-4 border-l-[var(--color-coral)] flex flex-col justify-between">
                <span className="t-micro muted flex items-center gap-1.5">
                  <Award className="icon-micro text-[var(--color-coral)] shrink-0" /> SEMESTER SGPA
                </span>
                <p className="t-stat mt-1 text-[var(--color-coral)]">
                  {sgpa.toFixed(2)}
                </p>
                <p className="t-micro muted mt-0.5">EXACT: {sgpa.toFixed(4)}</p>
              </div>

              <div className="board board-hard pad-card bg-[var(--surface)] border-l-4 border-l-[var(--color-coral)] flex flex-col justify-between">
                <span className="t-micro muted flex items-center gap-1.5">
                  <Percent className="icon-micro text-[var(--color-coral)] shrink-0" /> EQUIVALENT MARKS
                </span>
                <p className="t-stat mt-1 text-[var(--color-coral)]">
                  {sgpaPercentage.toFixed(2)}%
                </p>
                <p className="t-micro muted mt-0.5 font-mono">
                  FORMULA: SGPA × 9.00
                </p>
              </div>

              <div className="board board-hard pad-card bg-[var(--surface)] border-l-4 border-l-[var(--color-coral)] flex flex-col justify-between">
                <span className="t-micro muted flex items-center gap-1.5">
                  <Layers className="icon-micro text-[var(--color-coral)] shrink-0" /> TOTAL CREDITS (Σ Ci)
                </span>
                <p className="t-stat mt-1 text-[var(--color-coral)]">
                  {totalCredits}
                </p>
                <p className="t-micro muted mt-0.5">{courses.length} REGISTERED COURSES</p>
              </div>

              <div className="board board-hard pad-card bg-[var(--surface)] border-l-4 border-l-[var(--color-coral)] flex flex-col justify-between">
                <span className="t-micro muted flex items-center gap-1.5">
                  <TrendingUp className="icon-micro text-[var(--color-coral)] shrink-0" /> QUALITY POINTS (Σ Ci×Gi)
                </span>
                <p className="t-stat mt-1 text-[var(--color-coral)]">
                  {totalQualityPoints.toFixed(1)}
                </p>
                <p className="t-micro muted mt-0.5">CREDIT-WEIGHTED SUM</p>
              </div>
            </div>

            {/* SEMESTER PICKER TABS */}
            <div className="board board-hard bg-[var(--surface)] pad-tight flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                  const isCurrentYear = s === Number(year) * 2 - 1 || s === Number(year) * 2
                  const isActive = activeSemester === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setActiveSemester(s)}
                      className={`btn !py-1 !px-2.5 sm:!px-3 text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                        isActive
                          ? '!bg-[var(--color-coral)] !text-[var(--on-accent)] shadow-hard-sm'
                          : isCurrentYear
                            ? '!bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]'
                            : 'opacity-60 hover:opacity-100 bg-[var(--surface)] text-[var(--muted)]'
                      }`}
                    >
                      <span>SEM {s}</span>
                    </button>
                  )
                })}
              </div>
              <div className="text-[11px] font-mono font-bold text-[var(--muted)] uppercase">
                {profile.branch} · SEMESTER {activeSemester} · {courses.length} COURSES
              </div>
            </div>

            {/* INTERACTIVE COURSE MATRIX */}
            <div className="board board-hard bg-[var(--surface)] pad-page flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div>
                  <h2 className="t-section">REGISTERED SEMESTER COURSES</h2>
                  <p className="t-meta muted mt-0.5">
                    INPUT COURSE CREDITS AND LETTER GRADES (A+, A, B, C, D, E, F)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={syncFromCurriculum}
                    className="btn btn-go text-xs font-bold !py-1.5 !px-3 shadow-hard-sm cursor-pointer flex items-center gap-1.5"
                    title="Load official branch curriculum courses and credits"
                  >
                    <BookOpen className="icon-micro shrink-0" strokeWidth={2.5} /> <span>LOAD CURRICULUM</span>
                  </button>
                  <button
                    type="button"
                    onClick={importFromTimetable}
                    className="btn text-xs font-bold !py-1.5 !px-3 shadow-hard-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="icon-micro shrink-0" strokeWidth={2.5} /> <span>SYNC TIMETABLE</span>
                  </button>
                  <button
                    type="button"
                    onClick={addCourse}
                    className="btn text-xs font-bold !py-1.5 !px-3 shadow-hard-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="icon-micro shrink-0" strokeWidth={2.5} /> <span>ADD ROW</span>
                  </button>
                  {courses.length > 0 && (
                    <button
                      type="button"
                      onClick={resetCourses}
                      className="btn !py-1.5 !px-2.5 text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="icon-micro shrink-0" strokeWidth={2.5} /> <span>CLEAR</span>
                    </button>
                  )}
                </div>
              </div>

              {/* TABLE HEADER */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[620px]">
                  <thead>
                    <tr className="border-b-2 border-[var(--border)] t-meta text-[var(--color-coral)]">
                      <th className="py-2 px-2 w-28 whitespace-nowrap">CODE</th>
                      <th className="py-2 px-2 min-w-[140px]">COURSE NAME</th>
                      <th className="py-2 px-2 w-32 text-center whitespace-nowrap">CREDITS (Ci)</th>
                      <th className="py-2 px-2 w-36 text-center whitespace-nowrap">GRADE (Gi)</th>
                      <th className="py-2 px-2 w-36 text-center whitespace-nowrap">POINTS (Ci×Gi)</th>
                      <th className="py-2 px-2 w-14 text-center whitespace-nowrap">DROP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-sm font-bold">
                    {courses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center t-meta muted">
                          NO COURSES ADDED YET. CLICK <strong>&quot;ADD COURSE ROW&quot;</strong> OR <strong>&quot;SYNC TIMETABLE&quot;</strong> TO BEGIN.
                        </td>
                      </tr>
                    ) : (
                      courses.map((c) => {
                        const gradeObj = GRADE_POINTS.find((g) => g.grade === c.grade) || GRADE_POINTS[1]
                        const cr = parseFloat(c.credits) || 0
                        const qPoints = cr * gradeObj.points

                        return (
                          <tr key={c.id} className="hover:bg-[var(--surface-muted)] transition-colors">
                            <td className="py-2 px-2">
                              <input
                                className="field !py-1 !px-2 text-xs font-mono font-bold uppercase w-full"
                                placeholder="CODE"
                                value={c.code || ''}
                                onChange={(e) => updateCourse(c.id, { code: e.target.value.toUpperCase() })}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                className="field !py-1 !px-2 text-xs font-bold uppercase w-full"
                                placeholder="COURSE NAME"
                                value={c.name}
                                onChange={(e) => updateCourse(c.id, { name: e.target.value.toUpperCase() })}
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min={1}
                                max={12}
                                step={0.5}
                                className="field !py-1 !px-2 text-xs font-bold text-center w-full"
                                value={c.credits}
                                onChange={(e) => updateCourse(c.id, { credits: e.target.value })}
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <select
                                className="field !py-1 !px-2 text-xs font-bold cursor-pointer w-full"
                                value={c.grade}
                                onChange={(e) => updateCourse(c.id, { grade: e.target.value })}
                              >
                                {GRADE_POINTS.map((g) => (
                                  <option key={g.grade} value={g.grade}>
                                    {g.grade} ({g.points} pts)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-2 text-center font-mono font-black text-sm whitespace-nowrap" style={{ color: gradeObj.tone }}>
                              {qPoints.toFixed(1)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => deleteCourse(c.id)}
                                className="grid size-7 place-items-center rounded-sm border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors mx-auto"
                                title="Delete Course"
                              >
                                <Trash2 className="icon-micro shrink-0" strokeWidth={2.5} />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CUMULATIVE CGPA CALCULATOR (ALL SEMESTERS) */}
        {/* ========================================================= */}
        {activeTab === 'CGPA' && (
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* HERO CGPA GAUGE */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3">
              <div className="board board-hard pad-card bg-[var(--surface)] border-l-4 border-l-[var(--color-coral)] flex flex-col justify-between">
                <span className="t-micro muted flex items-center gap-1.5">
                  <GraduationCap className="icon-micro text-[var(--color-coral)] shrink-0" /> CUMULATIVE CGPA
                </span>
                <p className="t-stat mt-1 text-[var(--color-coral)]">
                  {cumulativeCgpa.toFixed(2)}
                </p>
                <p className="t-micro muted mt-0.5">EXACT: {cumulativeCgpa.toFixed(4)}</p>
              </div>

              <div className="board board-hard pad-card bg-[var(--surface)] border-l-4 border-l-[var(--color-coral)] flex flex-col justify-between">
                <span className="t-micro muted flex items-center gap-1.5">
                  <Percent className="icon-micro text-[var(--color-coral)] shrink-0" /> EQUIVALENT MARKS
                </span>
                <p className="t-stat mt-1 text-[var(--color-coral)]">
                  {cgpaPercentage.toFixed(2)}%
                </p>
                <p className="t-micro muted mt-0.5 font-mono">FORMULA: CGPA × 9.00</p>
              </div>

              <div className="board board-hard pad-card bg-[var(--surface)] border-l-4 border-l-[var(--color-coral)] flex flex-col justify-between">
                <span className="t-micro muted flex items-center gap-1.5">
                  <Layers className="icon-micro text-[var(--color-coral)] shrink-0" /> COMPLETED SEMESTERS
                </span>
                <p className="t-stat mt-1 text-[var(--color-coral)]">
                  {completedSemCount} / 8
                </p>
                <p className="t-micro muted mt-0.5">{cumulativeCredits} CREDITS · {cumulativePoints.toFixed(1)} PTS</p>
              </div>

              <div className="board board-hard pad-card bg-[var(--surface)] border-l-4 border-l-[var(--color-coral)] flex flex-col justify-between">
                <span className="t-micro muted flex items-center gap-1.5">
                  <CheckCircle2 className="icon-micro text-[var(--color-coral)] shrink-0" /> DEGREE STATUS
                </span>
                <p className="t-stat mt-1 text-[var(--color-coral)]">
                  {cumulativeCgpa >= 5.0 ? 'ON TRACK' : 'NEEDS IMPROVEMENT'}
                </p>
                <p className="t-micro muted mt-0.5">MINIMUM 5.00 FOR DEGREE</p>
              </div>
            </div>

            {/* SEMESTER-WISE BREAKDOWN MATRIX */}
            <div className="board board-hard bg-[var(--surface)] pad-page flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div>
                  <h2 className="t-section">SEMESTER-WISE PERFORMANCE LOG</h2>
                  <p className="t-meta muted mt-0.5">
                    FORMULA: CGPA = Σ(SGPAk × Tk) / ΣTk · TOGGLE ACTIVE SEMESTERS
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={applyOfficialCredits}
                    className="btn btn-go text-xs font-bold !py-1.5 !px-3 shadow-hard-sm cursor-pointer flex items-center gap-1.5"
                    title="Pre-populate all 8 semesters with official branch scheme credits"
                  >
                    <BookOpen className="icon-micro shrink-0" strokeWidth={2.5} />
                    <span>APPLY OFFICIAL SCHEME CREDITS ({profile.branch})</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {semesters.map((s) => {
                  const numSgpa = parseFloat(s.sgpa) || 0
                  const numCreds = parseFloat(s.credits) || 0
                  const weighted = numSgpa * numCreds

                  return (
                    <div
                      key={s.sem}
                      className={`board board-hard pad-tight flex flex-col justify-between gap-3 transition-all ${
                        s.active
                          ? 'border-2 border-black dark:border-white shadow-hard-sm bg-[var(--surface)]'
                          : 'opacity-50 bg-[var(--surface-muted)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="t-card-title">{s.label}</span>
                        <label className="flex items-center gap-1.5 t-micro cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s.active}
                            onChange={(e) => updateSemester(s.sem, { active: e.target.checked })}
                            className="size-3.5 accent-[var(--color-coral)]"
                          />
                          <span>ACTIVE</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="t-micro muted block">SGPA</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            placeholder="0.00"
                            disabled={!s.active}
                            value={s.sgpa}
                            onChange={(e) => updateSemester(s.sem, { sgpa: e.target.value })}
                            className="field !py-1 !px-1.5 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="t-micro muted block">CREDITS (Tk)</label>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            max="35"
                            placeholder="20"
                            disabled={!s.active}
                            value={s.credits}
                            onChange={(e) => updateSemester(s.sem, { credits: e.target.value })}
                            className="field !py-1 !px-1.5 text-xs font-bold"
                          />
                        </div>
                      </div>

                      {s.active && numSgpa > 0 && (
                        <div className="flex items-center justify-between border-t border-[var(--border)] pt-1.5 font-mono">
                          <span className="t-micro muted">POINTS: {weighted.toFixed(1)}</span>
                          <span className="t-meta text-[var(--color-coral)] font-bold">{(numSgpa * 9.0).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TARGET FORECASTER & SIMULATOR */}
        {/* ========================================================= */}
        {activeTab === 'FORECAST' && (
          <div className="board board-hard bg-[var(--surface)] pad-page flex flex-col gap-4 border-l-4 border-l-[var(--color-coral)]">
            <div className="border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Target className="icon-md text-[var(--color-coral)] shrink-0" />
                <h2 className="t-section">CGPA TARGET FORECASTER</h2>
              </div>
              <p className="t-meta muted mt-0.5">
                SIMULATE REQUIRED SGPA TO HIT TARGET PLACEMENT / GRADUATION CGPA
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT: INPUTS & PRESETS (col-span-6) */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="t-meta muted block mb-1">
                      CURRENT CGPA
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.01}
                      className="field !py-1.5 !px-2.5 text-sm font-bold"
                      value={currentCgpaInput}
                      onChange={(e) => setCurrentCgpaInput(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="t-meta muted block mb-1">
                      COMPLETED SEMESTERS
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      className="field !py-1.5 !px-2.5 text-sm font-bold"
                      value={completedSemsInput}
                      onChange={(e) => setCompletedSemsInput(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="t-meta muted block mb-1">
                      TARGET CGPA GOAL
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.01}
                      className="field !py-1.5 !px-2.5 text-sm font-bold"
                      value={targetCgpaInput}
                      onChange={(e) => setTargetCgpaInput(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="t-meta muted block mb-1">
                      TOTAL PROGRAM SEMESTERS
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={10}
                      className="field !py-1.5 !px-2.5 text-sm font-bold"
                      value={totalDegreeSems}
                      onChange={(e) => setTotalDegreeSems(e.target.value)}
                    />
                  </div>
                </div>

                {/* QUICK FILL TARGET PRESETS */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="t-micro muted mr-1">PRESETS:</span>
                  {['7.50', '8.00', '8.50', '9.00'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTargetCgpaInput(val)}
                      className="btn !py-0.5 !px-2 text-xs font-bold cursor-pointer"
                    >
                      {val} CGPA
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT: REQUIRED AVERAGE SGPA OUTCOME (col-span-6) */}
              <div className="lg:col-span-6 flex flex-col justify-between pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[var(--border)] lg:pl-6">
                <div className="flex items-center justify-between">
                  <span className="t-card-title flex items-center gap-1.5">
                    <TrendingUp className="icon-micro shrink-0" style={{ color: forecast.tone }} /> REQUIRED AVERAGE SGPA
                  </span>
                  <span
                    className="chip t-micro font-bold border border-black/20"
                    style={{ background: forecast.tone, color: 'var(--on-accent)' }}
                  >
                    {forecast.status}
                  </span>
                </div>

                <p
                  className="t-stat mt-3"
                  style={{ color: forecast.tone }}
                >
                  {forecast.possible ? forecast.requiredSgpa.toFixed(2) : 'IMPOSSIBLE'}
                </p>

                {forecast.possible ? (
                  <p className="text-sm sm:text-base font-normal mt-3 leading-relaxed">
                    You need an average of <strong className="font-bold">{forecast.requiredSgpa.toFixed(2)} SGPA</strong> in each of the remaining <strong className="font-bold">{forecast.remaining} semesters</strong> to achieve your target <strong className="font-bold">{targetCgpaInput} CGPA</strong> ({(parseFloat(targetCgpaInput) * 9.0).toFixed(1)}%).
                  </p>
                ) : (
                  <div className="text-sm sm:text-base font-normal mt-3 leading-relaxed flex flex-col gap-1">
                    <p>
                      Even with a perfect <strong className="font-bold">10.00 SGPA</strong> in all remaining {forecast.remaining} semesters,
                    </p>
                    <p>
                      The maximum attainable CGPA is <strong className="font-bold">{forecast.maxPossible.toFixed(2)}</strong> ({(forecast.maxPossible * 9.0).toFixed(1)}%).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: OFFICIAL ORDINANCES & PERCENTAGE CONVERSION */}
        {/* ========================================================= */}
        {activeTab === 'RULES' && (
          <div className="board board-hard bg-[var(--surface)] pad-page flex flex-col gap-4 border-l-4 border-l-[var(--color-coral)]">
            <div className="border-b border-[var(--border)] pb-2.5">
              <span className="chip t-micro font-bold bg-[var(--color-coral)] text-[var(--on-accent)] border border-black/20">
                OFFICIAL SENATE ORDINANCE
              </span>
              <h2 className="t-section mt-2">
                CGPA TO PERCENTAGE CONVERSION & GRADE SCALE
              </h2>
              <p className="t-meta muted mt-0.5">
                NATIONAL INSTITUTE OF TECHNOLOGY, KURUKSHETRA
              </p>
            </div>

            <div className="board board-hard pad-card bg-[var(--surface-muted)] text-center border-2 border-[var(--color-coral)]">
              <p className="t-meta muted uppercase">Official Multiplication Formula</p>
              <p className="t-stat mt-1 text-[var(--color-coral)]">
                Percentage (%) = CGPA × 9.00
              </p>
              <p className="t-micro muted mt-1">
                (Note: NITKKR uses <strong>9.00</strong>, not 9.5 or 10)
              </p>
            </div>

            {/* MERGED GRADE SCALE & PERCENTAGE CONVERSION TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[580px]">
                <thead>
                  <tr className="border-b-2 border-[var(--border)] t-meta text-[var(--color-coral)]">
                    <th className="py-2 px-3 text-center whitespace-nowrap w-24">GRADE</th>
                    <th className="py-2 px-3 text-center whitespace-nowrap">PERFORMANCE</th>
                    <th className="py-2 px-3 text-center whitespace-nowrap w-36">POINTS (GI)</th>
                    <th className="py-2 px-3 text-center whitespace-nowrap w-48">EQUIVALENT MARKS (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {GRADE_POINTS.map((g) => (
                    <tr key={g.grade} className="hover:bg-[var(--surface-muted)] transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-black text-sm text-[var(--color-coral)] whitespace-nowrap">
                        {g.grade}
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs sm:text-sm font-normal uppercase text-[var(--text)] whitespace-nowrap">
                        {g.desc}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-sm whitespace-nowrap">
                        {g.points}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-sm text-[var(--color-coral)] whitespace-nowrap">
                        {(g.points * 9.0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
