import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeftRight,
  ArrowRight,
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  GripVertical,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import Shell from '../components/Shell'
import SessionModal from '../components/SessionModal'
import { Panel } from '../ui'
import { SORTED_BRANCHES, YEARS, branchName } from '../data/campus'
import { baseTimetable, groupsFor } from '../data/timetables'
import { getNoClassEvent } from '../data/info'
import { useProfile, useRollcallSettings, useSwipeRollcall } from '../lib/storage'
import {
  coursesOf,
  filterSessionsByGroup,
  gridBounds,
  insertAutoBreaks,
  isLiveSession,
  nextSession,
  sessionsForDay,
  useBoard,
} from '../lib/board'
import { DAYS, dayCode, fmtDateShort, fmtRange, isoToDate, minutesNow, todayISO } from '../lib/time'
import { canSkip, markKey, mustAttend, status, tally, unmarkedSince, useRollcall } from '../lib/rollcall'
import { getSubjectTheme } from '../lib/palette'

function triggerHaptic(duration = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration)
    } catch {
      // Ignore vibration errors
    }
  }
}


/* -------------------------------------------------------------- Break Card -- */

function BreakCard({
  session,
  editing,
  isLive,
  _isNext,
  currentMins,
  onEdit,
  onDelete,
}) {
  const duration = Math.max(0, session.end - session.start)
  const minsLeft = isLive ? Math.max(0, session.end - currentMins) : 0
  const elapsedMins = isLive ? Math.max(0, currentMins - session.start) : 0
  const progressPercent = isLive && duration > 0 ? Math.min(100, Math.max(0, Math.round((elapsedMins / duration) * 100))) : 0

  const accentBg = session.accent || 'var(--color-violet)'

  const metaParts = [
    session.room ? `Location: ${session.room}` : null,
    session.note ? `Note: ${session.note}` : null,
  ].filter(Boolean)

  return (
    <Panel
      className={`board board-hard pad-card flex flex-col justify-between transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg relative overflow-hidden group/break !border-2 !border-[var(--border)] ${
        isLive
          ? 'ring-2 ring-[var(--color-present)] shadow-[0_0_24px_rgba(143,254,9,0.35)]'
          : ''
      }`}
      style={{
        backgroundColor: accentBg,
        color: 'var(--on-accent)',
      }}
    >
      {/* Decorative Large Background Watermark Icon */}
      <div
        className="pointer-events-none absolute -right-3 -bottom-3 opacity-20 text-[var(--on-accent)] transition-transform duration-300 group-hover/break:scale-110 select-none"
        aria-hidden
      >
        <Coffee size={170} strokeWidth={2} />
      </div>

      <div className="relative z-10">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Unified Time & Break Pill */}
            <span className="px-2.5 py-1 text-[0.6rem] sm:text-xs rounded border-2 border-[var(--border)] font-bold tracking-wider flex items-center gap-1.5 bg-[var(--surface)] text-[var(--text)] shadow-xs uppercase">
              <Clock className="icon-micro" strokeWidth={2.5} />
              <span>{fmtRange(session.start, session.end)}</span>
              <span className="opacity-40">·</span>
              <span>{session.type === 'break' ? 'BREAK' : session.type.toUpperCase()}</span>
            </span>

            {isLive ? (
              <span className="chip !py-0.5 !px-2 text-[0.6rem] sm:text-xs text-[var(--on-accent)] bg-[var(--color-present)] border-2 border-[var(--border)] font-black tracking-widest flex items-center gap-1.5 uppercase">
                <span className="relative flex size-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--on-accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full size-1.5 bg-[var(--on-accent)]" />
                </span>
                <span>LIVE · {minsLeft}M</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Break Title */}
        <h3 className="t-card-title mt-2.5 text-[var(--on-accent)]">
          {session.name || 'BREAK'}
        </h3>

        {/* Typographic Metadata (only shown when there's a room/note to say) */}
        {metaParts.length > 0 ? (
          <p className="t-meta mt-1 text-[var(--on-accent)]/85">
            {metaParts.join(' · ')}
          </p>
        ) : null}
      </div>

      {/* Bottom Footer Section */}
      <div className="relative z-10">
        {editing ? (
          <div className="mt-3 flex items-center justify-end gap-2 border-t-2 border-[var(--on-accent)]/30 pt-2.5">
            <button
              type="button"
              className="btn !py-1 !px-2.5 !text-xs flex items-center gap-1.5 !bg-[var(--surface)] text-[var(--disruption)] !border-2 !border-[var(--border)] cursor-pointer font-bold uppercase tracking-wider"
              onClick={() => onDelete(session.id)}
            >
              <Trash2 className="icon-micro" /> DELETE
            </button>
            <button
              type="button"
              className="btn !py-1 !px-2.5 !text-xs flex items-center gap-1.5 !bg-[var(--surface)] text-[var(--text)] !border-2 !border-[var(--border)] cursor-pointer font-bold uppercase tracking-wider"
              onClick={() => onEdit(session)}
            >
              <Pencil className="icon-micro" /> EDIT
            </button>
          </div>
        ) : isLive ? (
          <div className="mt-3 pt-2.5 border-t-2 border-[var(--on-accent)]/30">
            <div className="t-card-title mb-1.5 text-[var(--on-accent)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="relative flex size-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--on-accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full size-1.5 bg-[var(--on-accent)]" />
                </span>
                RECESS IN PROGRESS
              </span>
              <span className="font-mono">{minsLeft}M REMAINING</span>
            </div>
            <div className="h-2 w-full bg-[var(--surface)]/40 border-2 border-[var(--border)] rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full bg-[var(--on-accent)] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}

/* --------------------------------------------------------------- Day Card -- */

function SessionCard({
  session,
  mark,
  tallyData,
  defaultRequired = 65,
  onEdit,
  onDelete,
  onMark,
  onResetMark,
  editing,
  isLive,
  isNext,
  currentMins,
  swipeMode = false,
}) {
  const [hoverSim, setHoverSim] = useState(null) // 'present' | 'absent' | null
  const [dragX, setDragX] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const touchStartRef = useRef({ x: 0, y: 0 })
  const dragXRef = useRef(0)
  const isSwipingRef = useRef(false)
  const directionRef = useRef(null) // null | 'horizontal' | 'vertical'
  const hasFiredHaptic = useRef(false)
  const mouseCleanupRef = useRef(null)

  const theme = getSubjectTheme(session)

  // Per-subject target cutoff override (if customized) or institute default
  const effectiveCutoff = session.targetCutoff != null ? session.targetCutoff : defaultRequired

  const presentCount = tallyData?.present ?? 0
  const heldCount = tallyData?.held ?? 0
  const actualPercent = tallyData?.percent != null ? Math.round(tallyData.percent) : null
  const st = status(tallyData?.percent ?? null, effectiveCutoff)

  // Reset all drag state whenever swipeMode, mark, editing, or session changes
  useEffect(() => {
    if (mouseCleanupRef.current) {
      mouseCleanupRef.current()
      mouseCleanupRef.current = null
    }
    setDragX(0)
    dragXRef.current = 0
    isSwipingRef.current = false
    directionRef.current = null
    hasFiredHaptic.current = false
    setIsAnimating(false)
  }, [swipeMode, mark, editing, session.id])

  useEffect(() => {
    return () => {
      if (mouseCleanupRef.current) {
        mouseCleanupRef.current()
        mouseCleanupRef.current = null
      }
    }
  }, [])

  const finishDrag = () => {
    if (!isSwipingRef.current) return
    isSwipingRef.current = false
    const THRESHOLD = 65
    const finalX = dragXRef.current
    const wasHorizontal = directionRef.current === 'horizontal'

    dragXRef.current = 0
    directionRef.current = null
    hasFiredHaptic.current = false
    setIsAnimating(true)
    setDragX(0)

    if (wasHorizontal) {
      if (finalX >= THRESHOLD) {
        triggerHaptic(20)
        onMark(session.id, 'present')
      } else if (finalX <= -THRESHOLD) {
        triggerHaptic(20)
        onMark(session.id, 'absent')
      }
    }
  }

  const cancelDrag = () => {
    if (!isSwipingRef.current) return
    isSwipingRef.current = false
    dragXRef.current = 0
    directionRef.current = null
    hasFiredHaptic.current = false
    setIsAnimating(true)
    setDragX(0)
  }

  // Gesture handling
  const handleTouchStart = (e) => {
    if (!swipeMode || editing) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    dragXRef.current = 0
    isSwipingRef.current = true
    directionRef.current = null
    hasFiredHaptic.current = false
    setIsAnimating(false)
  }

  const handleTouchMove = (e) => {
    if (!isSwipingRef.current || !swipeMode || editing) return
    const touch = e.touches[0]
    const diffX = touch.clientX - touchStartRef.current.x
    const diffY = touch.clientY - touchStartRef.current.y

    if (directionRef.current === null) {
      if (Math.abs(diffY) > 8 && Math.abs(diffY) > Math.abs(diffX)) {
        directionRef.current = 'vertical'
        return
      }
      if (Math.abs(diffX) > 8 && Math.abs(diffX) > Math.abs(diffY)) {
        directionRef.current = 'horizontal'
      } else {
        return
      }
    }

    if (directionRef.current === 'horizontal') {
      let nextX = diffX
      const maxDist = 120
      if (Math.abs(nextX) > maxDist) {
        nextX = Math.sign(nextX) * (maxDist + (Math.abs(nextX) - maxDist) * 0.25)
      }
      dragXRef.current = nextX
      setDragX(nextX)

      const THRESHOLD = 65
      if (Math.abs(nextX) >= THRESHOLD && !hasFiredHaptic.current) {
        hasFiredHaptic.current = true
        triggerHaptic(14)
      } else if (Math.abs(nextX) < THRESHOLD && hasFiredHaptic.current) {
        hasFiredHaptic.current = false
      }
    }
  }

  const handleTouchEnd = () => {
    finishDrag()
  }

  const handleTouchCancel = () => {
    cancelDrag()
  }

  const handleMouseDown = (e) => {
    if (!swipeMode || editing || e.button !== 0) return
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return

    if (mouseCleanupRef.current) {
      mouseCleanupRef.current()
      mouseCleanupRef.current = null
    }

    e.preventDefault()
    touchStartRef.current = { x: e.clientX, y: e.clientY }
    dragXRef.current = 0
    isSwipingRef.current = true
    directionRef.current = null
    hasFiredHaptic.current = false
    setIsAnimating(false)

    const onMouseMove = (moveEv) => {
      if (!isSwipingRef.current) return
      const diffX = moveEv.clientX - touchStartRef.current.x
      const diffY = moveEv.clientY - touchStartRef.current.y

      if (directionRef.current === null) {
        if (Math.abs(diffX) > 6 && Math.abs(diffX) > Math.abs(diffY)) {
          directionRef.current = 'horizontal'
        } else if (Math.abs(diffY) > 6) {
          directionRef.current = 'vertical'
          return
        }
      }

      if (directionRef.current === 'horizontal') {
        let nextX = diffX
        const maxDist = 120
        if (Math.abs(nextX) > maxDist) {
          nextX = Math.sign(nextX) * (maxDist + (Math.abs(nextX) - maxDist) * 0.25)
        }
        dragXRef.current = nextX
        setDragX(nextX)

        const THRESHOLD = 65
        if (Math.abs(nextX) >= THRESHOLD && !hasFiredHaptic.current) {
          hasFiredHaptic.current = true
          triggerHaptic(14)
        } else if (Math.abs(nextX) < THRESHOLD && hasFiredHaptic.current) {
          hasFiredHaptic.current = false
        }
      }
    }

    const onMouseUp = () => {
      if (mouseCleanupRef.current) {
        mouseCleanupRef.current()
        mouseCleanupRef.current = null
      }
      finishDrag()
    }

    const onBlur = () => {
      if (mouseCleanupRef.current) {
        mouseCleanupRef.current()
        mouseCleanupRef.current = null
      }
      cancelDrag()
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', onBlur)

    mouseCleanupRef.current = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', onBlur)
    }
  }

  // Bunk Simulator Ghost Percentage calculation on button hover or swipe drag
  let displayPercent = actualPercent
  let simDelta = 0
  let isSimulating = false
  let simStatus = st

  const credit =
    session.attendanceCredits != null && session.attendanceCredits !== 2
      ? Number(session.attendanceCredits)
      : 1

  const dragSim = swipeMode && !editing ? (dragX > 25 ? 'present' : dragX < -25 ? 'absent' : null) : null
  const effectiveSim = hoverSim || dragSim

  if (effectiveSim === 'present') {
    isSimulating = true
    const nextPresent = mark === 'present' ? presentCount : presentCount + credit
    const nextHeld = mark === 'present' ? heldCount : mark === 'absent' ? heldCount : heldCount + credit
    displayPercent = nextHeld > 0 ? Math.round((nextPresent / nextHeld) * 100) : 100
    simDelta = actualPercent != null ? displayPercent - actualPercent : 0
    simStatus = status(displayPercent, effectiveCutoff)
  } else if (effectiveSim === 'absent') {
    isSimulating = true
    const nextPresent = mark === 'present' ? Math.max(0, presentCount - credit) : presentCount
    const nextHeld = mark === 'absent' ? heldCount : mark === 'present' ? heldCount : heldCount + credit
    displayPercent = nextHeld > 0 ? Math.round((nextPresent / nextHeld) * 100) : 0
    simDelta = actualPercent != null ? displayPercent - actualPercent : 0
    simStatus = status(displayPercent, effectiveCutoff)
  }

  const minsLeft = isLive ? Math.max(0, session.end - currentMins) : 0
  const skipsLeft = canSkip(presentCount, heldCount, effectiveCutoff)
  const recoverNeeded = mustAttend(presentCount, heldCount, effectiveCutoff)

  // Clean typographic metadata line
  const metaParts = [
    session.code,
    session.room ? `Room ${session.room}` : null,
    session.group ? `Grp ${session.group}` : null,
  ].filter(Boolean)

  const cardContent = (
    <>
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
      {editing ? (
        <div className="mt-3 flex items-center justify-end gap-2 border-t-2 border-[var(--border)] pt-2.5">
          <button
            type="button"
            className="btn !py-1 !px-2.5 !text-xs flex items-center gap-1.5 text-[var(--disruption)] cursor-pointer font-bold tracking-wider uppercase"
            onClick={() => onDelete(session.id)}
          >
            <Trash2 className="icon-micro" /> DELETE
          </button>
          <button
            type="button"
            className="btn !py-1 !px-2.5 !text-xs flex items-center gap-1.5 cursor-pointer font-bold tracking-wider uppercase"
            onClick={() => onEdit(session)}
          >
            <Pencil className="icon-micro" /> EDIT
          </button>
        </div>
      ) : swipeMode ? (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)]/70 pt-2.5">
          {/* Direction Hint */}
          <div className="flex items-center gap-1.5 text-[0.625rem] sm:text-xs font-bold uppercase tracking-wider text-[var(--muted)] select-none">
            <ArrowLeftRight className="icon-micro shrink-0 opacity-70" />
            <span className="hidden xs:inline">SWIPE:</span>
            <span className="text-[var(--color-absent)] font-black">← BUNK</span>
            <span className="opacity-40">·</span>
            <span className="text-[var(--color-present)] font-black">ATTEND →</span>
          </div>

          {/* Cancel button & Reset */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              className={`py-1 px-2.5 text-[0.6875rem] sm:text-xs font-bold tracking-wider uppercase rounded flex items-center gap-1 transition-all active:scale-95 cursor-pointer border ${
                mark === 'cancelled'
                  ? '!bg-[var(--color-cancelled)] !text-[var(--on-accent)] shadow-xs border-transparent font-extrabold'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                setHoverSim(null)
                onMark(session.id, mark === 'cancelled' ? null : 'cancelled')
              }}
              title={mark === 'cancelled' ? 'Unmark cancelled' : 'Mark class cancelled'}
            >
              <span className="truncate">CANCELLED</span>
            </button>

            <button
              type="button"
              disabled={!mark}
              className={`p-1 rounded flex items-center justify-center transition-all ${
                mark
                  ? 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer active:scale-95'
                  : 'text-[var(--muted)]/30 opacity-30 cursor-not-allowed'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                setHoverSim(null)
                if (mark) onResetMark(session.id)
              }}
              title={mark ? 'Reset attendance mark' : 'No mark recorded yet'}
              aria-label="Reset attendance mark"
            >
              <RotateCcw className="icon-micro shrink-0" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ) : (
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
              onMark(session.id, mark === 'present' ? null : 'present')
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
              onMark(session.id, mark === 'absent' ? null : 'absent')
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
              onMark(session.id, mark === 'cancelled' ? null : 'cancelled')
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
              if (mark) onResetMark(session.id)
            }}
            title={mark ? 'Reset attendance mark' : 'No mark recorded yet'}
            aria-label="Reset attendance mark"
          >
            <RotateCcw className="icon-micro shrink-0" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </>
  )

  if (swipeMode && !editing) {
    return (
      <div
        className={`board board-hard relative overflow-hidden rounded select-none ${
          isLive
            ? '!border-[var(--color-present)] shadow-[0_0_18px_rgba(143,254,9,0.35)] ring-1 ring-[var(--color-present)]/60'
            : isNext
              ? '!border-[var(--color-amber)]/70 ring-1 ring-[var(--color-amber)]/30'
              : ''
        }`}
        style={{
          minHeight: 200,
          borderLeftColor: isLive ? 'var(--color-present)' : isNext ? 'var(--color-amber)' : theme.accent,
          backgroundColor: 'var(--surface)',
        }}
      >
        {/* Green Present Underlay (Revealed on Swipe Right) - Only the bigger icon */}
        <div
          className="absolute inset-0 bg-[var(--color-present)] flex items-center justify-start pl-7 sm:pl-8 text-black select-none pointer-events-none transition-opacity duration-150"
          style={{ opacity: dragX > 5 ? 1 : 0 }}
        >
          <div
            className={`transition-all duration-150 flex items-center justify-center ${
              dragX >= 65 ? 'scale-125 text-black' : 'scale-90 opacity-70'
            }`}
          >
            <Check className="size-8 sm:size-9 shrink-0" strokeWidth={3.5} />
          </div>
        </div>

        {/* Red Absent Underlay (Revealed on Swipe Left) - Only the bigger icon */}
        <div
          className="absolute inset-0 bg-[var(--color-absent)] flex items-center justify-end pr-7 sm:pr-8 text-white select-none pointer-events-none transition-opacity duration-150"
          style={{ opacity: dragX < -5 ? 1 : 0 }}
        >
          <div
            className={`transition-all duration-150 flex items-center justify-center ${
              dragX <= -65 ? 'scale-125 text-white' : 'scale-90 opacity-70'
            }`}
          >
            <X className="size-8 sm:size-9 shrink-0" strokeWidth={3.5} />
          </div>
        </div>

        {/* Front Sliding Card Face */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onMouseDown={handleMouseDown}
          onDragStart={(e) => e.preventDefault()}
          onTransitionEnd={() => setIsAnimating(false)}
          className={`bg-[var(--surface)] pad-card flex flex-col justify-between h-full border-l-4 sm:border-l-[6px] select-none cursor-grab active:cursor-grabbing ${
            isLive
              ? '!border-l-[var(--color-present)]'
              : isNext
                ? '!border-l-[var(--color-amber)]'
                : ''
          }`}
          style={{
            borderLeftColor: isLive ? 'var(--color-present)' : isNext ? 'var(--color-amber)' : theme.accent,
            backgroundColor: isNext ? 'color-mix(in srgb, var(--color-amber) 10%, var(--surface))' : 'var(--surface)',
            minHeight: 200,
            transform: `translateX(${dragX}px)`,
            transition: isAnimating ? 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
            touchAction: 'pan-y',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {cardContent}
        </div>
      </div>
    )
  }

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
      {cardContent}
    </Panel>
  )
}

/* -------------------------------------------------------------- Week Grid -- */

/**
 * Computes ISO date for a weekday in the active week
 */
function getIsoForWeekday(targetDay) {
  const now = new Date()
  const currentDay = dayCode(now)
  if (targetDay === currentDay) return todayISO(now)

  const currentDayIndex = (now.getDay() + 6) % 7
  const targetDayIndex = DAYS.indexOf(targetDay)
  if (targetDayIndex === -1) return todayISO(now)

  const targetDate = new Date(now)
  let diff = targetDayIndex - currentDayIndex
  // On weekends (Sat=5, Sun=6), viewing Mon-Fri refers to upcoming week
  if (currentDayIndex >= 5 && targetDayIndex < 5) {
    diff = 7 - currentDayIndex + targetDayIndex
  }
  targetDate.setDate(now.getDate() + diff)
  return todayISO(targetDate)
}

function WeekGrid({
  sessions,
  editing,
  onEdit,
  onDrop,
  onAddDay,
  currentMins = 0,
  today = 'MON',
  activeDay = 'MON',
  onJumpToDay,
}) {
  const containerRef = useRef(null)
  const hasAutoScrolled = useRef(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const [focusedDay, setFocusedDay] = useState(() =>
    DAYS.includes(activeDay) ? activeDay : DAYS.includes(today) ? today : 'MON'
  )
  const [selectedSession, setSelectedSession] = useState(null)

  // Measure container width for exact 3-column sizing on mobile
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const updateWidth = () => {
      if (el) setContainerWidth(el.clientWidth)
    }
    updateWidth()

    const ro = new ResizeObserver(updateWidth)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Time bounds calculation (snapped 8 AM to 6 PM minimum or up to latest class)
  const { from, to, hours } = useMemo(() => {
    const minFrom = 8 * 60 // 8:00 AM
    const minTo = 18 * 60 // 6:00 PM
    if (!sessions.length) {
      const hrs = []
      for (let h = minFrom; h <= minTo; h += 60) hrs.push(h)
      return { from: minFrom, to: minTo, hours: hrs }
    }
    const maxEnd = Math.max(...sessions.map((s) => s.end || 0))
    const minStart = Math.min(...sessions.map((s) => s.start || minFrom))
    const fromHour = Math.min(minFrom, Math.floor(minStart / 60) * 60)
    const toHour = Math.max(minTo, Math.ceil(maxEnd / 60) * 60)
    const hrs = []
    for (let h = fromHour; h <= toHour; h += 60) hrs.push(h)
    return { from: fromHour, to: toHour, hours: hrs }
  }, [sessions])

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
  const visibleCols = isDesktop || containerWidth >= 480 ? 5 : 3
  const pxPerMin = isDesktop ? 0.72 : 0.8
  const span = Math.max(to - from, 60)
  const gridHeight = span * pxPerMin + 16
  const hourRailWidth = 38

  const colWidth = useMemo(() => {
    if (!containerWidth) return 112
    return Math.max(80, Math.floor((containerWidth - hourRailWidth) / visibleCols))
  }, [containerWidth, hourRailWidth, visibleCols])

  // Center on a given day column
  const scrollToDay = useCallback(
    (targetDay, smooth = true) => {
      if (!containerRef.current || !containerWidth) return
      const targetIdx = DAYS.indexOf(targetDay)
      if (targetIdx === -1) return

      if (visibleCols === 5) {
        containerRef.current.scrollTo({ left: 0, behavior: smooth ? 'smooth' : 'auto' })
        return
      }

      const clampIndex = Math.max(0, Math.min(2, targetIdx - 1))
      const targetScrollLeft = clampIndex * colWidth

      containerRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: smooth ? 'smooth' : 'auto',
      })
      setFocusedDay(targetDay)
    },
    [containerWidth, colWidth, visibleCols],
  )

  // Track scroll position to update focused day pill
  const handleScroll = () => {
    if (!containerRef.current || visibleCols === 5) return
    const scrollLeft = containerRef.current.scrollLeft
    const centerOffset = scrollLeft + colWidth * 1.5
    const idx = Math.max(0, Math.min(4, Math.floor(centerOffset / colWidth)))
    if (DAYS[idx] && DAYS[idx] !== focusedDay) {
      setFocusedDay(DAYS[idx])
    }
  }

  // Initial Auto-scroll: today in the center and scrolled to top only
  useEffect(() => {
    if (containerWidth > 0 && !hasAutoScrolled.current) {
      hasAutoScrolled.current = true
      const initialDay = DAYS.includes(today) ? today : DAYS.includes(activeDay) ? activeDay : 'MON'
      scrollToDay(initialDay, false)

      if (containerRef.current) {
        containerRef.current.scrollTop = 0
      }
    }
  }, [containerWidth, today, activeDay, scrollToDay])

  // Pre-calculate sessions for each day (with auto-breaks only when not editing)
  const daySessionsMap = useMemo(() => {
    const map = {}
    for (const d of DAYS) {
      const list = sessionsForDay(sessions, d)
      map[d] = editing ? list : insertAutoBreaks(list)
    }
    return map
  }, [sessions, editing])

  const todayNoClass = useMemo(() => getNoClassEvent(todayISO()), [])

  return (
    <Panel className="board board-hard bg-[var(--surface)] overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Top Header Bar */}
      <div className="t-meta muted border-b-2 border-[var(--border)] px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shrink-0">
        <span className="truncate">
          WEEK GRID · {sessions.length} BLOCKS ·{' '}
          {editing ? 'DRAG A BLOCK TO RESCHEDULE' : 'TAP A CLASS FOR DETAILS'}
        </span>
      </div>

      {/* Holiday / Exam Notice Banner */}
      {todayNoClass && (
        <div className="mx-2 mt-2 px-2.5 py-1 text-[0.6875rem] font-bold rounded border flex items-center justify-between shrink-0 bg-[var(--surface-2)] border-[var(--border)]">
          <span className="truncate">
            TODAY: <span className="font-extrabold">{todayNoClass.label}</span>
          </span>
          <span
            className="chip !py-0.2 !px-1.5 text-[0.6rem] font-black uppercase shrink-0"
            style={{
              background: todayNoClass.isExam
                ? 'var(--color-coral)'
                : todayNoClass.isBreak
                  ? 'var(--color-acid)'
                  : 'var(--color-amber)',
              color: '#111111',
            }}
          >
            {todayNoClass.category}
          </span>
        </div>
      )}

      {/* Matrix Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-auto bg-[var(--surface)] min-h-0 select-none touch-pan-x touch-pan-y no-scrollbar"
        style={{
          scrollSnapType: visibleCols === 3 ? 'x proximity' : 'none',
          scrollPaddingLeft: `${hourRailWidth}px`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              visibleCols === 5
                ? `${hourRailWidth}px repeat(5, minmax(0, 1fr))`
                : `${hourRailWidth}px repeat(5, ${colWidth}px)`,
            width: visibleCols === 5 ? '100%' : `${hourRailWidth + colWidth * 5}px`,
            minHeight: `${gridHeight + 32}px`,
          }}
        >
          {/* Top-Left Corner Cell */}
          <div
            className="sticky top-0 left-0 z-40 bg-[var(--surface-2)] border-b-2 border-r-2 border-[var(--border)] flex items-center justify-center h-8"
            aria-hidden="true"
          >
            <Clock size={12} className="muted opacity-70" />
          </div>

          {/* Sticky Day Column Headers */}
          {DAYS.map((d) => {
            const isToday = d === today
            const isFocused = d === focusedDay
            const dNoClass = getNoClassEvent(getIsoForWeekday(d))

            return (
              <div
                key={`header-${d}`}
                onClick={() => scrollToDay(d, true)}
                className={`sticky top-0 z-20 h-8 bg-[var(--surface-2)] border-b-2 border-r-2 border-[var(--border)] flex items-center justify-center gap-1.5 px-1 cursor-pointer transition-colors ${
                  isToday
                    ? 'bg-[var(--color-present)]/10 font-black'
                    : isFocused
                      ? 'bg-[var(--surface)] font-extrabold'
                      : 'font-bold'
                }`}
                style={{ scrollSnapAlign: 'start' }}
              >
                <span className="text-xs sm:text-[0.8125rem] tracking-wider">{d}</span>
                {isToday ? (
                  <span className="relative flex size-1.5 shrink-0" title="Today">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-present)] opacity-75" />
                    <span className="relative inline-flex rounded-full size-1.5 bg-[var(--color-present)]" />
                  </span>
                ) : dNoClass ? (
                  <span
                    className="size-1.5 rounded-full shrink-0"
                    title={dNoClass.label}
                    style={{
                      background: dNoClass.isExam
                        ? 'var(--color-coral)'
                        : dNoClass.isBreak
                          ? 'var(--color-acid)'
                          : 'var(--color-amber)',
                    }}
                  />
                ) : null}
                {editing ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddDay(d)
                    }}
                    className="grid size-4 sm:size-5 place-items-center border-2 border-[var(--border)] cursor-pointer ml-0.5"
                    style={{ background: 'var(--color-acid)', borderRadius: 2, color: 'var(--on-accent)' }}
                    aria-label={`Add session on ${d}`}
                  >
                    <Plus className="icon-micro" strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>
            )
          })}

          {/* Sticky Left Hour Rail */}
          <div
            className="sticky left-0 z-30 bg-[var(--surface-2)] border-r-2 border-[var(--border)] relative"
            style={{ height: gridHeight }}
          >
            {hours.map((h) => {
              const hourNum = (Math.floor(h / 60) % 12) || 12
              const ampm = Math.floor(h / 60) < 12 ? 'A' : 'P'
              return (
                <div
                  key={`hour-${h}`}
                  className="absolute right-1 text-[9.5px] sm:text-[10px] font-mono font-bold text-[var(--muted)] hover:text-[var(--text)] leading-none select-none"
                  style={{ top: Math.max(2, (h - from) * pxPerMin - 4) }}
                >
                  {hourNum}{ampm}
                </div>
              )
            })}
          </div>

          {/* 5 Day Columns with Session Blocks */}
          {DAYS.map((d) => {
            const isToday = d === today
            const sessionsList = daySessionsMap[d] || []
            const isCurrentMinsInDay = isToday && currentMins >= from && currentMins <= to

            return (
              <div
                key={`col-${d}`}
                className={`relative border-r-2 border-[var(--border)] transition-colors ${
                  isToday ? 'bg-[var(--color-present)]/[0.03]' : ''
                }`}
                style={{
                  height: gridHeight,
                  scrollSnapAlign: 'start',
                }}
                onDragOver={editing ? (e) => e.preventDefault() : undefined}
                onDrop={
                  editing
                    ? (e) => {
                        e.preventDefault()
                        const id = e.dataTransfer.getData('text/plain')
                        const rect = e.currentTarget.getBoundingClientRect()
                        const offset = e.clientY - rect.top
                        const snapped = from + Math.round(offset / pxPerMin / 30) * 30
                        onDrop(id, d, Math.max(from, snapped))
                      }
                    : undefined
                }
              >
                {/* Horizontal Hour Grid Divider Lines */}
                {hours.map((h) => (
                  <div
                    key={`line-${d}-${h}`}
                    className="absolute inset-x-0 border-t border-black/8 dark:border-white/8 pointer-events-none"
                    style={{ top: (h - from) * pxPerMin }}
                    aria-hidden="true"
                  />
                ))}

                {/* Real-time "NOW" Laser Line on today's column */}
                {isCurrentMinsInDay && (
                  <div
                    className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                    style={{ top: (currentMins - from) * pxPerMin }}
                  >
                    <div className="w-full h-0.5 bg-[var(--color-present)] shadow-[0_0_8px_var(--color-present)]" />
                    <span className="absolute -left-1 size-2 rounded-full bg-[var(--color-present)] ring-2 ring-black" />
                  </div>
                )}

                {/* Session Blocks */}
                {sessionsList.map((s) => {
                  const theme = getSubjectTheme(s)
                  const isBreak = s.type === 'break'
                  const isLive = isToday && isLiveSession(s, today, currentMins)
                  const blockHeight = Math.max((s.end - s.start) * pxPerMin - 4, 24)

                  return (
                    <button
                      key={s.id}
                      type="button"
                      draggable={editing && !isBreak}
                      onDragStart={
                        editing && !isBreak
                          ? (e) => e.dataTransfer.setData('text/plain', s.id)
                          : undefined
                      }
                      onClick={() => {
                        if (editing) {
                          if (!isBreak) onEdit(s)
                        } else {
                          setSelectedSession(s)
                        }
                      }}
                      className={`absolute inset-x-1 overflow-hidden border-2 p-1 text-left transition-all rounded-[3px] shadow-xs ${
                        editing
                          ? 'cursor-grab active:cursor-grabbing'
                          : 'cursor-pointer active:scale-[0.98]'
                      } ${
                        isLive
                          ? 'ring-2 ring-[var(--color-present)] shadow-hard-sm z-10'
                          : 'hover:brightness-105'
                      }`}
                      style={{
                        top: (s.start - from) * pxPerMin + 2,
                        height: blockHeight,
                        background: isBreak ? s.accent || 'var(--color-violet)' : theme.bgPill,
                        color: isBreak ? 'var(--on-accent)' : theme.ink,
                        borderColor: isBreak ? 'var(--border)' : 'rgba(0,0,0,0.22)',
                      }}
                      title={`${s.name} (${fmtRange(s.start, s.end)})`}
                    >
                      <div className="flex items-start gap-1 leading-tight">
                        {editing ? (
                          <GripVertical className="size-3 shrink-0 mt-0.5 opacity-70" />
                        ) : isBreak ? (
                          <Coffee size={10} className="shrink-0 mt-0.5" strokeWidth={2.5} />
                        ) : null}
                        <span className="text-[10px] font-black line-clamp-2 leading-tight">
                          {s.name}
                        </span>
                      </div>

                      {s.room ? (
                        <span className="text-[9px] font-bold opacity-85 block truncate mt-0.5">
                          {s.room}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* TAP-TO-INSPECT SESSION DETAIL MODAL */}
      {selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="board board-hard w-full max-w-sm p-4 bg-[var(--surface)] shadow-hard-lg border-2 border-[var(--border)] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span
                  className="chip !py-0.5 !px-2 text-[0.65rem] font-black uppercase"
                  style={{
                    background:
                      selectedSession.type === 'break'
                        ? 'var(--color-violet)'
                        : getSubjectTheme(selectedSession).bgPill,
                    color:
                      selectedSession.type === 'break'
                        ? 'var(--on-accent)'
                        : getSubjectTheme(selectedSession).ink,
                  }}
                >
                  {selectedSession.type === 'break'
                    ? 'RECESS'
                    : selectedSession.category || selectedSession.type || 'COURSE'}
                </span>
                {selectedSession.code ? (
                  <span className="chip !py-0.5 !px-2 text-[0.65rem] font-bold">
                    {selectedSession.code}
                  </span>
                ) : null}
                {selectedSession.day ? (
                  <span className="chip !py-0.5 !px-2 text-[0.65rem] font-bold bg-[var(--surface-2)]">
                    {selectedSession.day}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="p-1 muted hover:text-[var(--text)] cursor-pointer"
                aria-label="Close details"
              >
                <X size={16} />
              </button>
            </div>

            {/* Course Name */}
            <div>
              <h3 className="heading text-base sm:text-lg font-black leading-snug">
                {selectedSession.name || 'Break'}
              </h3>
            </div>

            {/* Metadata Rows */}
            <div className="space-y-2 text-xs font-semibold py-1">
              <div className="flex items-center gap-2 text-[var(--text)]">
                <Clock size={14} className="text-[var(--color-violet)] shrink-0" />
                <span>
                  {fmtRange(selectedSession.start, selectedSession.end)}
                  <span className="muted font-normal ml-1">
                    ({Math.max(0, selectedSession.end - selectedSession.start)} mins)
                  </span>
                </span>
              </div>

              {selectedSession.room ? (
                <div className="flex items-center gap-2 text-[var(--text)]">
                  <MapPin size={14} className="text-[var(--color-coral)] shrink-0" />
                  <span>Room: {selectedSession.room}</span>
                </div>
              ) : null}

              {selectedSession.group ? (
                <div className="flex items-center gap-2 text-[var(--text)]">
                  <Users size={14} className="text-[var(--color-sky)] shrink-0" />
                  <span>Batch / Group: {selectedSession.group}</span>
                </div>
              ) : null}

              {selectedSession.instructor ? (
                <div className="flex items-center gap-2 text-[var(--text)]">
                  <Tag size={14} className="text-[var(--color-acid)] shrink-0" />
                  <span>Faculty: {selectedSession.instructor}</span>
                </div>
              ) : null}

              {selectedSession.note ? (
                <p className="text-[0.7rem] muted italic pt-1 border-t border-[var(--border)]">
                  Note: {selectedSession.note}
                </p>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              {onJumpToDay && selectedSession.day ? (
                <button
                  type="button"
                  onClick={() => {
                    const d = selectedSession.day
                    setSelectedSession(null)
                    onJumpToDay(d)
                  }}
                  className="label text-xs text-[var(--color-violet)] hover:underline flex items-center gap-1 font-bold cursor-pointer bg-transparent border-0 p-0"
                >
                  VIEW IN DAY VIEW <ArrowRight size={12} />
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="btn !py-1 !px-3 text-xs font-bold cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}

/* ----------------------------------------------------------- Calendar View -- */

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
]
const CALENDAR_WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function CalendarView({
  sessions,
  marks,
  since,
  activeIso,
  onSelectDate,
}) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const todayStr = useMemo(() => todayISO(), [])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Generate calendar matrix for month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7 // MON = 0
  const totalWeeks = Math.ceil((firstDayIndex + daysInMonth) / 7)
  const totalCells = totalWeeks * 7

  const daysArray = useMemo(() => {
    const days = []
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const formattedMonth = String(month + 1).padStart(2, '0')
      const formattedDay = String(d).padStart(2, '0')
      const iso = `${year}-${formattedMonth}-${formattedDay}`
      days.push({ dayNumber: d, iso })
    }
    while (days.length < totalCells) {
      days.push(null)
    }
    return days
  }, [year, month, daysInMonth, firstDayIndex, totalCells])

  // Unmarked sessions in tracking window up to today
  const pendingUnmarked = useMemo(() => {
    return unmarkedSince(sessions, marks, since, todayStr)
  }, [sessions, marks, since, todayStr])

  const pendingDates = useMemo(() => {
    return [...new Set(pendingUnmarked.map((p) => p.iso))].slice(0, 14)
  }, [pendingUnmarked])

  const handlePrevMonth = () => {
    triggerHaptic(8)
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    triggerHaptic(8)
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const handleGoToday = () => {
    triggerHaptic(10)
    setCurrentMonth(new Date())
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar space-y-3 pb-4">
      {/* Top Month Navigation Bar */}
      <Panel className="board board-hard bg-[var(--surface)] pad-card flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="btn !p-1.5 sm:!p-2 cursor-pointer transition-all border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:shadow-hard-sm"
            aria-label="Previous month"
            title="Previous month"
          >
            <ChevronLeft className="icon-sm" strokeWidth={2.5} />
          </button>
          <span className="text-xs sm:text-base font-black tracking-wider uppercase px-2 text-[var(--text)]">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="btn !p-1.5 sm:!p-2 cursor-pointer transition-all border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:translate-x-0.5 hover:shadow-hard-sm"
            aria-label="Next month"
            title="Next month"
          >
            <ChevronRight className="icon-sm" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGoToday}
            className="btn !py-1 sm:!py-1.5 !px-2.5 sm:!px-3 text-[0.6875rem] sm:text-xs font-bold uppercase tracking-wider cursor-pointer border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] hover:shadow-hard-sm"
          >
            THIS MONTH
          </button>
        </div>
      </Panel>

      {/* Quick Unmarked Backfill Strip */}
      {pendingDates.length > 0 && (
        <Panel className="board board-hard bg-[var(--surface)] pad-card border-l-4 border-l-[var(--color-amber)] shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--color-amber)]">
              ⚡ {pendingDates.length} UNMARKED DAYS
            </span>
            <span className="t-micro muted font-semibold">Tap to jump & fix attendance:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pendingDates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onSelectDate(d)}
                className="btn !py-1 !px-2 text-[0.6875rem] sm:text-xs font-bold uppercase tracking-wider cursor-pointer border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--color-amber)] hover:-translate-y-0.5 hover:shadow-hard-sm"
              >
                {fmtDateShort(d)}
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* Calendar Matrix Card */}
      <Panel className="board board-hard bg-[var(--surface)] p-2 sm:p-4 shadow-xs">
        {/* Weekday Header Columns */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5">
          {CALENDAR_WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="text-center py-1 text-[0.625rem] sm:text-xs font-black uppercase tracking-wider text-[var(--muted)]"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {daysArray.map((cell, idx) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[58px] sm:min-h-[76px] rounded bg-[var(--surface-2)]/30 border border-dashed border-[var(--border)]/30 opacity-30 pointer-events-none"
                />
              )
            }

            const { dayNumber, iso } = cell
            const dCode = dayCode(isoToDate(iso))
            const teachingSessions = sessionsForDay(sessions, dCode).filter((s) => s.type !== 'break')
            const hasClasses = teachingSessions.length > 0
            const noClass = getNoClassEvent(iso)
            const isToday = iso === todayStr
            const isSelected = iso === activeIso

            // Attendance marks summary
            let presentCount = 0
            let absentCount = 0
            let cancelledCount = 0
            let unmarkedCount = 0

            if (hasClasses && !noClass && iso <= todayStr) {
              for (const s of teachingSessions) {
                const m = marks[markKey(iso, s.id)]
                if (m === 'present') presentCount += 1
                else if (m === 'absent') absentCount += 1
                else if (m === 'cancelled') cancelledCount += 1
                else unmarkedCount += 1
              }
            }

            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelectDate(iso)}
                className={`min-h-[58px] sm:min-h-[76px] p-1.5 sm:p-2 rounded border-2 text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                    : isToday
                      ? 'bg-[var(--surface)] border-[var(--color-present)] ring-2 ring-[var(--color-present)]/40 shadow-xs'
                      : 'bg-[var(--surface-2)] border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                }`}
                title={
                  noClass
                    ? `${fmtDateShort(iso)}: ${noClass.label} (No Classes)`
                    : hasClasses
                      ? `${fmtDateShort(iso)}: ${teachingSessions.length} classes scheduled`
                      : `${fmtDateShort(iso)}: No classes scheduled`
                }
              >
                {/* Day Number */}
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs sm:text-sm font-black font-mono leading-none ${
                      isSelected ? 'text-[var(--bg)]' : isToday ? 'text-[var(--color-present)]' : 'text-[var(--text)]'
                    }`}
                  >
                    {dayNumber}
                  </span>
                </div>

                {/* Status Pills / Dots */}
                <div className="mt-1 flex items-center gap-1 flex-wrap">
                  {noClass ? (
                    <span
                      className={`text-[0.55rem] sm:text-[0.625rem] font-bold uppercase truncate max-w-full px-1 py-0.2 rounded ${
                        isSelected
                          ? 'bg-[var(--bg)] text-[var(--text)]'
                          : noClass.isExam
                            ? 'bg-[var(--color-coral)] text-white'
                            : noClass.isBreak
                              ? 'bg-[var(--color-acid)] text-black'
                              : 'bg-[var(--color-amber)] text-black'
                      }`}
                    >
                      {noClass.category || 'OFF'}
                    </span>
                  ) : hasClasses ? (
                    <div className="flex items-center gap-1">
                      {iso <= todayStr ? (
                        unmarkedCount > 0 ? (
                          <span
                            className="size-2 rounded-full bg-[var(--color-amber)] shrink-0"
                            title={`${unmarkedCount} unmarked classes`}
                          />
                        ) : absentCount > 0 && presentCount === 0 ? (
                          <span
                            className="size-2 rounded-full bg-[var(--color-absent)] shrink-0"
                            title={`All classes bunked (${absentCount}/${teachingSessions.length})`}
                          />
                        ) : (
                          <span
                            className="size-2 rounded-full bg-[var(--color-present)] shrink-0"
                            title={`All marked (${presentCount} attended${cancelledCount > 0 ? `, ${cancelledCount} cancelled` : ''})`}
                          />
                        )
                      ) : (
                        <span className="text-[0.55rem] sm:text-[0.625rem] font-mono muted">
                          {teachingSessions.length}C
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[0.55rem] sm:text-[0.625rem] font-mono muted opacity-40">
                      —
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

/* ------------------------------------------------------------- Main Page -- */

export default function Board() {
  const { profile, year, group, setBranch, setYear, setGroup } = useProfile()
  const { sessions, addSession, removeSession, moveSession, resetBoard, clearBoard, isCustomised } =
    useBoard(profile.branch, year)
  const { marks, getMark, setMark } = useRollcall()

  const [searchParams] = useSearchParams()
  const today = dayCode()
  const initialView = searchParams.get('view') === 'calendar' ? 'calendar' : (searchParams.get('view') === 'week' ? 'week' : 'day')
  const [view, setView] = useState(initialView)
  const [selectedIso, setSelectedIso] = useState(searchParams.get('date') || null)

  const [day, setDay] = useState(() => {
    const dParam = searchParams.get('date')
    if (dParam) {
      return dayCode(isoToDate(dParam))
    }
    return DAYS.includes(today) ? today : 'MON'
  })
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [modal, setModal] = useState({ open: false, session: null, day: null })
  const [resetModalOpen, setResetModalOpen] = useState(false)

  // React to URL query param updates
  useEffect(() => {
    const v = searchParams.get('view')
    if (v === 'calendar' || v === 'week' || v === 'day') {
      setView(v)
    }
    const d = searchParams.get('date')
    if (d) {
      setSelectedIso(d)
      setDay(dayCode(isoToDate(d)))
    }
  }, [searchParams])

  useEffect(() => {
    if (!resetModalOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setResetModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resetModalOpen])

  const [settings] = useRollcallSettings()
  const [swipeMode, setSwipeMode] = useSwipeRollcall()
  const required = settings?.required ?? 65
  const since = settings?.trackingSince

  // Computes the ISO calendar date for the selected weekday in the current week (or returns selectedIso if set)
  const activeIso = useMemo(() => {
    if (selectedIso) return selectedIso
    return getIsoForWeekday(day)
  }, [selectedIso, day])

  const noClassEvent = useMemo(() => getNoClassEvent(activeIso), [activeIso])

  const currentMins = minutesNow()

  // Compute live rollcall tally for each subject/course
  const subjectStats = useMemo(() => {
    const map = {}
    const courses = coursesOf(sessions)
    for (const c of courses) {
      const res = tally(marks, c.sessions, since)
      map[c.key] = res
      if (c.code) map[c.code] = res
      if (c.name) map[c.name] = res
    }
    return map
  }, [sessions, marks, since])

  // Available groups for this branch & year
  const availableGroups = useMemo(() => {
    const raw = groupsFor(profile.branch, year)
    return raw.length > 0 ? raw : ['G1', 'G2']
  }, [profile.branch, year])

  // Filter by group first
  const groupFiltered = useMemo(() => {
    return filterSessionsByGroup(sessions, group)
  }, [sessions, group])

  // Filter by search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groupFiltered
    return groupFiltered.filter((s) =>
      [s.name, s.code, s.room, s.group, s.instructor, s.note]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [groupFiltered, query])

  const dayList = useMemo(() => {
    const list = sessionsForDay(filtered, day)
    if (!query.trim()) {
      return insertAutoBreaks(list)
    }
    return list
  }, [filtered, day, query])

  // Next upcoming session today (suppressed on no-class days such as mid-sems or holidays)
  const nextSess = useMemo(() => {
    if (day !== today || noClassEvent) return null
    return nextSession(dayList, today, currentMins)
  }, [day, today, noClassEvent, dayList, currentMins])


  const handleSelectDate = useCallback((iso) => {
    triggerHaptic(12)
    setSelectedIso(iso)
    const targetDay = dayCode(isoToDate(iso))
    setDay(targetDay)
    setView('day')
  }, [])

  const displayDays = useMemo(() => {
    if (selectedIso) {
      const d = dayCode(isoToDate(selectedIso))
      if (!DAYS.includes(d)) return [...DAYS, d]
    }
    return DAYS
  }, [selectedIso])

  return (
    <Shell>
      <div className="space-y-4">
        {/* TOP COMMAND HEADER */}
        <Panel className="board board-hard bg-[var(--surface)] pad-page">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5">
            <div className="flex items-center gap-3">
              <span
                className="icon-tile"
                style={{ background: 'var(--color-violet)' }}
                aria-hidden
              >
                <Clock className="icon-lg" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <h1 className="t-masthead">
                  TIMETABLE
                </h1>
              </div>
            </div>

            {/* Dropdown Selectors: BRANCH, YEAR, GROUP */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Branch Selector */}
              <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border-strong)] rounded px-2.5 py-1.5 shadow-hard-sm transition-colors">
                <span className="t-meta muted mr-1.5">BRANCH</span>
                <select
                  aria-label="Branch"
                  className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
                  value={profile.branch}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  {SORTED_BRANCHES.map((b) => (
                    <option key={b.code} value={b.code} className="bg-[var(--surface)] text-[var(--text)]">
                      {b.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border-strong)] rounded px-2.5 py-1.5 shadow-hard-sm transition-colors">
                <span className="t-meta muted mr-1.5">YEAR</span>
                <select
                  aria-label="Year"
                  className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-[var(--surface)] text-[var(--text)]">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Selector */}
              <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border-strong)] rounded px-2.5 py-1.5 shadow-hard-sm transition-colors">
                <span className="t-meta muted mr-1.5">GROUP</span>
                <select
                  aria-label="Group"
                  className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
                  value={group || 'ALL'}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  <option value="ALL" className="bg-[var(--surface)] text-[var(--text)]">
                    ALL
                  </option>
                  {availableGroups.map((g) => (
                    <option key={g} value={g} className="bg-[var(--surface)] text-[var(--text)]">
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Controls Sub-Bar: Day Switcher & View Switcher */}
          <div className="pt-3.5 border-t-2 border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {displayDays.map((d) => {
                const isActive = day === d
                const isTodayDot = d === today && !selectedIso
                const dIso = getIsoForWeekday(d)
                const dNoClass = getNoClassEvent(dIso)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      triggerHaptic(8)
                      setSelectedIso(null)
                      setDay(d)
                      if (view === 'calendar') setView('day')
                    }}
                    title={dNoClass ? `${d}: ${dNoClass.label} (No classes scheduled)` : d}
                    className={`btn !px-3 !py-1.5 text-xs sm:text-sm font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
                      isActive
                        ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                        : 'bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                    }`}
                  >
                    <span>{d}</span>
                    {isTodayDot ? (
                      <span className="relative flex size-1.5 shrink-0" title="Today">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-present)] opacity-75" />
                        <span className="relative inline-flex rounded-full size-1.5 bg-[var(--color-present)]" />
                      </span>
                    ) : dNoClass ? (
                      <span
                        className="size-1.5 rounded-full shrink-0"
                        title={dNoClass.label}
                        style={{
                          background: dNoClass.isExam
                            ? 'var(--color-coral)'
                            : dNoClass.isBreak
                              ? 'var(--color-acid)'
                              : 'var(--color-amber)',
                        }}
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>

            {/* View Switcher: List vs Week Grid vs Calendar (DESKTOP ONLY) */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                className={`btn !px-2.5 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                  view === 'day'
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                }`}
                onClick={() => {
                  triggerHaptic(8)
                  setView('day')
                }}
                aria-label="Day view"
                title="Day List View"
              >
                <List className="icon-sm" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                className={`btn !px-2.5 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                  view === 'week'
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                }`}
                onClick={() => {
                  triggerHaptic(8)
                  setView('week')
                }}
                aria-label="Week view"
                title="Week Matrix Grid"
              >
                <LayoutGrid className="icon-sm" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                className={`btn !px-2.5 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                  view === 'calendar'
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                }`}
                onClick={() => {
                  triggerHaptic(8)
                  setView('calendar')
                }}
                aria-label="Calendar view"
                title="Calendar & History"
              >
                <Calendar className="icon-sm" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </Panel>

        {/* SEARCH & ACTION CONTROLS BAR */}
        <Panel className="board board-hard bg-[var(--surface)] pad-card shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                className="icon-sm pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50"
                strokeWidth={2}
                aria-hidden
              />
              <input
                className="field !pl-9 uppercase !py-2 text-xs sm:text-sm font-bold"
                placeholder="SEARCH COURSE / ROOM / CODE / PROF..."
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                aria-label="Search sessions"
              />
            </div>

            {/* Edit & Preference Action Buttons + Mobile View Switcher */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {view === 'day' && !editing && (
                  <button
                    type="button"
                    className={`btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                      swipeMode
                        ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                        : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                    }`}
                    onClick={() => {
                      triggerHaptic(10)
                      setSwipeMode((v) => !v)
                    }}
                    aria-label={swipeMode ? 'Disable swipe rollcall mode' : 'Enable swipe rollcall mode'}
                    title={
                      swipeMode
                        ? 'Swipe mode enabled: Swipe card right for Present, left for Absent. Tap to switch to 3-button mode.'
                        : 'Switch to Swipe mode: Swipe cards to mark attendance.'
                    }
                  >
                    <ArrowLeftRight className="icon-sm" strokeWidth={2.5} />
                    <span>SWIPE</span>
                  </button>
                )}
                {editing ? (
                  <>
                    {/* Sequence: tick, +, reset */}
                    {/* 1. Tick for done */}
                    <button
                      type="button"
                      className="btn btn-go !py-1.5 sm:!py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                      onClick={() => setEditing(false)}
                      aria-label="Done editing"
                      title="Done editing"
                    >
                      <Check className="icon-sm" strokeWidth={2.5} />
                      <span className="hidden sm:inline">DONE</span>
                    </button>

                    {/* 2. + for add */}
                    <button
                      type="button"
                      className="btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                      style={{ background: 'var(--color-sky)', color: 'var(--on-accent)' }}
                      onClick={() => setModal({ open: true, session: null, day })}
                      aria-label="Add session"
                      title="Add session"
                    >
                      <Plus className="icon-sm" strokeWidth={2.5} />
                      <span className="hidden sm:inline">ADD</span>
                    </button>

                    {/* 3. Reset icon */}
                    <button
                      type="button"
                      className="btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)]"
                      onClick={() => setResetModalOpen(true)}
                      aria-label="Reset timetable"
                      title="Reset timetable"
                    >
                      <RotateCcw className="icon-sm" strokeWidth={2.5} />
                      <span className="hidden sm:inline">RESET</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                    onClick={() => setEditing(true)}
                  >
                    EDIT
                  </button>
                )}
              </div>

              {/* View Switcher: List vs Week Grid vs Calendar (MOBILE ONLY) */}
              <div className="flex sm:hidden items-center gap-1">
                <button
                  type="button"
                  className={`btn !px-2 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                    view === 'day'
                      ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                  }`}
                  onClick={() => {
                    triggerHaptic(8)
                    setView('day')
                  }}
                  aria-label="Day view"
                  title="Day List View"
                >
                  <List className="icon-sm" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className={`btn !px-2 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                    view === 'week'
                      ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                  }`}
                  onClick={() => {
                    triggerHaptic(8)
                    setView('week')
                  }}
                  aria-label="Week view"
                  title="Week Matrix Grid"
                >
                  <LayoutGrid className="icon-sm" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className={`btn !px-2 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                    view === 'calendar'
                      ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                  }`}
                  onClick={() => {
                    triggerHaptic(8)
                    setView('calendar')
                  }}
                  aria-label="Calendar view"
                  title="Calendar & History"
                >
                  <Calendar className="icon-sm" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </Panel>

        {/* MAIN VIEW CONTAINER */}
        {sessions.length === 0 ? (
          <div className="board board-hard bg-[var(--surface)] pad-page flex flex-col items-center justify-center text-center rounded flex-1 min-h-0">
            <CalendarDays size={36} className="text-[var(--muted)] mb-3" />
            <h3 className="t-section">NOTHING PINNED YET</h3>
            <p className="t-meta muted max-w-md mt-2">
              {baseTimetable(profile.branch, year).length > 0
                ? `Timetable cleared for ${branchName(profile.branch)} Year ${year}. Add your sessions in edit mode, or restore the published timetable.`
                : `No published timetable for ${branchName(profile.branch)} Year ${year}. Add your sessions in edit mode — they save directly to this device.`}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <button
                type="button"
                className="btn btn-go !py-2 !px-4 text-xs font-bold uppercase cursor-pointer"
                onClick={() => {
                  setEditing(true)
                  setModal({ open: true, session: null, day })
                }}
              >
                <Plus className="icon-micro" strokeWidth={2.5} /> ADD FIRST SESSION
              </button>
              {baseTimetable(profile.branch, year).length > 0 && (
                <button
                  type="button"
                  className="btn bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] !py-2 !px-4 text-xs font-bold uppercase cursor-pointer hover:shadow-hard-sm"
                  onClick={() => resetBoard()}
                >
                  <RotateCcw className="icon-micro" strokeWidth={2.5} /> RESTORE PUBLISHED TIMETABLE
                </button>
              )}
            </div>
          </div>
        ) : view === 'calendar' ? (
          <CalendarView
            sessions={groupFiltered}
            marks={marks}
            since={since}
            activeIso={activeIso}
            onSelectDate={handleSelectDate}
          />
        ) : view === 'week' ? (
          <WeekGrid
            sessions={filtered}
            editing={editing}
            onEdit={(s) => setModal({ open: true, session: s, day: s.day })}
            onAddDay={(d) => setModal({ open: true, session: null, day: d })}
            onDrop={(id, newDay, newStart) => {
              const s = sessions.find((x) => x.id === id)
              if (!s) return
              moveSession(id, { day: newDay, start: newStart, end: newStart + (s.end - s.start) })
            }}
            currentMins={currentMins}
            today={today}
            activeDay={day}
            onJumpToDay={(targetDay) => {
              setDay(targetDay)
              setView('day')
            }}
          />
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar pr-1 pb-2">
            {/* Return to Today banner only when custom/past date is selected from calendar */}
            {selectedIso && (
              <div className="board board-hard bg-[var(--surface)] p-2 sm:p-2.5 rounded border-2 border-[var(--border)] mb-3 shadow-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="icon-micro text-[var(--color-coral)]" />
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--text)]">
                    VIEWING {fmtDateShort(selectedIso)}
                  </span>
                  <span className="chip !py-0.2 !px-1.5 text-[0.6rem] font-bold uppercase bg-[var(--surface-2)] text-[var(--muted)]">
                    {selectedIso < todayISO() ? 'PAST' : 'UPCOMING'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10)
                    setSelectedIso(null)
                    setDay(DAYS.includes(today) ? today : 'MON')
                  }}
                  className="btn !py-1 !px-2 text-[0.6875rem] font-bold uppercase tracking-wider cursor-pointer bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] hover:bg-[var(--surface)]"
                  title="Return to today"
                >
                  ← TODAY
                </button>
              </div>
            )}

            {noClassEvent && (
              <div
                className="board board-hard mb-3 p-2.5 sm:p-3 rounded bg-[var(--surface-2)] border-2 flex flex-wrap items-center justify-between gap-2 shadow-xs"
                style={{
                  borderColor: noClassEvent.isExam
                    ? 'var(--color-coral)'
                    : noClassEvent.isBreak
                      ? 'var(--color-acid)'
                      : 'var(--color-amber)',
                }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="chip !py-0.5 !px-2 text-xs font-black uppercase"
                    style={{
                      background: noClassEvent.isExam
                        ? 'var(--color-coral)'
                        : noClassEvent.isBreak
                          ? 'var(--color-acid)'
                          : 'var(--color-amber)',
                      color: '#111111',
                    }}
                  >
                    {noClassEvent.category} · NO CLASSES SCHEDULED
                  </span>
                  <span className="text-xs sm:text-sm font-black">{noClassEvent.label}</span>
                </div>
                <span className="t-micro muted font-bold uppercase">
                  Showing regular schedule below for reference
                </span>
              </div>
            )}

            {dayList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center rounded bg-[var(--surface-2)] border-2 border-[var(--border)] space-y-2">
                <CalendarDays className="icon-lg text-[var(--muted)]" />
                <h4 className="t-card-title">
                  {query ? 'NO MATCHES FOUND' : 'CLEAR DAY'}
                </h4>
                <p className="t-meta muted max-w-sm">
                  {query
                    ? `No classes matching "${query}" on ${day}.`
                    : `Nothing scheduled on ${day}. Enjoy your time off!`}
                </p>
                <button
                  type="button"
                  className="btn btn-go !py-1.5 !px-3 text-xs cursor-pointer mt-2"
                  onClick={() => setModal({ open: true, session: null, day })}
                >
                  <Plus className="icon-micro" strokeWidth={2.5} /> ADD SESSION
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {dayList.map((s) => {
                  const isLive = isLiveSession(s, today, currentMins)
                  const isNext = today === day && nextSess?.id === s.id && !isLive
                  const courseKey = s.key || s.code || s.name
                  const tallyData = subjectStats[courseKey] || subjectStats[s.code] || subjectStats[s.name]

                  if (s.type === 'break') {
                    return (
                      <BreakCard
                        key={s.id}
                        session={s}
                        editing={editing}
                        isLive={isLive}
                        isNext={isNext}
                        currentMins={currentMins}
                        onDelete={removeSession}
                        onEdit={(sess) => setModal({ open: true, session: sess, day: sess.day })}
                      />
                    )
                  }

                  return (
                    <SessionCard
                      key={s.id}
                      session={s}
                      editing={editing}
                      isLive={isLive}
                      isNext={isNext}
                      currentMins={currentMins}
                      tallyData={tallyData}
                      defaultRequired={required}
                      mark={getMark(activeIso, s.id)}
                      onMark={(id, m) => setMark(activeIso, id, m)}
                      onResetMark={(id) => setMark(activeIso, id, null)}
                      onDelete={removeSession}
                      onEdit={(sess) => setModal({ open: true, session: sess, day: sess.day })}
                      swipeMode={swipeMode}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SESSION ADD / EDIT MODAL */}
        <SessionModal
          open={modal.open}
          session={modal.session}
          defaultDay={modal.day}
          onClose={() => setModal({ open: false, session: null, day: null })}
          onDelete={removeSession}
          onSave={(data) => {
            if (modal.session) moveSession(modal.session.id, data)
            else addSession(data)
          }}
        />

        {/* RESET TIMETABLE CONFIRMATION MODAL */}
        {resetModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={() => setResetModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            <div
              className="board board-hard bg-[var(--surface)] p-5 sm:p-6 max-w-md w-full rounded shadow-hard-lg space-y-4 animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b-2 border-[var(--border)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="size-9 rounded border-2 border-[var(--border)] flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-absent)', color: 'var(--on-accent)' }}
                  >
                    <RotateCcw className="icon-sm" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 id="reset-modal-title" className="t-section font-black leading-tight uppercase">
                      RESET TIMETABLE
                    </h2>
                    <p className="t-micro muted uppercase font-bold mt-0.5">
                      CONFIRM TIMETABLE ACTION
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="p-1 rounded border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:shadow-hard-sm cursor-pointer"
                  aria-label="Close"
                >
                  <X className="icon-sm" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed">
                  Are you sure you want to reset this timetable? This will remove the classes from your schedule.
                </p>

                <div className="p-3 rounded bg-[var(--color-present)]/10 border-2 border-[var(--color-present)]/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[var(--present-ink)]">
                    <Check className="icon-micro" strokeWidth={2.5} />
                    <span>ATTENDANCE IS PRESERVED</span>
                  </div>
                  <p className="t-meta muted leading-normal">
                    Your attendance records are safely preserved. If you get the timetable back or restore default classes, all past attendance will still be there.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="btn !py-2 !px-4 text-xs font-bold uppercase cursor-pointer bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] hover:shadow-hard-sm"
                >
                  CANCEL
                </button>
                {isCustomised && baseTimetable(profile.branch, year).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      resetBoard()
                      setResetModalOpen(false)
                    }}
                    className="btn !py-2 !px-3 text-xs font-bold uppercase cursor-pointer bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] hover:shadow-hard-sm"
                  >
                    RESTORE DEFAULT
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    clearBoard()
                    setResetModalOpen(false)
                  }}
                  className="btn !py-2 !px-4 text-xs font-bold uppercase cursor-pointer shadow-hard-sm"
                  style={{ background: 'var(--color-absent)', color: 'var(--on-accent)' }}
                >
                  REMOVE TIMETABLE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

