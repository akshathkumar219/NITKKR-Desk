import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Calculator,
  CalendarClock,
  Check,
  CheckCheck,
  ClipboardCheck,
  Clock,
  Copy,
  Flame,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import Shell from '../components/Shell'
import SessionModal from '../components/SessionModal'
import SubjectModal from '../components/SubjectModal'
import { EmptyState, Field, Meter, Modal, Panel, Ring } from '../ui'
import { useProfile, useRollcallSettings } from '../lib/storage'
import { coursesOf, filterSessionsByGroup, nextClassDay, sessionsForDay, useBoard } from '../lib/board'
import { getNoClassEvent } from '../data/info'
import {
  STATUS_COLOR,
  STATUS_INK,
  canSkip,
  mustAttend,
  simulateSkip,
  status,
  tally,
  useRollcall,
} from '../lib/rollcall'
import {
  DAY_NAMES,
  dayCode,
  fmtDateShort,
  fmtRange,
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

/* ------------------------------------------------------------- Mark Row -- */


function AttendanceRow({ session, mark, tallyData, required, onMark, onReset, onEditSession, currentMins, isToday = true, isNext = false }) {
  const [hoverSim, setHoverSim] = useState(null)
  const theme = getSubjectTheme(session)

  const isLive = isToday && session.start <= currentMins && currentMins < session.end
  const minsLeft = isLive ? Math.max(0, session.end - currentMins) : 0
  const effectiveCutoff = session.targetCutoff != null ? session.targetCutoff : required

  const presentCount = tallyData?.present ?? 0
  const heldCount = tallyData?.held ?? 0
  const actualPercent = tallyData?.percent != null ? Math.round(tallyData.percent) : null
  const st = status(tallyData?.percent ?? null, effectiveCutoff)

  // Hover Simulation
  let displayPercent = actualPercent
  let simDelta = 0
  let isSimulating = false
  let simStatus = st

  const credit = session.attendanceCredits != null
    ? Number(session.attendanceCredits)
    : (session.type === 'lab' || (session.name || '').toUpperCase().includes('LAB') ? 2 : 1)

  if (hoverSim === 'present') {
    isSimulating = true
    const nextPresent = mark === 'present' ? presentCount : presentCount + credit
    const nextHeld = mark === 'present' ? heldCount : mark === 'absent' ? heldCount : heldCount + credit
    displayPercent = nextHeld > 0 ? Math.round((nextPresent / nextHeld) * 100) : 100
    simDelta = actualPercent != null ? displayPercent - actualPercent : 0
    simStatus = status(displayPercent, effectiveCutoff)
  } else if (hoverSim === 'absent') {
    isSimulating = true
    const nextPresent = mark === 'present' ? Math.max(0, presentCount - credit) : presentCount
    const nextHeld = mark === 'absent' ? heldCount : mark === 'present' ? heldCount : heldCount + credit
    displayPercent = nextHeld > 0 ? Math.round((nextPresent / nextHeld) * 100) : 0
    simDelta = actualPercent != null ? displayPercent - actualPercent : 0
    simStatus = status(displayPercent, effectiveCutoff)
  }

  const skipsLeft = canSkip(presentCount, heldCount, effectiveCutoff)
  const recoverNeeded = mustAttend(presentCount, heldCount, effectiveCutoff)

  // Clean typographic metadata line (matching timetable page)
  const metaParts = [
    session.code,
    session.room ? `Room ${session.room}` : null,
    session.group ? `Grp ${session.group}` : null,
  ].filter(Boolean)

  return (
    <Panel
      className={`board board-hard bg-[var(--surface)] pad-card flex flex-col justify-between transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg border-l-4 sm:border-l-[6px] ${
        isLive
          ? '!border-[var(--color-present)] shadow-[0_0_18px_rgba(143,254,9,0.35)] ring-1 ring-[var(--color-present)]/60'
          : isNext
            ? '!border-[var(--color-amber)]/70 ring-1 ring-[var(--color-amber)]/30'
            : ''
      }`}
      style={{
        borderLeftColor: isLive ? 'var(--color-present)' : isNext ? 'var(--color-amber)' : theme.accent,
        backgroundColor: isNext ? 'color-mix(in srgb, var(--color-amber) 10%, var(--surface))' : undefined,
        minHeight: 200,
      }}
    >
      <div>
        {/* Unified Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Time & Type in a single sleek unified badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="px-2.5 py-1 text-[0.6rem] sm:text-xs font-bold rounded border-2 uppercase tracking-wider flex items-center gap-1.5 shadow-2xs"
              style={{
                background: theme.bgPill,
                color: theme.ink,
                borderColor: 'var(--border)',
              }}
            >
              <Clock className="icon-micro" strokeWidth={2.5} />
              <span>{fmtRange(session.start, session.end)}</span>
              <span className="opacity-40">·</span>
              <span>{theme.label}</span>
            </span>

            {credit >= 2 ? (
              <span className="px-2 py-1 text-[0.6rem] sm:text-xs rounded font-mono font-black tracking-wider border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--color-present)] shadow-2xs uppercase">
                {credit}× CREDITS
              </span>
            ) : null}

            {isLive ? (
              <span className="chip !py-0.5 !px-2 text-[0.6rem] sm:text-xs text-[var(--color-present)] flex items-center gap-1.5 border-2 border-[var(--color-present)] bg-[var(--color-present)]/10 font-black tracking-widest uppercase">
                <span className="relative flex size-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-present)] opacity-75" />
                  <span className="relative inline-flex rounded-full size-1.5 bg-[var(--color-present)]" />
                </span>
                <span>LIVE · {minsLeft}M</span>
              </span>
            ) : null}
          </div>

          {/* Sleek Attendance Gauge Pill / Badge */}
          <div className="relative group/circle shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 text-xs sm:text-sm font-extrabold tracking-tight transition-all shadow-xs ${
                isSimulating ? 'scale-105 ring-2 ring-[var(--border)] animate-pulse' : ''
              }`}
              style={{
                borderColor: 'var(--border-strong)',
                background:
                  displayPercent === null
                    ? 'var(--surface-2)'
                    : effectiveCutoff === 0
                      ? 'var(--color-teal)'
                      : simStatus === 'safe'
                        ? 'var(--color-present)'
                        : simStatus === 'edge'
                          ? 'var(--color-amber)'
                          : 'var(--color-absent)',
                color:
                  displayPercent === null
                    ? 'var(--muted)'
                    : 'var(--on-accent)',
              }}
              title={
                effectiveCutoff === 0
                  ? `Exempt / Optional Attendance (${actualPercent ?? 0}%)`
                  : isSimulating
                    ? `Simulated Preview: ${displayPercent}% (${simDelta >= 0 ? `+${simDelta}%` : `${simDelta}%`}) [Target: ${effectiveCutoff}%]`
                    : actualPercent === null
                      ? `Target Cutoff: ${effectiveCutoff}%`
                      : `${presentCount}/${heldCount} attended (${actualPercent}%) · Target: ${effectiveCutoff}%`
              }
            >
              <span>{displayPercent === null ? '—' : `${displayPercent}%`}</span>
              {isSimulating && simDelta !== 0 ? (
                <span className="text-[0.6rem] opacity-85">
                  ({simDelta > 0 ? `+${simDelta}%` : `${simDelta}%`})
                </span>
              ) : null}
            </span>
          </div>
        </div>

        {/* Course Title */}
        <h3 className="t-card-title mt-2.5 text-[var(--text)]" style={{ fontSize: 20 }}>
          {session.name}
        </h3>

        {/* Clean Typographic Metadata */}
        {metaParts.length > 0 ? (
          <p className="t-meta muted mt-1">
            {metaParts.join(' · ')}
          </p>
        ) : null}

        {/* Professor / Instructor Name */}
        {session.instructor ? (
          <p className="t-meta muted mt-0.5">
            {session.instructor}
          </p>
        ) : null}

        {/* Custom Note Reminder */}
        {session.note ? (
          <p className="t-meta mt-1.5 text-[var(--color-sky)]">
            📌 {session.note}
          </p>
        ) : null}

        {/* Clean 1-Line Status Context Line */}
        <div className="t-meta mt-2">
          {mark === 'present' ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--present-ink)] font-bold">
              <span className="size-1.5 rounded-full bg-[var(--color-present)]" />
              ATTENDED · {effectiveCutoff === 0 ? 'COURSE EXEMPT' : `${skipsLeft} SAFE SKIP${skipsLeft === 1 ? '' : 'S'} LEFT`}
            </span>
          ) : mark === 'absent' ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--absent-ink)] font-bold">
              <span className="size-1.5 rounded-full bg-[var(--color-absent)]" />
              BUNKED ·{' '}
              {effectiveCutoff === 0
                ? 'COURSE EXEMPT'
                : actualPercent != null && actualPercent < effectiveCutoff
                  ? `ATTEND ${recoverNeeded} IN A ROW`
                  : `${skipsLeft} SAFE SKIP${skipsLeft === 1 ? '' : 'S'} LEFT`}
            </span>
          ) : mark === 'cancelled' ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--warn-ink)] font-bold">
              <span className="size-1.5 rounded-full bg-[var(--color-amber)]" />
              CLASS CANCELLED · FREE SLOT
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[var(--muted)] font-semibold">
              <span className="size-1.5 rounded-full bg-[var(--border)]" />
              {effectiveCutoff === 0
                ? 'OPTIONAL COURSE (EXEMPT)'
                : actualPercent === null
                  ? `TARGET CUTOFF: ${effectiveCutoff}%`
                  : actualPercent >= effectiveCutoff
                    ? `${skipsLeft === 0 ? 'ON THE CUTOFF' : `${skipsLeft} SAFE SKIP${skipsLeft === 1 ? '' : 'S'} AVAILABLE`}`
                    : `ATTEND ${recoverNeeded} IN A ROW TO REACH ${effectiveCutoff}%`}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Segmented Action Strip */}
      <div className="mt-3 flex items-center rounded border-2 border-[var(--border-strong)] bg-[var(--surface-2)] p-0.5 shadow-xs overflow-hidden">
        <button
          type="button"
          className={`flex-1 py-1.5 text-[0.6875rem] sm:text-xs font-bold tracking-wider uppercase rounded flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
            mark === 'present'
              ? '!bg-[var(--color-present)] !text-[var(--on-accent)] shadow-xs font-extrabold border border-transparent'
              : 'text-[var(--present-ink)] bg-[var(--color-present)]/10 border border-[var(--color-present)]/30 hover:bg-[var(--color-present)]/20 hover:border-[var(--color-present)]/50'
          }`}
          onMouseEnter={() => setHoverSim('present')}
          onMouseLeave={() => setHoverSim(null)}
          onClick={(e) => {
            e.stopPropagation()
            setHoverSim(null)
            triggerHaptic(12)
            onMark(mark === 'present' ? null : 'present')
          }}
          title="Mark Present"
        >
          <Check className="icon-micro shrink-0" strokeWidth={2.5} /> <span className="truncate">PRESENT</span>
        </button>

        <div className="w-[1.5px] h-4 bg-[var(--border)] shrink-0 mx-0.5" />

        <button
          type="button"
          className={`flex-1 py-1.5 text-[0.6875rem] sm:text-xs font-bold tracking-wider uppercase rounded flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
            mark === 'absent'
              ? '!bg-[var(--color-absent)] !text-[var(--on-accent)] shadow-xs font-extrabold border border-transparent'
              : 'text-[var(--absent-ink)] bg-[var(--color-absent)]/10 border border-[var(--color-absent)]/30 hover:bg-[var(--color-absent)]/20 hover:border-[var(--color-absent)]/50'
          }`}
          onMouseEnter={() => setHoverSim('absent')}
          onMouseLeave={() => setHoverSim(null)}
          onClick={(e) => {
            e.stopPropagation()
            setHoverSim(null)
            triggerHaptic(14)
            onMark(mark === 'absent' ? null : 'absent')
          }}
          title="Mark Absent / Bunk"
        >
          <X className="icon-micro shrink-0" strokeWidth={2.5} /> <span className="truncate">ABSENT</span>
        </button>

        <div className="w-[1.5px] h-4 bg-[var(--border)] shrink-0 mx-0.5" />

        <button
          type="button"
          className={`py-1.5 px-2 text-[0.6875rem] sm:text-xs font-bold tracking-wider uppercase rounded flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            mark === 'cancelled'
              ? '!bg-[var(--color-cancelled)] !text-[var(--on-accent)] shadow-xs font-extrabold border border-transparent'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-transparent'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            setHoverSim(null)
            triggerHaptic(10)
            onMark(mark === 'cancelled' ? null : 'cancelled')
          }}
          title="Mark Class Cancelled"
        >
          <span className="truncate">CANCELLED</span>
        </button>

        <div className="w-[1.5px] h-4 bg-[var(--border)] shrink-0 mx-0.5" />

        <button
          type="button"
          disabled={!mark}
          className={`p-1.5 rounded flex items-center justify-center transition-all ${
            mark
              ? 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] cursor-pointer active:scale-95'
              : 'text-[var(--muted)]/40 opacity-40 cursor-not-allowed'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            setHoverSim(null)
            triggerHaptic(8)
            if (mark) onReset()
          }}
          title={mark ? 'Reset attendance mark' : 'No mark recorded yet'}
          aria-label="Reset attendance mark"
        >
          <RotateCcw className="icon-micro shrink-0" strokeWidth={2.5} />
        </button>
      </div>
    </Panel>
  )
}

function resolveTab(raw) {
  if (!raw) return 'SUBJECTS'
  const clean = decodeURIComponent(raw).trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (clean.includes('today') || clean.includes('daily')) return 'TODAY'
  return 'SUBJECTS'
}

/* ------------------------------------------------------------- Main Page -- */

export default function Attendance() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const rawRouteTab = params.tabKey || params['*'] || searchParams.get('tab') || searchParams.get('view')
  const initialTab = useMemo(() => resolveTab(rawRouteTab), [rawRouteTab])

  const { profile, year, group } = useProfile()
  const { sessions, addSession, removeSession, moveSession } = useBoard(profile.branch, year)
  const { marks, adjustments, setMark, markBatch, unmarkBatch, adjustSubject, getMark, clearAll } = useRollcall()
  const [settings, setSettings] = useRollcallSettings()

  const [tab, setTab] = useState(initialTab)

  // Sync tab with URL when route or query parameter changes; redirect legacy fix-a-day routes
  useEffect(() => {
    if (rawRouteTab) {
      const clean = decodeURIComponent(rawRouteTab).trim().toLowerCase().replace(/[\s_-]+/g, '')
      if (clean.includes('fix') || clean.includes('backfill')) {
        navigate('/timetable?view=calendar', { replace: true })
        return
      }
      setTab(resolveTab(rawRouteTab))
    }
  }, [rawRouteTab, navigate])

  const handleTabChange = (nextKey) => {
    triggerHaptic(8)
    setTab(nextKey)
    const targetPath = nextKey === 'TODAY' ? '/attendance/today' : '/attendance'
    if (location.pathname !== targetPath) {
      navigate(targetPath)
    }
  }

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
  const todayNoClass = useMemo(() => getNoClassEvent(iso), [iso])
  const todaySessions = useMemo(() => {
    if (todayNoClass) return []
    return sessionsForDay(effectiveSessions, today).filter((s) => s.type !== 'break')
  }, [effectiveSessions, today, todayNoClass])

  // Today's Detailed Marks Breakdown
  const todayMarks = useMemo(() => {
    let present = 0
    let absent = 0
    let cancelled = 0
    let unmarked = 0
    for (const s of todaySessions) {
      const m = getMark(iso, s.id)
      const credit = s.attendanceCredits != null
        ? Number(s.attendanceCredits)
        : (s.type === 'lab' || (s.name || '').toUpperCase().includes('LAB') ? 2 : 1)
      if (m === 'present') present += credit
      else if (m === 'absent') absent += credit
      else if (m === 'cancelled') cancelled += credit
      else unmarked += credit
    }
    const totalCredits = todaySessions.reduce((sum, s) => {
      const credit = s.attendanceCredits != null
        ? Number(s.attendanceCredits)
        : (s.type === 'lab' || (s.name || '').toUpperCase().includes('LAB') ? 2 : 1)
      return sum + credit
    }, 0)
    return {
      present,
      absent,
      cancelled,
      unmarked,
      total: totalCredits,
      marked: present + absent + cancelled,
    }
  }, [todaySessions, getMark, iso])

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
      const effCutoff = firstSession.targetCutoff != null ? firstSession.targetCutoff : required
      const st = status(t.percent, effCutoff)
      if (st === 'safe') safe += 1
      else if (st === 'edge') edge += 1
      else if (st === 'short') atRisk += 1
      else untracked += 1
      return { ...c, tallyData: t, status: st, effectiveCutoff: effCutoff }
    })
    return { safe, edge, atRisk, untracked, total: courses.length, list }
  }, [courses, marks, since, adjustments, required])

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

  // Tool 2: Goal Recovery for Active Scope
  const simGoalSkips = useMemo(() => {
    return canSkip(activeScopeData.present, activeScopeData.held, simGoalTarget)
  }, [activeScopeData, simGoalTarget])

  const simGoalAttend = useMemo(() => {
    return mustAttend(activeScopeData.present, activeScopeData.held, simGoalTarget)
  }, [activeScopeData, simGoalTarget])

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

  /* ------------------------------ Batch Handlers ------------------------------ */

  // Smart "Mark Remaining Present" or "Mark All Present"
  function handleSmartMarkPresent() {
    triggerHaptic(15)
    const unmarkedSessions = todaySessions.filter((s) => !getMark(iso, s.id))
    const entries = unmarkedSessions.map((s) => ({ iso, sessionId: s.id }))
    if (entries.length > 0) {
      markBatch(entries, 'present')
    }
  }

  function handleMarkAllTodayCancelled() {
    triggerHaptic(12)
    const entries = todaySessions.map((s) => ({ iso, sessionId: s.id }))
    markBatch(entries, 'cancelled')
  }

  function handleResetToday() {
    triggerHaptic(10)
    const entries = todaySessions.map((s) => ({ iso, sessionId: s.id }))
    unmarkBatch(entries)
  }

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
    const matchingSessions = sessions.filter((s) => (s.code || s.name) === courseKey)
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
    const matchingSessions = sessions.filter((s) => (s.code || s.name) === courseKey)
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

              {/* Today's Classes Column */}
              <div className="pl-4 lg:pl-6 pr-2">
                <span className="t-meta muted block">
                  TODAY'S LOG
                </span>
                <p className="t-stat mt-1 text-[var(--text)]">
                  {todayMarks.marked}/{todaySessions.length}
                </p>
                <p className="t-meta muted mt-0.5">
                  {todayMarks.present} Present · {todayMarks.absent} Absent
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
              <div className="pad-card rounded bg-[var(--surface)] border-2 border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="t-card-title text-[var(--text)] flex items-center gap-1.5">
                    <TrendingDown className="icon-sm text-[var(--absent-ink)] shrink-0" />
                    <span>TOOL 1: WHAT IF I BUNK CLASSES?</span>
                  </span>
                  <span className="chip !py-0.5 !px-2 text-xs font-bold border-2 border-[var(--border)]">
                    {simSkipCount} CLASS{simSkipCount === 1 ? '' : 'ES'}
                  </span>
                </div>

                <p className="t-body muted">
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

              {/* Tool 2: Goal Recovery Calculator */}
              <div className="pad-card rounded bg-[var(--surface)] border-2 border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="t-card-title text-[var(--text)] flex items-center gap-1.5">
                    <TrendingUp className="icon-sm text-[var(--present-ink)] shrink-0" />
                    <span>TOOL 2: TARGET GOAL RECOVERY</span>
                  </span>
                  <span className="chip !py-0.5 !px-2 text-xs font-bold border-2 border-[var(--border)]">
                    GOAL: {simGoalTarget}%
                  </span>
                </div>

                <p className="t-body muted">
                  Select your desired percentage to see how many consecutive classes you must attend.
                </p>

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

                {/* Target Goal Output Card */}
                <div className="p-3 rounded bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-between gap-3">
                  <div>
                    <span className="t-meta muted block">ACTION REQUIRED FOR {simGoalTarget}%</span>
                    <p className="t-stat mt-0.5 text-[var(--text)]">
                      {activeScopeData.percent !== null && activeScopeData.percent >= simGoalTarget ? (
                        <span className="text-[var(--present-ink)] font-bold">
                          ALREADY ON TRACK · {simGoalSkips} SKIPS
                        </span>
                      ) : (
                        <span className="text-[var(--warn-ink)] font-bold">
                          ATTEND {simGoalAttend} IN A ROW
                        </span>
                      )}
                    </p>
                  </div>
                  {activeScopeData.percent !== null && activeScopeData.percent >= simGoalTarget ? (
                    <ShieldCheck className="icon-lg text-[var(--present-ink)] shrink-0" />
                  ) : (
                    <Flame className="icon-lg text-[var(--warn-ink)] shrink-0" />
                  )}
                </div>
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

        {/* MODERN SEGMENTED PILL TABS */}
        <div className="p-1 rounded bg-[var(--surface-2)] border-2 border-[var(--border)] shrink-0 shadow-xs">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-1.5">
            {[
              { key: 'SUBJECTS', label: `SUBJECTS (${courses.length})` },
              { key: 'TODAY', label: todayNoClass ? 'TODAY (OFF)' : `TODAY (${todaySessions.length})` },
            ].map((t, i, arr) => {
              const active = tab === t.key
              // Hairline separator sits in the gap to the left of this tab, and
              // is hidden whenever it would touch the raised active pill.
              const divider = i > 0 && !active && tab !== arr[i - 1].key
              return (
                <div key={t.key} className="relative">
                  {divider ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-[3px] sm:-left-1 top-1/2 -translate-y-1/2 h-[45%] w-0.5 rounded-full bg-[var(--border)] opacity-50"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleTabChange(t.key)}
                    className={`btn w-full !py-2 sm:!py-2.5 !px-1 sm:!px-3 text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer font-bold text-center truncate ${

                      active
                        ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                        : 'bg-transparent text-[var(--text)] border-transparent shadow-none hover:bg-[var(--surface)] hover:border-[var(--border)]'
                    }`}
                  >
                    {t.label}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* TAB 1: TODAY VIEW */}
        {tab === 'TODAY' ? (
          <div className="space-y-3">
            {/* 📋 INTEGRATED TODAY'S SECTION HEADER & BATCH TOOLBAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="t-card-title text-[var(--text)]">
                  {todayNoClass ? `${todayNoClass.label} · NO CLASSES` : `${todaySessions.length} ${todaySessions.length === 1 ? 'CLASS' : 'CLASSES'} TODAY`}
                </h3>
                <span className="t-meta muted">·</span>
                <span className="t-meta text-[var(--present-ink)]">{todayMarks.present} Present</span>
                {todayMarks.absent > 0 ? (
                  <>
                    <span className="t-meta muted">·</span>
                    <span className="t-meta text-[var(--absent-ink)]">{todayMarks.absent} Absent</span>
                  </>
                ) : null}
                {todayMarks.cancelled > 0 ? (
                  <>
                    <span className="t-meta muted">·</span>
                    <span className="t-meta muted">{todayMarks.cancelled} Cancelled</span>
                  </>
                ) : null}
                {todayMarks.unmarked > 0 ? (
                  <>
                    <span className="t-meta muted">·</span>
                    <span className="t-meta text-[var(--warn-ink)]">{todayMarks.unmarked} Unmarked</span>
                  </>
                ) : null}
              </div>

              {/* 1-Click Action Controls */}
              {todaySessions.length > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 shrink-0 w-full sm:w-auto">
                  {todayMarks.unmarked > 0 ? (
                    <button
                      type="button"
                      onClick={handleSmartMarkPresent}
                      className="btn btn-go !py-1.5 !px-3 text-[0.6875rem] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold uppercase tracking-wider w-full sm:w-auto shadow-hard-sm"
                    >
                      <CheckCheck className="icon-micro shrink-0" strokeWidth={2.5} />
                      <span>
                        {todayMarks.marked > 0
                          ? `MARK REMAINING (${todayMarks.unmarked})`
                          : `MARK ALL (${todayMarks.unmarked})`}
                      </span>
                    </button>
                  ) : (
                    <span className="chip !py-1.5 !px-3 text-[0.6rem] sm:text-xs font-black uppercase tracking-widest bg-[var(--surface-2)] text-[var(--present-ink)] border-2 border-[var(--border)] flex items-center justify-center gap-1.5 w-full sm:w-auto">
                      <CheckCheck className="icon-micro shrink-0" strokeWidth={2.5} /> ALL LOGGED
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleMarkAllTodayCancelled}
                      className="btn !py-1.5 !px-2.5 text-[0.6875rem] sm:text-xs font-bold uppercase tracking-wider flex-1 sm:flex-initial flex items-center justify-center gap-1.5 cursor-pointer hover:border-[var(--color-cancelled)]"
                      title="Mark all classes today as cancelled"
                    >
                      <span>CANCEL ALL</span>
                    </button>

                    {todayMarks.marked > 0 ? (
                      <button
                        type="button"
                        onClick={handleResetToday}
                        className="btn !py-1.5 !px-2 text-[0.6875rem] sm:text-xs font-bold uppercase tracking-wider flex-1 sm:flex-initial flex items-center justify-center gap-1.5 cursor-pointer text-[var(--muted)] hover:text-[var(--text)]"
                        title="Reset today's attendance marks"
                        aria-label="Reset today's attendance marks"
                      >
                        <RotateCcw className="icon-micro shrink-0" strokeWidth={2.5} />
                        <span>RESET</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {/* List of Today's Sessions */}
            {todayNoClass ? (
              <div className="board board-hard bg-[var(--surface-2)] p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3 border-2 border-[var(--border)]">
                <span
                  className="chip !py-1 !px-3 text-xs font-black uppercase tracking-wider border-2 shadow-sm"
                  style={{
                    background: todayNoClass.isExam
                      ? 'var(--color-coral)'
                      : todayNoClass.isBreak
                        ? 'var(--color-acid)'
                        : 'var(--color-amber)',
                    color: '#111111',
                  }}
                >
                  {todayNoClass.category} · NO CLASSES
                </span>
                <h3 className="t-card-title text-xl sm:text-2xl font-black">{todayNoClass.label}</h3>
                <p className="t-body muted max-w-md text-xs sm:text-sm">
                  {todayNoClass.isExam
                    ? 'Examinations in progress. Regular teaching classes are suspended.'
                    : todayNoClass.isBreak
                      ? 'Academic break in progress. Attendance is not marked on break days.'
                      : 'Official holiday. No classes are held today.'}
                </p>
              </div>
            ) : todaySessions.length === 0 ? (
              <EmptyState
                title="NO CLASSES TODAY"
                hint={
                  nextClassDay(sessions)
                    ? `Next scheduled classes : ${DAY_NAMES[nextClassDay(sessions)]}`
                    : 'No sessions scheduled on this board.'
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {todaySessions.map((s) => {
                  const courseKey = s.code || s.name
                  const tallyData = tally(
                    marks,
                    courses.find((c) => c.key === courseKey)?.sessions || [s],
                    since,
                    adjustments[courseKey] || 0,
                  )
                  return (
                    <AttendanceRow
                      key={s.id}
                      session={s}
                      mark={getMark(iso, s.id)}
                      tallyData={tallyData}
                      required={required}
                      currentMins={currentMins}
                      isToday={true}
                      onMark={(m) => setMark(iso, s.id, m)}
                      onReset={() => setMark(iso, s.id, null)}
                      onEditSession={() => setSessionModal({ open: true, session: s, defaultDay: s.day, prefill: null })}
                    />
                  )
                })}
              </div>
            )}

            {/* Shortcut to Timetable Calendar */}
            <div className="mt-4 p-3 rounded bg-[var(--surface-2)] border-2 border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <CalendarClock className="icon-sm text-[var(--color-sky)] shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[var(--text)] uppercase tracking-wider">
                    Need to log or fix past days?
                  </p>
                  <p className="t-micro muted mt-0.5">
                    Browse your full timetable by date and backfill attendance marks directly.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10)
                  navigate('/timetable?view=calendar')
                }}
                className="btn !py-1.5 !px-3 text-xs font-bold uppercase tracking-wider cursor-pointer bg-[var(--surface)] text-[var(--text)] border-2 border-[var(--border)] hover:bg-[var(--surface-2)] shrink-0"
              >
                TIMETABLE CALENDAR →
              </button>
            </div>
          </div>
        ) : null}

        {/* TAB 2: ALL SUBJECTS BREAKDOWN */}
        {tab === 'SUBJECTS' ? (
          <div className="space-y-3">
            {/* Subject Health Filter Bar */}
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
                      active ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] font-black shadow-hard-sm' : 'bg-[var(--surface-2)] text-[var(--text)] font-bold hover:border-[var(--text)]'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>

            {filteredCourses.length === 0 ? (
              <EmptyState
                title={courses.length === 0 ? "NO PUBLISHED SUBJECTS" : "NO SUBJECTS IN THIS FILTER"}
                hint={courses.length === 0 ? `No timetable uploaded for ${branchName(profile.branch)} Year ${year}. Add classes to your timetable board first.` : (subjectFilter === 'ALL' ? 'Add classes to your timetable board first.' : 'No subjects match this status filter.')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCourses.map((c) => {
                  const t = c.tallyData
                  const st = c.status
                  const firstSession = c.sessions[0] || { type: c.type, name: c.name, code: c.code }
                  const theme = getSubjectTheme(firstSession)

                  const effectiveCutoff = c.effectiveCutoff
                  const skips = canSkip(t.present, t.held, effectiveCutoff)
                  const recover = mustAttend(t.present, t.held, effectiveCutoff)
                  const courseAdj = adjustments[c.key] || 0

                  return (
                    <Panel
                      key={c.key}
                      className="board board-hard bg-[var(--surface)] pad-card rounded-lg border-2 border-[var(--border)] border-l-4 sm:border-l-[6px] flex flex-col justify-between gap-3 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
                      style={{ borderLeftColor: theme.accent }}
                    >
                      <div className="space-y-2">
                        {/* Header: Course Details (Left) + Clean Percentage (Right) */}
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: Type Pill, Code, Room, Title & Instructor */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="px-2 py-0.5 text-[0.625rem] sm:text-xs font-bold rounded border-2 uppercase tracking-wider"
                                style={{ background: theme.bgPill, color: theme.ink, borderColor: 'var(--border)' }}
                              >
                                {theme.label}
                              </span>
                              {c.code ? (
                                <span className="font-mono text-xs sm:text-sm text-[var(--muted)] font-bold">
                                  &lt;{c.code}&gt;
                                </span>
                              ) : null}
                              {firstSession.room ? (
                                <span className="t-micro muted px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                                  {firstSession.room}
                                </span>
                              ) : null}
                              {effectiveCutoff !== required ? (
                                <span className="chip !py-0.5 !px-1.5 text-[0.6rem] sm:text-xs font-black uppercase tracking-widest bg-[var(--color-amber)] text-[var(--on-accent)] border border-[var(--border)]">
                                  CUTOFF {effectiveCutoff}%
                                </span>
                              ) : null}
                            </div>

                            <h3 className="t-card-title mt-1.5 text-[var(--text)] truncate" style={{ fontSize: 20 }}>
                              {c.name}
                            </h3>

                            {firstSession.instructor ? (
                              <p className="t-meta muted mt-0.5 truncate">
                                {firstSession.instructor}
                              </p>
                            ) : null}
                          </div>

                          {/* Right: Clean Percentage Display (No pill bubble) */}
                          <div className="flex flex-col items-end shrink-0">
                            <span
                              className="t-stat"
                              style={{ color: STATUS_INK[st] }}
                            >
                              {t.percent === null ? '—' : `${Math.round(t.percent)}%`}
                            </span>
                          </div>
                        </div>

                        {/* Middle Section: Progress Meter & Fraction Breakdown */}
                        <div>
                          <Meter percent={t.percent} color={STATUS_COLOR[st]} required={effectiveCutoff} />
                          <div className="mt-1 flex items-center justify-between t-meta muted">
                            <span className="text-[var(--text)] font-extrabold">
                              {t.percent === null ? 'NO CLASSES RECORDED' : `${t.present} OF ${t.held} ATTENDED`}
                              {t.cancelled > 0 ? ` · ${t.cancelled} CANCELLED` : ''}
                            </span>
                            <span>TARGET {effectiveCutoff}%</span>
                          </div>
                        </div>

                        {/* Row Above the Line: Status/Bunk Text (Left) + Adjust Stepper & Edit (Right) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          {/* Left: Pure status text without pill wrapper */}
                          <div className="t-body min-w-0">
                            {effectiveCutoff === 0 ? (
                              <span className="text-[var(--muted)] font-semibold">✨ Optional course · Attendance exempt</span>
                            ) : t.percent === null ? (
                              <span className="text-[var(--muted)] font-normal">Log a class to calculate status.</span>
                            ) : t.percent > effectiveCutoff ? (
                              <span className="text-[var(--present-ink)] font-bold">
                                {skips} safe {skips === 1 ? 'skip' : 'skips'} available
                              </span>
                            ) : t.percent >= effectiveCutoff - 10 ? (
                              <span className="text-[var(--warn-ink)] font-bold">
                                {recover === 0
                                  ? '0 safe skips available'
                                  : `Attend ${recover} more ${recover === 1 ? 'class' : 'classes'} to reach ${effectiveCutoff}%`}
                              </span>
                            ) : (
                              <span className="text-[var(--absent-ink)] font-bold">
                                {`Attend ${recover} more ${recover === 1 ? 'class' : 'classes'} to reach ${effectiveCutoff}%`}
                              </span>
                            )}
                          </div>

                          {/* Right: Adjust Stepper & Edit Button */}
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <div className="inline-flex items-center rounded border-2 border-[var(--border)] bg-[var(--surface-2)] p-0.5" title="Manual attendance adjustment (+/- classes)">
                              <button
                                type="button"
                                disabled={t.present <= 0}
                                onClick={() => {
                                  if (t.present <= 0) return
                                  triggerHaptic(10)
                                  adjustSubject(c.key, -1)
                                }}
                                className={`h-6 w-6 sm:h-7 sm:w-7 grid place-items-center rounded transition-colors font-bold ${
                                  t.present <= 0
                                    ? 'opacity-30 cursor-not-allowed text-[var(--muted)]'
                                    : 'hover:bg-[var(--surface)] cursor-pointer text-[var(--muted)] hover:text-[var(--text)]'
                                }`}
                                title={t.present <= 0 ? 'Cannot subtract below 0 attended classes' : 'Subtract 1 class attended'}
                                aria-label="Subtract 1 class attended"
                              >
                                <Minus className="icon-micro shrink-0" strokeWidth={2.5} />
                              </button>
                              <span className="text-[0.6875rem] sm:text-xs font-black px-1.5 min-w-[22px] text-center text-[var(--text)]">
                                {courseAdj > 0 ? `+${courseAdj}` : courseAdj}
                              </span>
                              <button
                                type="button"
                                disabled={t.held === 0 || t.present >= t.held}
                                onClick={() => {
                                  if (t.held === 0 || t.present >= t.held) return
                                  triggerHaptic(10)
                                  adjustSubject(c.key, 1)
                                }}
                                className={`h-6 w-6 sm:h-7 sm:w-7 grid place-items-center rounded transition-colors font-bold ${
                                  t.held === 0 || t.present >= t.held
                                    ? 'opacity-30 cursor-not-allowed text-[var(--muted)]'
                                    : 'hover:bg-[var(--surface)] cursor-pointer text-[var(--muted)] hover:text-[var(--text)]'
                                }`}
                                title={
                                  t.held === 0
                                    ? 'No classes recorded yet'
                                    : t.present >= t.held
                                      ? 'Cannot exceed total classes that happened'
                                      : 'Add 1 class attended'
                                }
                                aria-label="Add 1 class attended"
                              >
                                <Plus className="icon-micro shrink-0" strokeWidth={2.5} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic()
                                setSubjectModal({ open: true, course: c })
                              }}
                              className="btn !py-1 !px-2.5 text-[0.6875rem] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border-2 border-[var(--border)]"
                              style={{ background: theme.accent, color: theme.ink }}
                            >
                              <Pencil className="icon-micro shrink-0" strokeWidth={2.5} />
                              <span>EDIT</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Clean Timetable Slots spanning below the line */}
                      <div className="pt-2.5 border-t-2 border-[var(--border)] flex items-center gap-1.5 flex-wrap">
                        {c.sessions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic()
                              setSessionModal({ open: true, session: s, defaultDay: s.day, prefill: null })
                            }}
                            className="px-2.5 py-1 rounded bg-[var(--surface-2)] border-2 border-[var(--border)] text-[0.625rem] sm:text-xs font-bold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--text)] transition-all cursor-pointer flex items-center gap-1.5"
                            title="Click to edit timetable slot"
                          >
                            <span>{s.day} {fmtRange(s.start, s.end)}</span>
                            {s.room ? <span className="opacity-75 font-normal">({s.room})</span> : null}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic()
                            setSessionModal({
                              open: true,
                              session: null,
                              defaultDay: 'MON',
                              prefill: {
                                name: c.name,
                                code: c.code || '',
                                instructor: firstSession.instructor || '',
                                accent: firstSession.accent || '',
                                targetCutoff: String(effectiveCutoff),
                              },
                            })
                          }}
                          className="px-2 py-1 rounded border-2 border-dashed border-[var(--border)] text-[0.625rem] sm:text-xs font-black uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-all cursor-pointer flex items-center gap-1.5"
                          title="Add new weekly slot for this subject"
                        >
                          <Plus className="icon-micro shrink-0" strokeWidth={2.5} /> SLOT
                        </button>
                      </div>
                    </Panel>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}

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
