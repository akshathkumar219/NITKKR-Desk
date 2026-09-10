import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Coffee,
  MapPin,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { getSubjectTheme } from '../lib/palette'
import { insertAutoBreaks, isLiveSession, sessionsForDay } from '../lib/board'
import { DAYS, dayCode, fmtRange, todayISO } from '../lib/time'
import { getNoClassEvent } from '../data/info'

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
  if (currentDayIndex >= 5 && targetDayIndex < 5) {
    diff = 7 - currentDayIndex + targetDayIndex
  }
  targetDate.setDate(now.getDate() + diff)
  return todayISO(targetDate)
}

export default function VisualTimetableWidget({ sessions = [], day = 'MON', mins = 0, profile = {}, year = 1 }) {
  const containerRef = useRef(null)
  const hasAutoScrolled = useRef(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const [activeDay, setActiveDay] = useState(() => (DAYS.includes(day) ? day : 'MON'))
  const [selectedSession, setSelectedSession] = useState(null)

  const today = dayCode()

  // Measure container width for exact 3-column sizing
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

  // Time bounds calculation
  const { from, to, hours } = useMemo(() => {
    const minFrom = 8 * 60 // 8:00 AM
    const minTo = 18 * 60 // 6:00 PM
    if (!sessions.length) {
      const hrs = []
      for (let h = minFrom; h <= minTo; h += 60) hrs.push(h)
      return { from: minFrom, to: minTo, hours: hrs }
    }
    const maxEnd = Math.max(...sessions.map((s) => s.end || 0))
    const toHour = Math.max(minTo, Math.ceil(maxEnd / 60) * 60)
    const hrs = []
    for (let h = minFrom; h <= toHour; h += 60) hrs.push(h)
    return { from: minFrom, to: toHour, hours: hrs }
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

      // To center targetIdx:
      // 0 (MON) -> scrollLeft = 0 (MON, TUE, WED)
      // 1 (TUE) -> scrollLeft = 0 (TUE is center of MON, TUE, WED)
      // 2 (WED) -> scrollLeft = 1 * colWidth (TUE, WED, THU)
      // 3 (THU) -> scrollLeft = 2 * colWidth (WED, THU, FRI)
      // 4 (FRI) -> scrollLeft = 2 * colWidth (WED, THU, FRI)
      const clampIndex = Math.max(0, Math.min(2, targetIdx - 1))
      const targetScrollLeft = clampIndex * colWidth

      containerRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: smooth ? 'smooth' : 'auto',
      })
      setActiveDay(targetDay)
    },
    [containerWidth, colWidth, visibleCols],
  )

  // Track scroll position to update active day pill
  const handleScroll = () => {
    if (!containerRef.current || visibleCols === 5) return
    const scrollLeft = containerRef.current.scrollLeft
    // approximate centered column index
    const centerOffset = scrollLeft + colWidth * 1.5
    const idx = Math.max(0, Math.min(4, Math.floor(centerOffset / colWidth)))
    if (DAYS[idx] && DAYS[idx] !== activeDay) {
      setActiveDay(DAYS[idx])
    }
  }

  // Initial Auto-scroll: today in the center and scrolled to top only
  useEffect(() => {
    if (containerWidth > 0 && !hasAutoScrolled.current) {
      hasAutoScrolled.current = true
      const initialDay = DAYS.includes(day) ? day : 'MON'
      scrollToDay(initialDay, false)

      if (containerRef.current) {
        containerRef.current.scrollTop = 0
      }
    }
  }, [containerWidth, day, scrollToDay])

  // Pre-calculate sessions for each day with auto-breaks inserted
  const daySessionsMap = useMemo(() => {
    const map = {}
    for (const d of DAYS) {
      const list = sessionsForDay(sessions, d)
      map[d] = insertAutoBreaks(list)
    }
    return map
  }, [sessions])

  // Current day holiday/break info
  const todayNoClass = useMemo(() => getNoClassEvent(todayISO()), [])

  return (
    <div className="board board-hard flex-1 flex flex-col p-3 sm:p-4 border-l-4 border-l-[var(--color-violet)] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg min-h-0">
      {/* CARD HEADER */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-[var(--color-violet)] shrink-0" />
          <div className="flex items-center gap-1.5">
            <h2 className="heading text-xs sm:text-sm font-extrabold text-[var(--color-violet)]">
              WEEK TIMETABLE
            </h2>
            {profile.branch ? (
              <span className="chip !py-0.2 !px-1.5 text-[0.6rem] font-bold">
                {profile.branch} · Y{year}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          to="/home"
          className="label text-[var(--color-violet)] hover:underline flex items-center gap-1 text-xs font-bold shrink-0"
        >
          FULL BOARD <ArrowRight size={12} />
        </Link>
      </div>

      {/* HOLIDAY / EXAM BANNER NOTICE (if today has no classes) */}
      {todayNoClass && (
        <div className="mb-2 px-2.5 py-1 text-[0.6875rem] font-bold rounded border flex items-center justify-between shrink-0 bg-[var(--surface-2)] border-[var(--border)]">
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

      {/* SCHEDULE MATRIX */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-auto border border-[var(--border)] rounded bg-[var(--surface)] min-h-[220px] lg:min-h-0 select-none touch-pan-x touch-pan-y no-scrollbar"
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
          {/* ================= STICKY HEADER ROW ================= */}
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
            const isFocused = d === activeDay
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
              </div>
            )
          })}

          {/* ================= GRID BODY ================= */}
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
            const isCurrentMinsInDay = isToday && mins >= from && mins <= to

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
                    style={{ top: (mins - from) * pxPerMin }}
                  >
                    <div className="w-full h-0.5 bg-[var(--color-present)] shadow-[0_0_8px_var(--color-present)]" />
                    <span className="absolute -left-1 size-2 rounded-full bg-[var(--color-present)] ring-2 ring-black" />
                  </div>
                )}

                {/* Session Blocks */}
                {sessionsList.map((s) => {
                  const theme = getSubjectTheme(s)
                  const isBreak = s.type === 'break'
                  const isLive = isToday && isLiveSession(s, today, mins)
                  const blockHeight = Math.max((s.end - s.start) * pxPerMin - 4, 24)

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSession(s)}
                      className={`absolute inset-x-1 overflow-hidden border-2 p-1 text-left transition-all cursor-pointer rounded-[3px] shadow-xs active:scale-[0.98] ${
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
                        {isBreak ? (
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
              <Link
                to="/home"
                className="label text-xs text-[var(--color-violet)] hover:underline flex items-center gap-1 font-bold"
              >
                OPEN IN FULL BOARD <ArrowRight size={12} />
              </Link>
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
    </div>
  )
}
