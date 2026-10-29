import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  Atom,
  BookOpen,
  Briefcase,
  Calculator,
  CalendarClock,
  Check,
  CheckCheck,
  ClipboardCheck,
  Clock,
  Code2,
  Copy,
  Cpu,
  FlaskConical,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import Shell from '../components/Shell'
import SessionModal from '../components/SessionModal'
import SubjectModal from '../components/SubjectModal'
import { EmptyState, Field, Modal, Panel, Ring } from '../ui'
import { useProfile, useRollcallSettings, useAllSubjectsData, useStored, KEYS } from '../lib/storage'
import { courseKeyForSession, coursesOf, filterSessionsByGroup, useBoard } from '../lib/board'
import { getDefaultSemesterEndDate } from '../data/info'
import { branchName } from '../data/campus'
import {
  STATUS_COLOR,
  STATUS_INK,
  calculateSemesterTarget,
  canSkip,
  getRemainingClasses,
  mustAttend,
  simulateSkip,
  status,
  tally,
  useRollcall,
} from '../lib/rollcall'
import {
  dayCode,
  fmtDateShort,
  isoToDate,
  minutesNow,
  todayISO,
} from '../lib/time'
import { getSubjectTheme } from '../lib/palette'

/* ----------------------------------------------------------- Haptic Helper -- */

function triggerHaptic(duration = 10) {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      navigator.vibrate(duration)
    }
  } catch {
    // Non-blocking fallback for environments without vibration support
  }
}

/* ----------------------------------------------------------- Watermark Icon ----------------------------------------------------------- */

function getSubjectWatermarkIcon(name = '', code = '', category = '') {
  const s = `${name} ${code} ${category}`.toUpperCase()
  if (s.includes('LAB') || s.includes('PRACTICAL')) return FlaskConical
  if (s.includes('MATH') || s.includes('CALCULUS') || s.includes('STAT') || s.includes('ALGEBRA') || s.includes('DISCRETE')) return Calculator
  if (s.includes('DATA') || s.includes('ALGO') || s.includes('CODE') || s.includes('PROGRAM') || s.includes('SOFTWARE') || s.includes('WEB') || s.includes('JAVA') || s.includes('PYTHON') || s.includes('C++') || s.includes('COMPILER')) return Code2
  if (s.includes('CIRCUIT') || s.includes('ELECT') || s.includes('DIGITAL') || s.includes('HARDWARE') || s.includes('MICRO') || s.includes('DEVICE') || s.includes('ORGANIZATION') || s.includes('ARCHITECTURE')) return Cpu
  if (s.includes('PHYS') || s.includes('CHEM') || s.includes('SCIENCE') || s.includes('MATERIAL')) return Atom
  if (s.includes('ECON') || s.includes('MANAG') || s.includes('COMM') || s.includes('BUSINESS')) return Briefcase
  return BookOpen
}

/* ------------------------------------------------------------- Main Page -- */

export default function Attendance() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const rawRouteTab = params.tabKey || params['*'] || searchParams.get('tab') || searchParams.get('view')

  const { profile, year, group } = useProfile()
  const { sessions, addSession, removeSession, moveSession } = useBoard(profile.branch, year)
  const { marks, adjustments, setMark, markBatch, unmarkBatch, adjustSubject, getMark, clearAll } = useRollcall()
  const [settings, setSettings] = useRollcallSettings()
  const allSubjectsStore = useAllSubjectsData()

  // Sync route and redirect legacy routes or today tab to /attendance
  useEffect(() => {
    if (rawRouteTab) {
      const clean = decodeURIComponent(rawRouteTab).trim().toLowerCase().replace(/[\s_-]+/g, '')
      if (clean.includes('fix') || clean.includes('backfill')) {
        navigate('/timetable?view=calendar', { replace: true })
        return
      }
      if (clean.includes('today') || clean.includes('daily')) {
        navigate('/attendance', { replace: true })
      }
    }
  }, [rawRouteTab, navigate])

  const [showSettings, setShowSettings] = useState(false)
  const [showSimulator, setShowSimulator] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)

  const [requiredDraft, setRequiredDraft] = useState(String(settings.required))

  // Mid-semester base attendance drafts
  const baseAttendance = settings.baseAttendance
  const [basePresentDraft, setBasePresentDraft] = useState(String(baseAttendance?.present || ''))
  const [baseHeldDraft, setBaseHeldDraft] = useState(String(baseAttendance?.held || ''))

  // Simulator Scope & Interactive States
  const [simScope, setSimScope] = useState('OVERALL')
  const [simSkipCount, setSimSkipCount] = useState(1)
  const [simGoalTarget, setSimGoalTarget] = useState(65)
  const [simForecastWeeks, setSimForecastWeeks] = useState(4)

  // Semester End Date (Academic Calendar with manual override)
  const defaultEndDate = useMemo(() => getDefaultSemesterEndDate(), [])
  const [customEndDate, setCustomEndDate] = useStored(KEYS.semesterEndDate, '')
  const semesterEndDate = customEndDate || defaultEndDate
  const isCustomEndDate = Boolean(customEndDate && customEndDate !== defaultEndDate)
  const [showEndDateEditor, setShowEndDateEditor] = useState(false)


  // Subject health filter in Subjects Tab
  const [subjectFilter, setSubjectFilter] = useState('ALL')

  // Modals for editing subjects and session slots
  const [subjectModal, setSubjectModal] = useState({ open: false, course: null })
  const [sessionModal, setSessionModal] = useState({ open: false, session: null, defaultDay: 'MON', prefill: null })

  const required = settings.required
  const since = settings.trackingSince || ''
  const iso = todayISO()
  const today = dayCode()
  const currentMins = minutesNow()

  // Dynamic semester week calculation (Week X of 16) based on tracking start date
  const semesterWeekInfo = useMemo(() => {
    const totalWeeks = 16
    if (!since) return { currentWeek: 1, totalWeeks }
    const start = isoToDate(since)
    const now = isoToDate(iso)
    const diffMs = now.getTime() - start.getTime()
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    const calcWeek = Math.floor(diffDays / 7) + 1
    const currentWeek = Math.min(Math.max(1, calcWeek), totalWeeks)
    return { currentWeek, totalWeeks }
  }, [since, iso])

  const effectiveSessions = useMemo(() => filterSessionsByGroup(sessions, group), [sessions, group])
  const courses = useMemo(
    () => [...coursesOf(effectiveSessions)].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [effectiveSessions],
  )

  // Compute total manual adjustments offset
  const totalAdjustments = useMemo(() => {
    return Object.values(adjustments || {}).reduce((sum, val) => sum + (Number(val) || 0), 0)
  }, [adjustments])

  const basePresentVal = baseAttendance?.present || 0
  const baseHeldVal = baseAttendance?.held || 0

  // Overall cumulative semester attendance statistics (Till Now)
  const overall = useMemo(() => {
    const teachingSessions = effectiveSessions.filter((s) => s.type !== 'break')
    return tally(marks, teachingSessions, since, totalAdjustments, { present: basePresentVal, held: baseHeldVal })
  }, [marks, effectiveSessions, since, totalAdjustments, basePresentVal, baseHeldVal])

  const overallStatus = status(overall.percent, required)

  // Subject health analysis
  const subjectStats = useMemo(() => {
    let safe = 0
    let edge = 0
    let atRisk = 0
    let untracked = 0
    const list = courses.map((c) => {
      const courseAdj = adjustments[c.key] || 0
      const t = tally(marks, c.sessions, since, courseAdj)
      const firstSession = c.sessions[0] || {}
      const customData = allSubjectsStore[c.key] || allSubjectsStore[c.name] || {}
      const effCutoff = customData.targetCutoff != null && Number(customData.targetCutoff) > 0
        ? Number(customData.targetCutoff)
        : (firstSession.targetCutoff != null ? firstSession.targetCutoff : required)
      const st = status(t.percent, effCutoff)
      if (st === 'safe') safe += 1
      else if (st === 'edge') edge += 1
      else if (st === 'short') atRisk += 1
      else untracked += 1
      return { ...c, tallyData: t, status: st, effectiveCutoff: effCutoff, customData }
    })
    return { safe, edge, atRisk, untracked, total: courses.length, list }
  }, [courses, marks, since, adjustments, required, allSubjectsStore])

  // Filtered courses for the Subjects tab
  const filteredCourses = useMemo(() => {
    let base = subjectStats.list
    if (subjectFilter === 'AT_RISK') base = base.filter((c) => c.status === 'short')
    else if (subjectFilter === 'EDGE') base = base.filter((c) => c.status === 'edge')
    else if (subjectFilter === 'SAFE') base = base.filter((c) => c.status === 'safe')
    return [...base].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [subjectStats, subjectFilter])

  // NOTE: overall safe-skip / recovery figures were removed deliberately.
  // Attendance is enforced per subject, so pooling present/held across all
  // subjects invents margin that does not exist (3/3 across 3 subjects read as
  // "+1 bunk" while every subject individually had 0). Per-subject margins are
  // shown on each subject row instead.

  /* ---------------------- Scope-Aware Simulator Calculations ---------------------- */

  const activeScopeData = useMemo(() => {
    if (simScope === 'OVERALL') {
      const weeklyTeachingCount = effectiveSessions.filter((s) => s.type !== 'break').length
      return {
        key: 'OVERALL',
        name: 'Overall Semester',
        code: '',
        present: overall.present,
        held: overall.held,
        percent: overall.percent,
        targetCutoff: required,
        weeklySlots: Math.max(1, weeklyTeachingCount),
      }
    }
    const course = subjectStats.list.find((c) => c.key === simScope)
    if (!course) {
      return {
        key: simScope,
        name: 'Selected Subject',
        code: '',
        present: 0,
        held: 0,
        percent: null,
        targetCutoff: required,
        weeklySlots: 1,
      }
    }
    return {
      key: course.key,
      name: course.name,
      code: course.code || '',
      present: course.tallyData.present,
      held: course.tallyData.held,
      percent: course.tallyData.percent,
      targetCutoff: course.effectiveCutoff,
      weeklySlots: Math.max(1, course.sessions.length),
    }
  }, [simScope, overall, required, subjectStats.list, effectiveSessions])

  // Tool 1: Bunk Simulator for Active Scope
  const simSkipResult = useMemo(() => {
    return simulateSkip(activeScopeData.present, activeScopeData.held, simSkipCount, activeScopeData.targetCutoff)
  }, [activeScopeData, simSkipCount])


  // Remaining classes calculation from today till semesterEndDate
  const remainingData = useMemo(() => {
    return getRemainingClasses({
      effectiveSessions,
      marks,
      todayIso: iso,
      endDateIso: semesterEndDate,
    })
  }, [effectiveSessions, marks, iso, semesterEndDate])

  const activeRemainingClasses = useMemo(() => {
    if (simScope === 'OVERALL') {
      return remainingData.overall
    }
    return remainingData.byCourse[simScope] || 0
  }, [simScope, remainingData])

  // Enhanced Tool 2: End-of-Semester Target Roadmap for Active Scope
  const activeRoadmap = useMemo(() => {
    return calculateSemesterTarget({
      present: activeScopeData.present,
      held: activeScopeData.held,
      remaining: activeRemainingClasses,
      targetPercent: simGoalTarget,
    })
  }, [activeScopeData.present, activeScopeData.held, activeRemainingClasses, simGoalTarget])

  // All Subjects End-of-Semester Roadmap
  const allSubjectsRoadmap = useMemo(() => {
    return subjectStats.list.map((c) => {
      const remaining = remainingData.byCourse[c.key] || 0
      const roadmap = calculateSemesterTarget({
        present: c.tallyData.present,
        held: c.tallyData.held,
        remaining,
        targetPercent: simGoalTarget,
      })
      return {
        ...c,
        remaining,
        roadmap,
      }
    })
  }, [subjectStats.list, remainingData.byCourse, simGoalTarget])

  // Tool 3: End-of-Semester Forecast
  const forecastResult = useMemo(() => {
    const futureClasses = activeScopeData.weeklySlots * simForecastWeeks
    const activeP = activeScopeData.present
    const activeH = activeScopeData.held
    const cutoff = activeScopeData.targetCutoff

    // Best Case: Attend all upcoming classes
    const bestP = activeP + futureClasses
    const bestH = activeH + futureClasses
    const bestPct = bestH > 0 ? (bestP / bestH) * 100 : 100
    const bestMargin = canSkip(bestP, bestH, cutoff)
    const bestSt = status(bestPct, cutoff)

    // Worst Case: Bunk all upcoming classes
    const worstP = activeP
    const worstH = activeH + futureClasses
    const worstPct = worstH > 0 ? (worstP / worstH) * 100 : 0
    const worstShortage = mustAttend(worstP, worstH, cutoff)
    const worstSt = status(worstPct, cutoff)

    return {
      futureClasses,
      best: {
        present: bestP,
        held: bestH,
        percent: bestPct,
        margin: bestMargin,
        status: bestSt,
      },
      worst: {
        present: worstP,
        held: worstH,
        percent: worstPct,
        shortage: worstShortage,
        status: worstSt,
      },
    }
  }, [activeScopeData, simForecastWeeks])

  /* ------------------------------ Summary Share Handler ------------------------------ */

  // Copy Attendance Summary to Clipboard
  function handleCopySummary() {
    triggerHaptic(20)
    const dateStr = fmtDateShort(iso)
    const weekStr = `Week ${semesterWeekInfo.currentWeek} of ${semesterWeekInfo.totalWeeks}`
    const overallPct = overall.percent !== null ? `${overall.percent.toFixed(1)}%` : 'N/A'
    const marginStr =
      overall.percent === null
        ? 'No marks logged'
        : overall.percent >= required
          ? `At or above ${required}%`
          : `Below ${required}%`

    let text = `📚 NITKKR ATTENDANCE SUMMARY\n`
    text += `📅 ${dateStr} · ${weekStr} · Target: ${required}%\n`
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    text += `🎯 Overall: ${overall.present}/${overall.held} (${overallPct}) · ${marginStr}\n\n`
    text += `📊 Subject Breakdown:\n`

    for (const c of subjectStats.list) {
      const t = c.tallyData
      const pct = t.percent !== null ? `${t.percent.toFixed(1)}%` : 'No logs'
      const emoji = c.status === 'safe' ? '🟢' : c.status === 'edge' ? '⚠️' : c.status === 'short' ? '🔴' : '⚪'
      const note =
        t.percent === null
          ? 'Not tracked'
          : c.status === 'safe'
            ? `+${canSkip(t.present, t.held, c.effectiveCutoff)} skips`
            : `Need ${mustAttend(t.present, t.held, c.effectiveCutoff)} classes`
      text += `${emoji} ${c.name}${c.code ? ` (${c.code})` : ''}: ${t.present}/${t.held} (${pct}) · ${note}\n`
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    text += `Generated via NITKKR DESK`

    const markCopied = () => {
      setCopiedSummary(true)
      setTimeout(() => setCopiedSummary(false), 2500)
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(markCopied)
        .catch(() => {
          fallbackCopy(text)
        })
    } else {
      fallbackCopy(text)
    }

    function fallbackCopy(str) {
      try {
        const el = document.createElement('textarea')
        el.value = str
        el.setAttribute('readonly', '')
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        const success = document.execCommand('copy')
        document.body.removeChild(el)
        if (success) markCopied()
      } catch {
        // clipboard unavailable
      }
    }
  }

  // Handle saving full subject changes across all its slots
  function handleSaveSubject(updatedSubject) {
    if (!subjectModal.course) return
    const courseKey = subjectModal.course.key
    const matchingSessions = sessions.filter((s) => courseKeyForSession(s) === courseKey || (s.code || s.name) === courseKey)
    for (const s of matchingSessions) {
      moveSession(s.id, {
        name: updatedSubject.name,
        code: updatedSubject.code,
        instructor: updatedSubject.instructor,
        accent: updatedSubject.accent,
        targetCutoff: updatedSubject.targetCutoff,
      })
    }
  }

  // Handle deleting an entire course and all its timetable slots
  function handleDeleteSubject(courseKey) {
    const matchingSessions = sessions.filter((s) => courseKeyForSession(s) === courseKey || (s.code || s.name) === courseKey)
    for (const s of matchingSessions) {
      removeSession(s.id)
    }
  }

  // Handle saving an individual slot
  function handleSaveSession(sessionData) {
    if (sessionModal.session) {
      moveSession(sessionModal.session.id, sessionData)
    } else {
      addSession(sessionData)
    }
  }

  // Handle deleting an individual slot
  function handleDeleteSession(id) {
    removeSession(id)
  }

  return (
    <Shell>
      <div className="flex flex-col gap-3 pb-8">
        {/* 🌟 UNIFIED DASHBOARD HERO COCKPIT */}
        <Panel className="board board-hard bg-[var(--surface)] pad-page">
          {/* Top Bar: Title, Week Indicator Chip & Action Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b-2 border-[var(--border)]">
            <div className="flex items-center gap-3 sm:gap-3">
              <span
                className="icon-tile"
                style={{ background: 'var(--color-coral)' }}
                aria-hidden
              >
                <ClipboardCheck className="icon-lg" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="t-masthead">
                    ATTENDANCE
                  </h1>
                  <span className="chip !py-0.5 !px-2 text-[0.6rem] sm:text-xs font-black uppercase tracking-widest bg-[var(--surface-2)] border-2 border-[var(--border)]">
                    WK {semesterWeekInfo.currentWeek}/{semesterWeekInfo.totalWeeks}
                  </span>
                </div>
              </div>
            </div>

            {/* Symmetrical Action Buttons (WHAT-IF, SUMMARY, SETTINGS) */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <button
                type="button"
                className={`btn !py-2 !px-2 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 sm:gap-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                  showSimulator
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                }`}
                onClick={() => {
                  triggerHaptic()
                  setShowSimulator(!showSimulator)
                }}
                title="Open interactive bunk, goal & forecast simulator"
              >
                <Calculator className="icon-micro shrink-0" strokeWidth={2.5} />
                <span className="truncate">WHAT-IF</span>
              </button>

              <button
                type="button"
                className="btn !py-2 !px-2 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 sm:gap-1.5 cursor-pointer transition-all border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                onClick={() => {
                  triggerHaptic()
                  setShowSummaryModal(true)
                }}
                title="Open attendance share summary card"
              >
                <Share2 className="icon-micro shrink-0" strokeWidth={2.5} />
                <span className="truncate">SUMMARY</span>
              </button>

              <button
                type="button"
                className={`btn !py-2 !px-2 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 sm:gap-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                  showSettings
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                }`}
                onClick={() => {
                  triggerHaptic()
                  setShowSettings(!showSettings)
                }}
              >
                <Settings2 className="icon-micro shrink-0" strokeWidth={2.5} />
                <span className="truncate">SETTINGS</span>
              </button>
            </div>
          </div>

          {/* Main Hero Metrics Area */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-4">
            {/* Left: Overall Ring Gauge & Cumulative Numbers */}
            <div className="flex items-center gap-4 sm:gap-4 min-w-0">
              <div className="relative shrink-0">
                <Ring percent={overall.percent} color={STATUS_COLOR[overallStatus]} size={96} strokeWidth={10} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="t-meta muted block truncate">
                  OVERALL SEMESTER (TILL NOW)
                </span>
                <h2 className="t-stat mt-1 text-[var(--text)]">
                  {overall.held === 0 ? '0 OF 0' : `${overall.present} OF ${overall.held}`}
                </h2>
                <p className="t-meta muted mt-1">
                  Classes Attended · Target {required}%
                </p>

                {/* Base Attendance Chip */}
                {baseAttendance.held > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="chip !py-0.5 sm:!py-1 !px-2 text-xs border-2 border-dashed border-[var(--border)] font-bold uppercase tracking-wider">
                      Base: {baseAttendance.present}/{baseAttendance.held}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Metrics Grid (all breakpoints) */}
            <div className="grid grid-cols-2 gap-4 lg:gap-4 pt-4 lg:pt-0 border-t-2 lg:border-t-0 border-[var(--border)] shrink-0 divide-x-2 divide-[var(--border)]">
              {/* Subject Health Column */}
              <div className="pr-2">
                <span className="t-meta muted block">
                  SUBJECT HEALTH
                </span>
                <p className="t-stat mt-1 text-[var(--text)]">
                  {subjectStats.safe}/{courses.length}
                </p>
                <p className="t-meta mt-0.5">
                  {subjectStats.atRisk > 0 ? (
                    <span className="text-[var(--absent-ink)] font-bold">{subjectStats.atRisk} at risk</span>
                  ) : subjectStats.edge > 0 ? (
                    <span className="text-[var(--warn-ink)] font-bold">{subjectStats.edge} on line</span>
                  ) : (
                    <span className="text-[var(--present-ink)] font-bold">All safe</span>
                  )}
                </p>
              </div>

              {/* Target Cutoff Column */}
              <div className="pl-4 lg:pl-6 pr-2">
                <span className="t-meta muted block">
                  TARGET CUTOFF
                </span>
                <p className="t-stat mt-1 text-[var(--text)]">
                  {required}%
                </p>
                <p className="t-meta muted mt-0.5">
                  Official Target
                </p>
              </div>

            </div>
          </div>
        </Panel>

        {/* 🧮 INTERACTIVE "WHAT-IF" BUNK, RECOVERY & END-OF-SEMESTER FORECAST DRAWER */}
        {showSimulator ? (
          <Panel className="board board-hard bg-[var(--surface-2)] pad-page border-2 border-[var(--border)] space-y-4 animate-flip">
            {/* Header with Scope Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="icon-md text-[var(--warn-ink)]" />
                <h3 className="t-card-title text-[var(--text)]">
                  WHAT-IF SIMULATOR & FORECAST
                </h3>
              </div>

              {/* Scope Selector: Overall vs Subject Specific */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="t-meta muted">SCOPE:</span>
                <select
                  value={simScope}
                  onChange={(e) => {
                    triggerHaptic()
                    setSimScope(e.target.value)
                  }}
                  className="field !py-1.5 !px-2.5 text-xs sm:text-sm font-bold bg-[var(--surface)] text-[var(--text)] border-2 border-[var(--border)] rounded cursor-pointer"
                  aria-label="Select simulator scope"
                >
                  <option value="OVERALL">📊 OVERALL SEMESTER</option>
                  {subjectStats.list.map((c) => (
                    <option key={c.key} value={c.key}>
                      📚 {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowSimulator(false)}
                  className="text-[var(--muted)] hover:text-[var(--text)] p-1 cursor-pointer ml-auto"
                  aria-label="Close simulator"
                >
                  <X className="icon-sm shrink-0" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Scope Details Ribbon */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-[var(--surface)] border-2 border-[var(--border)] text-xs sm:text-sm">
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-[var(--text)] uppercase truncate">{activeScopeData.name}</span>
                {activeScopeData.code ? <span className="font-mono text-[var(--muted)] shrink-0">&lt;{activeScopeData.code}&gt;</span> : null}
              </div>
              <div className="flex items-center gap-2 shrink-0 font-bold">
                <span className="text-[var(--muted)] hidden sm:inline">Current:</span>
                <span className="text-[var(--text)]">{activeScopeData.held === 0 ? 'No logs' : `${activeScopeData.present}/${activeScopeData.held}`}</span>
                <span className="chip !py-0.5 !px-2 text-xs font-black border-2 border-[var(--border)]" style={{ background: 'var(--surface-2)' }}>
                  {activeScopeData.percent !== null ? `${Math.round(activeScopeData.percent)}%` : '—'}
                </span>
                <span className="text-[var(--muted)] hidden sm:inline">Target: {activeScopeData.targetCutoff}%</span>
              </div>
            </div>

            {/* Tools 1 & 2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tool 1: Bunk Impact Simulator */}
              <div className="pad-card rounded bg-[var(--surface)] border-2 border-[var(--border)] space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="t-card-title text-[var(--text)] flex items-center gap-1.5">
                      <TrendingDown className="icon-sm text-[var(--absent-ink)] shrink-0" />
                      <span>TOOL 1: WHAT IF I BUNK CLASSES?</span>
                    </span>
                    <span className="chip !py-0.5 !px-2 text-xs font-bold border-2 border-[var(--border)]">
                      {simSkipCount} CLASS{simSkipCount === 1 ? '' : 'ES'}
                    </span>
                  </div>

                  <p className="t-body muted text-xs sm:text-sm">
                    Simulate your percentage drop if you skip the next upcoming classes in this scope.
                  </p>

                  {/* Counter Steppers */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic()
                        setSimSkipCount((c) => Math.max(1, c - 1))
                      }}
                      className="btn !p-1.5 !h-9 !w-9 grid place-items-center cursor-pointer"
                      aria-label="Decrease skip count"
                    >
                      <Minus className="icon-micro shrink-0" strokeWidth={2.5} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={simSkipCount}
                      onChange={(e) => setSimSkipCount(Math.max(1, Number(e.target.value) || 1))}
                      className="field !py-1 text-center font-bold text-sm sm:text-base w-16"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic()
                        setSimSkipCount((c) => c + 1)
                      }}
                      className="btn !p-1.5 !h-9 !w-9 grid place-items-center cursor-pointer"
                      aria-label="Increase skip count"
                    >
                      <Plus className="icon-micro shrink-0" strokeWidth={2.5} />
                    </button>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {[1, 3, 5, 10].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            triggerHaptic()
                            setSimSkipCount(n)
                          }}
                          className={`chip !py-1 !px-2.5 text-xs sm:text-sm cursor-pointer transition-all border-2 border-[var(--border)] ${
                            simSkipCount === n ? '!bg-[var(--text)] !text-[var(--bg)] font-bold' : 'font-semibold hover:border-[var(--text)]'
                          }`}
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulation Output Card */}
                <div
                  className="p-3 rounded border-2 border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface-2)]"
                >
                  <div>
                    <span className="t-meta muted block">SIMULATED ATTENDANCE</span>
                    <p className="t-stat mt-0.5" style={{ color: STATUS_INK[simSkipResult.status] }}>
                      {simSkipResult.percent !== null ? `${simSkipResult.percent.toFixed(1)}%` : '—'}
                      <span className="text-xs sm:text-sm ml-1.5 opacity-80 font-bold">
                        ({simSkipResult.delta.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  <span
                    className="chip !py-1 !px-2.5 text-xs sm:text-sm font-black uppercase border-2 border-[var(--border)]"
                    style={{
                      background: STATUS_COLOR[simSkipResult.status],
                      color: 'var(--on-accent)',
                    }}
                  >
                    {simSkipResult.status === 'safe' ? 'STILL SAFE' : simSkipResult.status === 'edge' ? 'BORDERLINE' : 'DANGER'}
                  </span>
                </div>
              </div>

              {/* Tool 2: Enhanced Target Goal & Semester Roadmap Calculator */}
              <div className="pad-card rounded bg-[var(--surface)] border-2 border-[var(--border)] space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="t-card-title text-[var(--text)] flex items-center gap-1.5">
                      <TrendingUp className="icon-sm text-[var(--present-ink)] shrink-0" />
                      <span>TOOL 2: TARGET GOAL & ROADMAP</span>
                    </span>
                    <span className="chip !py-0.5 !px-2 text-xs font-bold border-2 border-[var(--border)]">
                      GOAL: {simGoalTarget}%
                    </span>
                  </div>

                  {/* Target Goals Selector */}
                  <div className="flex items-center gap-1.5">
                    {[65, 75, 85, 90].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          triggerHaptic()
                          setSimGoalTarget(t)
                        }}
                        className={`btn !py-1.5 !px-3 text-xs sm:text-sm flex-1 cursor-pointer transition-all border-2 border-[var(--border)] ${
                          simGoalTarget === t ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] font-bold shadow-hard-sm' : 'font-semibold'
                        }`}
                      >
                        {t}%
                      </button>
                    ))}
                  </div>

                  {/* Academic Calendar Status Banner (Bigger & Clearer) */}
                  <div className="p-2.5 sm:p-3 rounded bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded grid place-items-center bg-[var(--surface)] border border-[var(--border)] shrink-0">
                        <CalendarClock size={16} className="text-[var(--warn-ink)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-[var(--text)] uppercase tracking-tight">
                            Teaching Closes: {fmtDateShort(semesterEndDate)}
                          </span>
                          {isCustomEndDate ? (
                            <span className="chip !py-0 !px-1.5 text-[0.65rem] font-bold bg-[var(--color-amber)] text-[var(--on-accent)]">
                              CUSTOM
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs text-[var(--muted)] font-semibold block">
                          {activeRemainingClasses} class{activeRemainingClasses === 1 ? '' : 'es'} remaining
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(5)
                          setShowEndDateEditor(!showEndDateEditor)
                        }}
                        className="btn !py-1 !px-2.5 text-xs font-bold border-2 border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil size={11} />
                        <span>{showEndDateEditor ? 'Hide' : 'Edit'}</span>
                      </button>
                      {isCustomEndDate ? (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(5)
                            setCustomEndDate('')
                            setShowEndDateEditor(false)
                          }}
                          className="btn !py-1 !px-2 text-xs font-bold border-2 border-[var(--border)] text-[var(--present-ink)] bg-[var(--surface)] hover:bg-[var(--surface-2)] flex items-center gap-1 cursor-pointer"
                          title="Reset to official date"
                        >
                          <RotateCcw size={11} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Inline Date Editor */}
                  {showEndDateEditor ? (
                    <div className="p-2 rounded bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-[var(--text)] text-[0.75rem]">Custom Last Day:</span>
                      <input
                        type="date"
                        min={iso}
                        value={semesterEndDate}
                        onChange={(e) => {
                          if (e.target.value) setCustomEndDate(e.target.value)
                        }}
                        className="field !py-1 !px-2 text-xs font-bold text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] rounded"
                      />
                      <span className="muted text-[0.7rem]">Official: {fmtDateShort(defaultEndDate)}</span>
                    </div>
                  ) : null}
                </div>

                {/* Target Goal Output Compact Card - Consistent with Tool 1 Output Card */}
                {!activeRoadmap.isAchievable ? (
                  /* State 1: Unachievable */
                  <div className="p-3 rounded border-2 border-[var(--color-absent)] flex items-center justify-between gap-3 bg-[var(--surface-2)]">
                    <div>
                      <span className="t-meta block text-[var(--absent-ink)] font-bold">REQUIRED ATTENDANCE</span>
                      <p className="t-stat mt-0.5 text-[var(--absent-ink)]">
                        Attend {activeRemainingClasses} of {activeRemainingClasses}
                      </p>
                    </div>
                    <span className="chip !py-1 !px-2.5 text-xs sm:text-sm font-black uppercase bg-[var(--color-absent)] text-[var(--on-accent)] border-2 border-[var(--border)] shrink-0">
                      Short by {activeRoadmap.deficit}
                    </span>
                  </div>
                ) : activeRoadmap.status === 'safe' ? (
                  /* State 2: Already Secure */
                  <div className="p-3 rounded border-2 border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface-2)]">
                    <div>
                      <span className="t-meta block text-[var(--present-ink)] font-bold">REQUIRED ATTENDANCE</span>
                      <p className="t-stat mt-0.5 text-[var(--present-ink)]">
                        Attend 0 of {activeRemainingClasses}
                      </p>
                    </div>
                    <span className="chip !py-1 !px-2.5 text-xs sm:text-sm font-black uppercase bg-[var(--color-present)] text-[var(--on-accent)] border-2 border-[var(--border)] shrink-0">
                      {activeRemainingClasses} Bunks Left
                    </span>
                  </div>
                ) : (
                  /* State 3: Achievable */
                  <div className="p-3 rounded border-2 border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface-2)]">
                    <div>
                      <span className="t-meta muted block">REQUIRED ATTENDANCE</span>
                      <p className="t-stat mt-0.5 text-[var(--text)]">
                        Attend {activeRoadmap.neededToAttend} of {activeRemainingClasses}
                      </p>
                    </div>
                    <span
                      className="chip !py-1 !px-2.5 text-xs sm:text-sm font-black uppercase border-2 border-[var(--border)] shrink-0"
                      style={{
                        background: activeRoadmap.skipsAllowed > 0 ? 'var(--color-present)' : 'var(--color-amber)',
                        color: 'var(--on-accent)',
                      }}
                    >
                      {activeRoadmap.skipsAllowed > 0 ? `${activeRoadmap.skipsAllowed} Bunks Left` : '0 Bunks Left'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tool 3: End-of-Semester Forecast */}
            <div className="pad-card rounded bg-[var(--surface)] border-2 border-[var(--border)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="icon-sm text-[var(--present-ink)] shrink-0" />
                  <span className="t-card-title">
                    TOOL 3: END-OF-SEMESTER FORECAST ({simForecastWeeks} WEEKS REMAINING)
                  </span>
                </div>

                {/* Remaining Weeks Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="t-meta muted mr-1">WEEKS:</span>
                  {[1, 2, 3, 4, 6].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        triggerHaptic()
                        setSimForecastWeeks(w)
                      }}
                      className={`chip !py-1 !px-2.5 text-xs sm:text-sm cursor-pointer transition-all border-2 border-[var(--border)] ${
                        simForecastWeeks === w ? '!bg-[var(--text)] !text-[var(--bg)] font-bold' : 'font-semibold hover:border-[var(--text)]'
                      }`}
                    >
                      {w}w
                    </button>
                  ))}
                </div>
              </div>

              <p className="t-body muted">
                Projected over next {forecastResult.futureClasses} classes ({activeScopeData.weeklySlots} slot{activeScopeData.weeklySlots === 1 ? '' : 's'}/week × {simForecastWeeks} weeks):
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Best Case (Attend All) */}
                <div className="pad-card rounded bg-[var(--surface-2)] border-2 border-[var(--color-present)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="t-card-title text-[var(--present-ink)] flex items-center gap-1.5">
                      <CheckCheck className="icon-micro shrink-0" /> BEST CASE (ATTEND ALL)
                    </span>
                    <span
                      className="chip !py-0.5 !px-2 text-xs font-black border-2 border-[var(--border)]"
                      style={{ background: 'var(--color-present)', color: 'var(--on-accent)' }}
                    >
                      {forecastResult.best.status === 'safe' ? 'SAFE' : 'AT RISK'}
                    </span>
                  </div>
                  <p className="t-stat text-[var(--present-ink)] pt-1">
                    {forecastResult.best.percent.toFixed(1)}%
                  </p>
                  <p className="t-body text-[var(--text)] font-semibold mt-1">
                    {forecastResult.best.margin > 0
                      ? `+${forecastResult.best.margin} safe bunks margin at semester end`
                      : `Meets cutoff with 0 margin`}
                  </p>
                  <p className="t-meta muted">
                    Projected: {forecastResult.best.present}/{forecastResult.best.held} classes attended
                  </p>
                </div>

                {/* Worst Case (Bunk All) */}
                <div className="pad-card rounded bg-[var(--surface-2)] border-2 border-[var(--color-absent)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="t-card-title text-[var(--absent-ink)] flex items-center gap-1.5">
                      <X className="icon-micro shrink-0" /> WORST CASE (BUNK ALL)
                    </span>
                    <span
                      className="chip !py-0.5 !px-2 text-xs font-black border-2 border-[var(--border)]"
                      style={{ background: 'var(--color-absent)', color: 'var(--on-accent)' }}
                    >
                      {forecastResult.worst.status === 'safe' ? 'SAFE' : 'SHORTAGE'}
                    </span>
                  </div>
                  <p className="t-stat text-[var(--absent-ink)] pt-1">
                    {forecastResult.worst.percent.toFixed(1)}%
                  </p>
                  <p className="t-body text-[var(--text)] font-semibold mt-1">
                    {forecastResult.worst.shortage > 0 ? (
                      <span className="text-[var(--absent-ink)] font-bold">
                        ⚠️ Shortage: Requires {forecastResult.worst.shortage} more attendances
                      </span>
                    ) : (
                      <span className="text-[var(--present-ink)] font-bold">Still maintains cutoff</span>
                    )}
                  </p>
                  <p className="t-meta muted">
                    Projected: {forecastResult.worst.present}/{forecastResult.worst.held} classes attended
                  </p>
                </div>
              </div>
            </div>

            {/* All Subjects End-of-Semester Roadmap Table & Cards (Requirement A4) */}
            <div className="pad-card rounded bg-[var(--surface)] border-2 border-[var(--border)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="icon-sm text-[var(--present-ink)] shrink-0" />
                  <span className="t-card-title">
                    ALL SUBJECTS ROADMAP · {simGoalTarget}% TARGET (UNTIL {fmtDateShort(semesterEndDate)})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="chip !py-0.5 !px-2 text-xs font-bold border-2 border-[var(--border)]">
                    {allSubjectsRoadmap.length} SUBJECTS
                  </span>
                </div>
              </div>

              <p className="t-body muted text-xs sm:text-sm">
                Classes left and attendance needed for each subject based on your timetable and holidays. Tap any subject to inspect it in the simulator above.
              </p>

              {allSubjectsRoadmap.length === 0 ? (
                <EmptyState
                  title="NO SUBJECTS FOUND"
                  body="Your timetable has no active courses. Set up your branch and group in profile or timetable."
                />
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[var(--border)] text-[var(--muted)] font-black uppercase tracking-wider text-[0.7rem]">
                          <th className="py-2.5 px-3">Subject</th>
                          <th className="py-2.5 px-3">Current</th>
                          <th className="py-2.5 px-3 text-center">Classes Left</th>
                          <th className="py-2.5 px-3 text-center">Must Attend</th>
                          <th className="py-2.5 px-3 text-center">Safe Skips</th>
                          <th className="py-2.5 px-3 text-center">Projected %</th>
                          <th className="py-2.5 px-3 text-right">Scope</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] border-b-2 border-[var(--border)]">
                        {allSubjectsRoadmap.map((c) => {
                          const r = c.roadmap
                          const isCurrentScope = simScope === c.key
                          return (
                            <tr
                              key={c.key}
                              onClick={() => {
                                triggerHaptic()
                                setSimScope(c.key)
                              }}
                              className={`cursor-pointer transition-colors hover:bg-[var(--surface-2)] ${
                                isCurrentScope ? 'bg-[var(--surface-2)] font-bold' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="chip !py-0.5 !px-1.5 text-[0.65rem] font-black uppercase border border-[var(--border)] shrink-0"
                                    style={{ background: c.category === 'LAB' ? 'var(--color-amber)' : 'var(--surface-2)' }}
                                  >
                                    {c.category === 'LAB' ? 'LAB' : 'TH'}
                                  </span>
                                  <div className="min-w-0">
                                    <span className="font-bold text-[var(--text)] block truncate max-w-[200px] lg:max-w-[280px]">
                                      {c.name}
                                    </span>
                                    {c.code ? <span className="font-mono text-[0.7rem] text-[var(--muted)]">{c.code}</span> : null}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="font-bold text-[var(--text)]">
                                  {c.tallyData.held === 0 ? '—' : `${c.tallyData.present}/${c.tallyData.held}`}
                                </span>
                                <span className="text-[var(--muted)] ml-1 text-xs">
                                  ({c.tallyData.percent !== null ? `${Math.round(c.tallyData.percent)}%` : '0%'})
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">
                                {c.remaining}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {!r.isAchievable ? (
                                  <span className="chip !py-0.5 !px-2 text-xs font-black bg-[var(--color-absent)] text-[var(--on-accent)]">
                                    Max {r.maxAchievablePercent.toFixed(0)}%
                                  </span>
                                ) : r.neededToAttend === 0 ? (
                                  <span className="chip !py-0.5 !px-2 text-xs font-black bg-[var(--color-present)] text-[var(--on-accent)]">
                                    0 of {c.remaining}
                                  </span>
                                ) : (
                                  <span className="chip !py-0.5 !px-2 text-xs font-black border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]">
                                    {r.neededToAttend} of {c.remaining}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {!r.isAchievable ? (
                                  <span className="text-[var(--absent-ink)] font-bold text-xs">0 skips</span>
                                ) : (
                                  <span className="text-[var(--present-ink)] font-bold text-xs">+{r.skipsAllowed} skips</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold whitespace-nowrap">
                                <span style={{ color: STATUS_INK[r.status === 'unachievable' ? 'short' : r.status === 'edge' ? 'edge' : 'safe'] }}>
                                  {r.projectedPercent.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    triggerHaptic()
                                    setSimScope(c.key)
                                  }}
                                  className={`chip !py-0.5 !px-2 text-xs cursor-pointer border-2 border-[var(--border)] ${
                                    isCurrentScope
                                      ? '!bg-[var(--text)] !text-[var(--bg)] font-bold'
                                      : 'hover:border-[var(--text)] font-semibold'
                                  }`}
                                >
                                  {isCurrentScope ? 'ACTIVE' : 'SELECT'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="grid grid-cols-1 gap-2.5 md:hidden">
                    {allSubjectsRoadmap.map((c) => {
                      const r = c.roadmap
                      const isCurrentScope = simScope === c.key
                      return (
                        <div
                          key={c.key}
                          onClick={() => {
                            triggerHaptic()
                            setSimScope(c.key)
                          }}
                          className={`p-3 rounded border-2 cursor-pointer transition-all ${
                            isCurrentScope
                              ? 'border-[var(--text)] bg-[var(--surface-2)] shadow-hard-sm'
                              : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--text)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <span className="font-bold text-[var(--text)] text-sm block truncate">{c.name}</span>
                              {c.code ? <span className="font-mono text-xs text-[var(--muted)]">{c.code}</span> : null}
                            </div>
                            <span
                              className="chip !py-0.5 !px-2 text-xs font-black uppercase border border-[var(--border)] shrink-0"
                              style={{
                                background: !r.isAchievable ? 'var(--color-absent)' : r.neededToAttend === 0 ? 'var(--color-present)' : 'var(--surface-2)',
                                color: !r.isAchievable || r.neededToAttend === 0 ? 'var(--on-accent)' : 'var(--text)',
                              }}
                            >
                              {!r.isAchievable ? `SHORT ${r.deficit}` : r.neededToAttend === 0 ? 'SECURE' : `${r.neededToAttend}/${c.remaining} REQ`}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-xs py-1.5 border-t border-b border-[var(--border)] my-1.5">
                            <div>
                              <span className="t-meta muted block text-[0.65rem]">CURRENT</span>
                              <span className="font-bold text-[var(--text)]">
                                {c.tallyData.percent !== null ? `${Math.round(c.tallyData.percent)}%` : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="t-meta muted block text-[0.65rem]">CLASSES LEFT</span>
                              <span className="font-bold text-[var(--text)]">{c.remaining}</span>
                            </div>
                            <div>
                              <span className="t-meta muted block text-[0.65rem]">SAFE SKIPS</span>
                              <span className={`font-bold ${!r.isAchievable ? 'text-[var(--absent-ink)]' : 'text-[var(--present-ink)]'}`}>
                                {!r.isAchievable ? '0' : `+${r.skipsAllowed}`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-xs pt-1">
                            <span className="muted text-[0.7rem]">
                              {!r.isAchievable ? `Max possible: ${r.maxAchievablePercent.toFixed(1)}%` : `Final: ${r.projectedPercent.toFixed(1)}%`}
                            </span>
                            <span className={`text-[0.7rem] font-bold ${isCurrentScope ? 'text-[var(--text)] underline' : 'text-[var(--muted)]'}`}>
                              {isCurrentScope ? 'Selected Scope' : 'Tap to select'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </Panel>
        ) : null}

        {/* SETTINGS COLLAPSIBLE DRAWER */}
        {showSettings ? (
          <Panel className="board board-hard bg-[var(--surface-2)] pad-page border-2 border-[var(--border)] space-y-4">
            <h3 className="t-card-title flex items-center gap-2 text-[var(--text)]">
              <Settings2 className="icon-sm text-[var(--warn-ink)] shrink-0" />
              <span>ATTENDANCE & SEMESTER TRACKING SETTINGS</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Target Cutoff Percentage */}
              <Field label="REQUIRED ATTENDANCE (%)" id="rc-req">
                <div className="flex items-center gap-2">
                  <input
                    id="rc-req"
                    className="field !py-2 text-xs sm:text-sm font-semibold"
                    type="number"
                    min={1}
                    max={100}
                    value={requiredDraft}
                    onChange={(e) => setRequiredDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-go !py-2 !px-3.5 text-xs sm:text-sm font-bold shrink-0 cursor-pointer"
                    onClick={() => {
                      triggerHaptic()
                      const n = Number(requiredDraft)
                      if (Number.isFinite(n) && n > 0 && n <= 100) {
                        setSettings({ ...settings, required: Math.round(n) })
                      }
                    }}
                  >
                    SAVE
                  </button>
                </div>
              </Field>

              {/* Tracking Since Date */}
              <Field
                label="SEMESTER TRACKING START DATE"
                id="rc-since"
                hint="Classes before this date are ignored."
              >
                <div className="flex items-center gap-1.5">
                  <input
                    id="rc-since"
                    className="field !py-2 text-xs sm:text-sm font-semibold flex-1"
                    type="date"
                    value={since}
                    onChange={(e) => setSettings({ ...settings, trackingSince: e.target.value })}
                  />
                  <button
                    type="button"
                    className="chip !py-2 !px-2.5 text-xs font-bold border-2 border-[var(--border)] cursor-pointer hover:border-[var(--text)]"
                    onClick={() => {
                      triggerHaptic()
                      setSettings({ ...settings, trackingSince: '2026-07-27' })
                    }}
                    title="Reset to official semester start (27 Jul 2026)"
                  >
                    SEM START
                  </button>
                </div>
              </Field>

              {/* Mid-Semester Baseline Attendance */}
              <Field
                label="INITIAL BASELINE ATTENDANCE"
                id="rc-base-p"
                hint="If you started mid-semester, input past classes attended & held."
              >
                <div className="flex items-center gap-2">
                  <input
                    id="rc-base-p"
                    className="field !py-2 text-xs sm:text-sm font-semibold w-24"
                    type="number"
                    min={0}
                    placeholder="Attended"
                    value={basePresentDraft}
                    onChange={(e) => setBasePresentDraft(e.target.value)}
                  />
                  <span className="text-xs sm:text-sm text-[var(--muted)] font-bold">/</span>
                  <input
                    id="rc-base-h"
                    className="field !py-2 text-xs sm:text-sm font-semibold w-24"
                    type="number"
                    min={0}
                    placeholder="Held"
                    value={baseHeldDraft}
                    onChange={(e) => setBaseHeldDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-go !py-2 !px-3 text-xs sm:text-sm font-bold shrink-0 cursor-pointer"
                    onClick={() => {
                      triggerHaptic()
                      const p = Number(basePresentDraft) || 0
                      const h = Number(baseHeldDraft) || 0
                      setSettings({
                        ...settings,
                        baseAttendance: { present: p, held: Math.max(p, h) },
                      })
                    }}
                  >
                    SAVE
                  </button>
                </div>
              </Field>
            </div>

            {/* Reset All Data Emergency Button */}
            <div className="pt-2 border-t-2 border-[var(--border)] flex justify-end">
              <button
                type="button"
                className="btn !py-2 !px-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 text-[var(--disruption)] cursor-pointer"
                onClick={() => {
                  if (
                    confirm(
                      'Are you sure you want to RESET ALL attendance marks, baseline data, and logs? This cannot be undone.',
                    )
                  ) {
                    triggerHaptic(30)
                    clearAll()
                    setSettings({
                      ...settings,
                      baseAttendance: { present: 0, held: 0 },
                    })
                    setBasePresentDraft('')
                    setBaseHeldDraft('')
                  }
                }}
              >
                <Trash2 className="icon-micro shrink-0" /> RESET ALL ATTENDANCE LOGS
              </button>
            </div>
          </Panel>
        ) : null}

        {/* SUBJECT HEALTH FILTER BAR */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'ALL', label: `ALL (${courses.length})` },
            { key: 'SAFE', label: `🟢 SAFE (${subjectStats.safe})` },
            { key: 'EDGE', label: `⚠️ FINE (${subjectStats.edge})` },
            { key: 'AT_RISK', label: `🔴 RISK (${subjectStats.atRisk})` },
          ].map((f) => {
            const active = subjectFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  triggerHaptic(8)
                  setSubjectFilter(f.key)
                }}
                className={`chip !py-1.5 !px-3 text-xs uppercase tracking-wider cursor-pointer transition-all border-2 border-[var(--border)] ${
                  active
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] font-black shadow-hard-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text)] font-bold hover:border-[var(--text)]'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* COMPACT COLOR-CODED SUBJECT TILES (MATCHING MORE TOOLS PAGE) */}
        {filteredCourses.length === 0 ? (
          <EmptyState
            title={courses.length === 0 ? 'NO PUBLISHED SUBJECTS' : 'NO SUBJECTS IN THIS FILTER'}
            hint={
              courses.length === 0
                ? `No timetable uploaded for ${branchName(profile.branch)} Year ${year}. Add classes to your timetable board first.`
                : subjectFilter === 'ALL'
                  ? 'Add classes to your timetable board first.'
                  : 'No subjects match this status filter.'
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">
            {filteredCourses.map((c) => {
              const t = c.tallyData
              const customData = c.customData || allSubjectsStore[c.key] || allSubjectsStore[c.name] || {}
              const firstSession = c.sessions[0] || { type: c.type, name: c.name, code: c.code }
              const theme = getSubjectTheme({
                ...firstSession,
                ...customData,
                name: c.name,
                code: c.code,
                type: c.type,
                category: customData.category || firstSession.category,
              })
              const subjectAccent = customData.accent || firstSession.accent || theme.accent
              const instructorName = customData.instructor || firstSession.instructor || ''
              const categoryLabel = (customData.category || firstSession.category || theme.label || (c.type === 'lab' ? 'LAB' : 'THEORY')).toUpperCase()

              const effectiveCutoff = c.effectiveCutoff
              const skips = canSkip(t.present, t.held, effectiveCutoff)
              const recover = mustAttend(t.present, t.held, effectiveCutoff)

              let marginLabel = ''
              let marginColor = 'var(--muted)'

              if (effectiveCutoff === 0) {
                marginLabel = 'Exempt'
                marginColor = 'var(--muted)'
              } else if (t.percent === null) {
                marginLabel = `Target ${effectiveCutoff}%`
                marginColor = 'var(--muted)'
              } else if (t.percent >= effectiveCutoff) {
                marginLabel = `+${skips} safe ${skips === 1 ? 'skip' : 'skips'}`
                marginColor = c.status === 'edge' ? STATUS_INK.edge : STATUS_INK.safe
              } else {
                marginLabel = `Attend ${recover} more`
                marginColor = STATUS_INK.short
              }

              return (
                <Link
                  key={c.key}
                  to={`/subjects/${encodeURIComponent(c.key)}?tab=info`}
                  onClick={() => triggerHaptic(8)}
                  className="board board-hard group relative overflow-hidden flex flex-col justify-between transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 shadow-hard-sm hover:shadow-hard p-0 cursor-pointer min-h-[165px] sm:min-h-[180px]"
                >
                  {/* Top ~2/3: Color-coded Subject Identity */}
                  <div
                    className="relative overflow-hidden p-3 sm:p-4 flex flex-col justify-between flex-1 min-h-[95px] sm:min-h-[110px]"
                    style={{
                      background: subjectAccent,
                      color: 'var(--on-accent)',
                    }}
                  >
                    {/* Header row: Code/Category on left + Arrow on right */}
                    <div className="relative z-10 flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1 flex-wrap min-w-0 pr-1">
                        {c.code ? (
                          <span className="font-mono font-black text-[0.6rem] sm:text-xs px-1.5 py-0.5 rounded border border-current/25 bg-current/10 tracking-wider">
                            {c.code}
                          </span>
                        ) : null}
                        <span className="font-black text-[0.55rem] sm:text-[0.65rem] px-1.5 py-0.5 rounded border border-current/25 bg-current/10 tracking-wider uppercase">
                          {categoryLabel}
                        </span>
                      </div>

                      <span className="grid size-6 sm:size-7 shrink-0 place-items-center rounded-sm border border-current/25 bg-current/10 opacity-75 transition-all duration-150 group-hover:opacity-100 group-hover:scale-110">
                        <ArrowUpRight className="size-3.5 sm:icon-sm shrink-0" strokeWidth={2.5} aria-hidden />
                      </span>
                    </div>

                    {/* Subject Name & Instructor */}
                    <div className="relative z-10 mt-2 min-w-0">
                      <h3 className="t-card-title text-xs sm:text-sm md:text-base font-black leading-snug tracking-tight line-clamp-2" title={c.name}>
                        {c.name}
                      </h3>
                      {instructorName ? (
                        <p className="t-meta mt-0.5 opacity-85 uppercase tracking-wide text-[0.55rem] sm:text-[0.65rem] font-bold truncate">
                          {instructorName}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Bottom ~1/3: Neutral Attendance Status */}
                  <div className="relative z-10 bg-[var(--surface)] text-[var(--text)] border-t-2 border-[var(--border)] px-3 py-2.5 sm:px-3.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 shrink-0">
                    <Ring
                      percent={t.percent}
                      size={40}
                      strokeWidth={4.5}
                      color={STATUS_COLOR[c.status]}
                      textSize="text-[0.65rem] sm:text-[0.7rem] font-black"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm sm:text-base font-black uppercase tracking-tight text-[var(--text)] leading-tight truncate">
                        {t.percent === null ? 'NO LOGS' : `${t.present}/${t.held} ATTENDED`}
                      </div>
                      <div
                        className="text-[0.625rem] sm:text-xs font-bold uppercase tracking-wide truncate mt-0.5"
                        style={{ color: marginColor }}
                      >
                        {marginLabel}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* 📋 1-CLICK SHARE / COPY SUMMARY MODAL */}
        <Modal
          open={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          title="ATTENDANCE SUMMARY"
          sub={`Week ${semesterWeekInfo.currentWeek} of ${semesterWeekInfo.totalWeeks} · ${profile.branch} (Year ${year})`}
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="btn !py-2 !px-3 text-xs sm:text-sm font-bold uppercase tracking-wider cursor-pointer"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={handleCopySummary}
                className="btn btn-go !py-2 !px-4 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-hard-sm"
              >
                {copiedSummary ? <Check className="icon-micro shrink-0" strokeWidth={2.5} /> : <Copy className="icon-micro shrink-0" strokeWidth={2} />}
                <span>{copiedSummary ? 'COPIED TO CLIPBOARD!' : 'COPY TEXT'}</span>
              </button>
            </div>
          }
        >
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {/* Overall Stat Card */}
            <div className="pad-card rounded bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-between gap-3">
              <div>
                <span className="t-meta muted block">OVERALL SEMESTER</span>
                <p className="t-stat mt-0.5 text-[var(--text)]">
                  {overall.held === 0 ? '0/0' : `${overall.present}/${overall.held}`}
                  <span className="text-base sm:text-lg font-bold ml-2 text-[var(--muted)]">
                    ({overall.percent !== null ? `${overall.percent.toFixed(1)}%` : '—'})
                  </span>
                </p>
              </div>
              <span
                className="chip !py-1.5 !px-3 text-xs font-black border-2 border-[var(--border)]"
                style={{
                  background: STATUS_COLOR[overallStatus],
                  color: 'var(--on-accent)',
                }}
              >
                {overall.percent === null
                  ? 'NO LOGS'
                  : overallStatus === 'safe'
                    ? 'ABOVE CUTOFF'
                    : overallStatus === 'edge'
                      ? 'ON THE LINE'
                      : 'AT RISK'}
              </span>
            </div>

            {/* Subject Breakdown List */}
            <div className="space-y-2">
              <span className="t-meta muted block">SUBJECT BREAKDOWN</span>
              {subjectStats.list.length === 0 ? (
                <p className="t-meta muted">No subjects found on timetable.</p>
              ) : (
                subjectStats.list.map((c) => {
                  const t = c.tallyData
                  const st = c.status
                  const skips = canSkip(t.present, t.held, c.effectiveCutoff)
                  const recover = mustAttend(t.present, t.held, c.effectiveCutoff)
                  return (
                    <div
                      key={c.key}
                      className="pad-card rounded bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-xs sm:text-sm text-[var(--text)] truncate">{c.name}</span>
                          {c.code ? <span className="font-mono text-xs text-[var(--muted)]">&lt;{c.code}&gt;</span> : null}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5 font-medium">
                          <span>{t.present}/{t.held} attended</span>
                          <span>·</span>
                          <span>{t.percent !== null ? `${t.percent.toFixed(1)}%` : '—'}</span>
                          <span>·</span>
                          <span className="font-semibold" style={{ color: STATUS_INK[st] }}>
                            {t.percent === null
                              ? 'No logs'
                              : st === 'safe'
                                ? `+${skips} skips`
                                : `Need ${recover}`}
                          </span>
                        </div>
                      </div>

                      <span
                        className="chip !py-0.5 !px-2 text-[0.625rem] sm:text-xs font-black uppercase border-2 border-[var(--border)] shrink-0"
                        style={{
                          background: STATUS_COLOR[st],
                          color: 'var(--on-accent)',
                        }}
                      >
                        {st === 'safe' ? 'SAFE' : st === 'edge' ? 'LINE' : 'RISK'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </Modal>

        {/* SUBJECT EDIT MODAL */}
        <SubjectModal
          open={subjectModal.open}
          course={subjectModal.course}
          onClose={() => setSubjectModal({ open: false, course: null })}
          onSave={handleSaveSubject}
          onDelete={handleDeleteSubject}
        />

        {/* SESSION SLOT MODAL */}
        <SessionModal
          open={sessionModal.open}
          session={sessionModal.session}
          defaultDay={sessionModal.defaultDay}
          prefill={sessionModal.prefill}
          onClose={() => setSessionModal({ open: false, session: null, defaultDay: 'MON', prefill: null })}
          onSave={handleSaveSession}
          onDelete={handleDeleteSession}
        />
      </div>
    </Shell>
  )
}
