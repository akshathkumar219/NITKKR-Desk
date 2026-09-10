import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckSquare,
  ClipboardCheck,
  Moon,
  Plus,
  Repeat,
  Square,
  Sun,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Pencil,
  Check,
  X,
  User,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react'
import {
  avatarOf,
  useCustomStatus,
  useEventCategories,
  useEvents,
  useProfile,
  useRollcallSettings,
  useTheme,
  useTodos,
  useMessOverrides,
} from '../lib/storage'
import { branchName, hostelName } from '../data/campus'
import { coursesOf, currentSession, filterSessionsByGroup, nextSession, sessionsForDay, useBoard } from '../lib/board'
import { MEALS, getNextMealInfo, menuFor } from '../data/mess'
import { status, STATUS_COLOR, tally, useRollcall } from '../lib/rollcall'
import { dayCode, fmtRange, minutesNow, todayISO, fmtDateDDMMYYYY } from '../lib/time'
import { CURRENT_TERM, getNoClassEvent } from '../data/info'
import AppHeader from '../components/AppHeader'
import VisualTimetableWidget from '../components/VisualTimetableWidget'
import { inkFor } from '../lib/palette'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function signalFor({ live, next, noClass }) {
  if (noClass) {
    return {
      title: `${noClass.label} (No Classes)`,
      tone: noClass.isExam ? 'var(--color-coral)' : 'var(--color-acid)',
    }
  }
  if (live) {
    return {
      title: 'In Session Now',
      tone: 'var(--color-present)',
    }
  }
  if (next) {
    return {
      title: 'Next Up Today',
      tone: 'var(--color-brand)',
    }
  }
  return {
    title: 'Free for the Day',
    tone: 'var(--color-absent)',
  }
}

/** Background halftone dot grid across entire viewport */
function DotGrid() {
  return (
    <div
      className="world world-halftone pointer-events-none fixed inset-0 z-0 opacity-20"
      style={{ color: 'var(--primary)' }}
      aria-hidden
    />
  )
}

function ThemeToggle({ theme, toggle }) {
  return (
    <button
      type="button"
      className="btn btn-punk-toggle !px-2.5 !py-1.5 transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard cursor-pointer"
      onClick={(e) => toggle(e)}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={14} strokeWidth={2.5} /> : <Moon size={14} strokeWidth={2.5} />}
    </button>
  )
}

function Disclaimers({ className = '' }) {
  return (
    <footer className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 ${className}`}>
      <p className="label muted text-xs sm:text-[0.8125rem]">EVERYTHING STAYS ON THIS DEVICE.</p>
      <p className="label muted text-xs sm:text-[0.8125rem]">UNOFFICIAL · NOT AFFILIATED WITH NIT KURUKSHETRA</p>
    </footer>
  )
}

function Cover({ name, theme, toggle }) {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen lg:h-screen w-full flex flex-col justify-between overflow-hidden p-4 sm:p-6 lg:p-8">
      <DotGrid />
      <header className="relative z-10 flex w-full items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <span
            className="grid size-9 sm:size-10 shrink-0 place-items-center border-2 border-[var(--border)] bg-[var(--color-acid)] shadow-sm"
            aria-hidden
          >
            <Repeat size={18} strokeWidth={3} color="var(--color-ink)" />
          </span>
          <span className="display text-2xl sm:text-3xl font-black tracking-wide uppercase select-text cursor-text">
            NITKKR DESK
          </span>
        </div>
        <ThemeToggle theme={theme} toggle={toggle} />
      </header>

      <section className="relative flex-1 flex items-center w-full py-6">
        <div className="relative z-10 w-full max-w-3xl">
          <span className="sticker animate-rise" style={{ background: 'var(--color-amber)', color: 'var(--color-ink)' }}>
            NOT SET UP YET
          </span>

          <h1
            className="display animate-settle mt-4 max-w-[11ch] text-4xl sm:text-6xl lg:text-7xl font-black leading-[0.95]"
            style={{ animationDelay: '80ms' }}
          >
            pick your branch
          </h1>

          <p className="animate-rise mt-4 max-w-sm text-sm font-medium" style={{ animationDelay: '220ms' }}>
            {name ? `${name}, choose` : 'Choose'} a branch and year, and the board fills itself in —
            timetable, attendance, mess, the lot.
          </p>

          <button
            type="button"
            className="btn btn-primary animate-rise mt-6 w-full !py-3 sm:w-auto sm:!px-10 text-xs font-bold transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg cursor-pointer"
            style={{ animationDelay: '320ms' }}
            onClick={() => navigate('/select/branch')}
          >
            START
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </section>

      <Disclaimers className="relative z-10 w-full shrink-0" />
    </div>
  )
}

/** Mini Month Calendar component with clean grid cells */
function HeroMiniCalendar({ events, getCatStyle }) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7 // MON = 0

  const todayStr = todayISO()

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [events])

  const cells = useMemo(() => {
    const items = []
    for (let i = 0; i < firstDayIndex; i++) items.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const formattedMonth = String(month + 1).padStart(2, '0')
      const formattedDay = String(d).padStart(2, '0')
      const iso = `${year}-${formattedMonth}-${formattedDay}`
      items.push({ d, iso })
    }
    return items
  }, [firstDayIndex, daysInMonth, month, year])

  return (
    <div className="board p-2.5 sm:p-3 flex flex-col justify-between h-full bg-[var(--surface-2)]/60">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-1.5 shrink-0">
          <Link to="/calendar" className="flex items-center gap-1.5 label text-xs sm:text-[0.8125rem] font-bold hover:underline" title="Open full calendar">
            <CalendarIcon size={13} className="text-[var(--color-present)]" />
            <span>{monthName} {year}</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="p-0.5 hover:text-[var(--color-present)] cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                setCurrentDate(new Date(year, month - 1, 1))
              }}
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              className="p-0.5 hover:text-[var(--color-present)] cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                setCurrentDate(new Date(year, month + 1, 1))
              }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center label muted text-[0.65rem] sm:text-[0.7rem] font-bold py-0.5 border-b border-[var(--border)] mb-1.5 shrink-0">
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center flex-1 min-h-0">
          {cells.map((c, i) => {
            if (!c) return <div key={`empty-${i}`} className="min-h-[26px] sm:min-h-[28px] rounded bg-transparent" />
            const isToday = c.iso === todayStr
            const dayEvts = eventsByDate[c.iso] || []
            const hasEvent = dayEvts.length > 0
            const primaryCat = hasEvent && getCatStyle ? getCatStyle(dayEvts[0].category) : null

            return (
              <Link
                key={c.iso}
                to="/calendar"
                title={hasEvent ? dayEvts.map((e) => `${e.title} (${e.category})`).join(' · ') : undefined}
                style={
                  isToday
                    ? {
                        backgroundColor: 'var(--color-present)',
                        borderColor: 'var(--color-present)',
                        color: 'var(--on-accent)',
                      }
                    : hasEvent && primaryCat
                      ? {
                          borderColor: primaryCat.bg,
                          backgroundColor: `color-mix(in srgb, ${primaryCat.bg} 18%, var(--surface))`,
                          color: 'var(--text)',
                        }
                      : undefined
                }
                className={`min-h-[26px] sm:min-h-[28px] text-xs sm:text-[0.8125rem] font-bold rounded border transition-all grid place-items-center relative ${
                  isToday
                    ? 'shadow-sm font-black'
                    : hasEvent
                      ? 'shadow-2xs font-extrabold hover:opacity-90'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)]'
                }`}
              >
                <span className="leading-none">{c.d}</span>
                {hasEvent && (
                  <span className="absolute bottom-0.5 flex items-center justify-center gap-0.5 pointer-events-none">
                    {dayEvts.slice(0, 3).map((ev) => {
                      const catStyle = getCatStyle ? getCatStyle(ev.category) : { bg: 'var(--color-present)' }
                      return (
                        <span
                          key={ev.id}
                          className="size-1 sm:size-1.5 rounded-full border border-black/30"
                          style={{ background: isToday ? 'var(--on-accent)' : catStyle.bg }}
                        />
                      )
                    })}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="mt-2 pt-1.5 border-t border-[var(--border)] text-right shrink-0">
        <Link to="/calendar" className="label text-xs sm:text-[0.8125rem] text-[var(--color-present)] hover:underline flex items-center justify-end gap-1.5 font-bold">
          FULL CALENDAR <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  )
}



function MessWidget({ mins, day, profile }) {
  const nextInfo = useMemo(() => getNextMealInfo(mins, day), [mins, day])
  const [selectedMealKey, setSelectedMealKey] = useState(null)
  const { overrides } = useMessOverrides(profile.hostel)

  const activeMealKey = selectedMealKey || nextInfo.meal.key
  const isAutoNext = !selectedMealKey || selectedMealKey === nextInfo.meal.key
  const targetDay = isAutoNext && nextInfo.isTomorrow ? nextInfo.dayCode : day
  const isLive = isAutoNext && nextInfo.isLive

  const hostelMenu = useMemo(() => {
    return menuFor(profile.hostel, targetDay, overrides)
  }, [profile.hostel, targetDay, overrides])

  const mealData = hostelMenu?.[activeMealKey]
  const items = Array.isArray(mealData) ? mealData : mealData?.items ?? []
  const extra = !Array.isArray(mealData) ? mealData?.extra : null

  return (
    <div
      className="board board-hard flex-1 flex flex-col p-3.5 sm:p-4 border-l-4 transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg min-h-0"
      style={{
        borderLeftColor: isLive ? 'var(--color-present)' : 'var(--color-amber)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <UtensilsCrossed
            size={18}
            className={isLive ? 'text-[var(--color-present)]' : 'text-[var(--color-amber)]'}
          />
          <h2
            className="heading text-sm sm:text-base font-extrabold truncate"
            style={{ color: isLive ? 'var(--color-present)' : 'var(--color-amber)' }}
          >
            NEXT MEAL
          </h2>
          {isLive ? (
            <span
              className="px-1.5 py-0.2 text-[0.625rem] sm:text-[0.65rem] font-black rounded tracking-wider animate-pulse shadow-xs"
              style={{
                backgroundColor: 'var(--color-present)',
                color: 'var(--on-accent)',
              }}
            >
              LIVE
            </span>
          ) : isAutoNext && nextInfo.isTomorrow ? (
            <span className="chip !py-0.2 !px-1.5 text-[0.625rem] sm:text-[0.65rem] font-black bg-[var(--color-amber)] text-[var(--on-accent)] border-[var(--color-amber)]">
              TOMORROW
            </span>
          ) : null}
        </div>

        <Link
          to="/mess"
          className="label hover:underline flex items-center gap-1.5 text-xs sm:text-[0.8125rem] font-bold shrink-0"
          style={{ color: isLive ? 'var(--color-present)' : 'var(--color-amber)' }}
        >
          FULL MENU <ArrowRight size={12} />
        </Link>
      </div>

      {/* Tabs: Breakfast / Lunch / Dinner */}
      <div className="mt-2.5 shrink-0">
        <div className="grid grid-cols-3 gap-1 p-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] w-full">
          {MEALS.map((m) => {
            const isSelected = m.key === activeMealKey
            const isCurrentNext = m.key === nextInfo.meal.key
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMealKey(m.key)}
                className={`w-full py-1.5 px-2 text-[0.65rem] sm:text-[0.75rem] font-extrabold rounded-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                  isSelected
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs border border-[var(--border)]'
                    : 'muted hover:text-[var(--text)]'
                }`}
              >
                {isCurrentNext && (
                  <span
                    className="size-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: nextInfo.isLive ? 'var(--color-present)' : 'var(--color-amber)',
                    }}
                  />
                )}
                <span className="truncate">{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Dishes list */}
      <div className="mt-2.5 flex-1 space-y-1.5 overflow-y-auto pr-1 min-h-0">
        {items.length === 0 ? (
          <div className="h-full min-h-[90px] flex flex-col items-center justify-center text-center py-4 px-2 space-y-1 rounded bg-[var(--surface-2)]/60 border border-[var(--border)]">
            <p className="label muted text-xs font-bold">NO MENU SCHEDULED</p>
            <p className="label text-[0.6875rem] muted">Check full mess page or select a hostel</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${activeMealKey}-${idx}`}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] transition-colors hover:border-[var(--color-amber)]/60"
            >
              <span className="text-[0.625rem] sm:text-[0.6875rem] font-bold font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] shrink-0">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="text-xs sm:text-[0.8125rem] font-bold uppercase truncate text-[var(--text)]">
                {item}
              </span>
            </div>
          ))
        )}

        {/* Extra / Treat */}
        {extra && (
          <div className="mt-2 p-2 rounded border-2 border-[var(--color-amber)]/60 bg-[var(--color-amber)]/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles size={14} className="text-[var(--color-amber)] shrink-0" />
              <div className="min-w-0">
                <span className="text-[0.55rem] sm:text-[0.6rem] font-black uppercase tracking-widest text-[var(--color-amber)] block">
                  SPECIAL EXTRA
                </span>
                <span className="text-xs sm:text-[0.8125rem] font-black uppercase truncate block text-[var(--text)]">
                  {extra}
                </span>
              </div>
            </div>
            <span className="chip !py-0.2 !px-1.5 text-[0.55rem] font-black bg-[var(--color-amber)] text-[var(--on-accent)] shrink-0">
              TREAT
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function TodoWidget() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos()
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    addTodo(input)
    setInput('')
  }

  const completedCount = todos.filter((t) => t.done).length

  return (
    <div className="board board-hard flex-1 flex flex-col p-3.5 sm:p-4 border-l-4 border-l-[var(--color-amber)] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg h-full min-h-0">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-[var(--color-amber)]" />
          <h2 className="heading text-sm sm:text-base font-extrabold text-[var(--color-amber)]">STUDENT TO-DOS</h2>
        </div>
        <span className="label text-[var(--color-amber)] font-bold text-xs sm:text-[0.8125rem]">
          {completedCount}/{todos.length} DONE
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-2.5 flex gap-2 shrink-0">
        <input
          type="text"
          className="field flex-1 !py-1.5 !px-3 text-xs sm:text-sm"
          placeholder="Add assignment, lab note, or task..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="btn !py-1.5 !px-3 text-xs sm:text-sm font-bold cursor-pointer bg-[var(--color-amber)] text-[var(--on-accent)] border-[var(--color-amber)]"
        >
          <Plus size={14} /> ADD
        </button>
      </form>

      <div className="mt-2.5 flex-1 space-y-1.5 overflow-y-auto pr-1 min-h-0">
        {todos.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center py-4">
            <p className="label muted text-xs sm:text-sm">NO TASKS YET. ADD ONE ABOVE!</p>
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-center justify-between p-2 rounded border border-[var(--border)] bg-[var(--surface-2)] transition-all ${
                todo.done ? 'opacity-50' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => toggleTodo(todo.id)}
                className="flex items-center gap-2.5 flex-1 text-left cursor-pointer min-w-0"
              >
                {todo.done ? (
                  <CheckSquare size={16} className="text-[var(--color-present)] shrink-0" />
                ) : (
                  <Square size={16} className="text-[var(--muted)] shrink-0" />
                )}
                <span className={`text-xs sm:text-sm font-semibold truncate ${todo.done ? 'line-through muted' : ''}`}>
                  {todo.text}
                </span>
              </button>
              <button
                type="button"
                onClick={() => deleteTodo(todo.id)}
                className="p-1 hover:text-[var(--color-absent)] muted transition-colors cursor-pointer shrink-0"
                title="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { profile, year, group, onboarded } = useProfile()
  const { theme, toggle } = useTheme()
  const { sessions } = useBoard(profile.branch, year)
  const effectiveSessions = useMemo(() => filterSessionsByGroup(sessions, group), [sessions, group])
  const { marks, adjustments } = useRollcall()
  const { events, addEvent } = useEvents(CURRENT_TERM)
  const { categories } = useEventCategories()
  const [customStatus, setCustomStatus] = useCustomStatus()
  const [editingStatus, setEditingStatus] = useState(false)
  const [statusInput, setStatusInput] = useState('')

  // Map categories by ID for quick lookup
  const categoryMap = useMemo(() => {
    const map = {}
    categories.forEach((c) => {
      map[c.id] = c
    })
    return map
  }, [categories])

  const getCatStyle = useCallback(
    (catId) => {
      if (categoryMap[catId]) {
        return {
          bg: categoryMap[catId].bg,
          ink: categoryMap[catId].ink || '#111111',
          label: categoryMap[catId].label,
        }
      }
      return { bg: 'var(--surface-2)', ink: 'var(--text)', label: catId || 'EVENT' }
    },
    [categoryMap],
  )

  // Quick Add Event Modal state
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState(() => todayISO())
  const [newEventCategory, setNewEventCategory] = useState('PERSONAL')

  const [settings] = useRollcallSettings()
  const now = useClock()
  const todayDateStr = todayISO(now)
  const todayNoClass = useMemo(() => getNoClassEvent(todayDateStr), [todayDateStr])

  const mins = minutesNow(now)
  const day = dayCode(now)
  const live = todayNoClass ? null : currentSession(effectiveSessions, day, mins)
  const next = todayNoClass ? null : nextSession(effectiveSessions, day, mins)
  const nextMealInfo = useMemo(() => getNextMealInfo(mins, day), [mins, day])
  const meal = nextMealInfo.meal
  const signal = signalFor({ live, next, noClass: todayNoClass })

  // Mirrors Attendance.jsx's own `overall` tally exactly (same session-id set,
  // same manual per-subject adjustments summed, same base attendance carried
  // in from Settings) — otherwise this tile and the Attendance page can show
  // two different percentages for the same underlying data.
  const totalAdjustments = useMemo(
    () => Object.values(adjustments || {}).reduce((sum, val) => sum + (Number(val) || 0), 0),
    [adjustments],
  )
  const baseAttendance = settings.baseAttendance
  const basePresentVal = baseAttendance?.present || 0
  const baseHeldVal = baseAttendance?.held || 0

  const attendance = useMemo(() => {
    const teachingSessions = coursesOf(effectiveSessions).flatMap((c) => c.sessions)
    return tally(marks, teachingSessions, settings.trackingSince, totalAdjustments, {
      present: basePresentVal,
      held: baseHeldVal,
    })
  }, [marks, effectiveSessions, settings.trackingSince, totalAdjustments, basePresentVal, baseHeldVal])

  const remaining = useMemo(
    () =>
      todayNoClass
        ? 0
        : sessionsForDay(effectiveSessions, day).filter((s) => s.type !== 'break' && s.end > mins).length,
    [effectiveSessions, day, mins, todayNoClass],
  )

  const clock = now
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    .toUpperCase()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()

  const st = status(attendance.percent, settings.required)

  const attendanceWord =
    attendance.percent === null
      ? 'EMPTY'
      : st === 'short'
        ? 'BELOW TARGET'
        : st === 'edge'
          ? 'ALMOST'
          : 'ON TRACK'

  const classNote = useMemo(() => {
    if (live) {
      return `LIVE: ${live.name || live.code}${live.room ? ` · RM ${live.room}` : ''}`
    }
    if (next) {
      const minsUntil = next.start - mins
      if (minsUntil > 0 && minsUntil <= 60) {
        return `NEXT IN ${minsUntil}M${next.room ? ` · RM ${next.room}` : ''}`
      }
      return `NEXT: ${fmtRange(next.start, next.end)}${next.room ? ` · RM ${next.room}` : ''}`
    }
    if (effectiveSessions.length === 0) {
      return 'NO TIMETABLE UPLOADED'
    }
    if (remaining === 0) {
      return 'ALL DONE TODAY'
    }
    return remaining === 1 ? '1 CLASS REMAINING' : `${remaining} CLASSES REMAINING`
  }, [live, next, mins, remaining, effectiveSessions.length])

  const circumference = 131.95 // 2 * Math.PI * 21
  const filledCircle =
    attendance.percent === null
      ? 0
      : (Math.min(100, Math.max(0, attendance.percent)) / 100) * circumference

  const upcomingEvents = useMemo(() => {
    const today = todayISO(now)
    return events
      .filter((e) => (e.endDate || e.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events, now])

  const handleSaveStatus = (e) => {
    e.preventDefault()
    setCustomStatus(statusInput.trim())
    setEditingStatus(false)
  }

  const handleAddEvent = (e) => {
    e.preventDefault()
    if (!newEventTitle.trim()) return
    addEvent({
      title: newEventTitle.trim(),
      date: newEventDate,
      category: newEventCategory,
    })
    setNewEventTitle('')
    setShowAddEvent(false)
  }

  const activeStatusText = customStatus || signal.title

  if (!onboarded) return <Cover name={profile.name} theme={theme} toggle={toggle} />

  return (
    <div className="relative min-h-screen lg:h-screen w-full flex flex-col justify-between overflow-x-hidden lg:overflow-hidden select-none">
      <DotGrid />

      <div className="relative z-10 w-full flex-1 flex flex-col justify-between p-4 sm:p-5 lg:p-6 gap-3 lg:gap-4 min-h-0">
        {/* ---- MOBILE HEADER: Editorial Masthead (< lg screens) ---- */}
        <header className="lg:hidden flex flex-col shrink-0">
          {/* Top Plate — shared masthead (see components/AppHeader) */}
          <AppHeader variant="paper" />

          {/* Heavy Editorial Masthead Rule */}
          <hr className="rule-ink" />
        </header>

        {/* ---- DESKTOP HEADER (lg+ screens) ---- */}
        <header className="hidden lg:flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="grid size-10 shrink-0 place-items-center border-2 border-[var(--border)] shadow-sm cursor-pointer transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5"
              style={{ background: 'var(--color-present)', color: 'var(--on-accent)' }}
              title="Open Workspace / Timetable"
              aria-label="Open Workspace / Timetable"
            >
              <Repeat size={18} strokeWidth={3} color="var(--on-accent)" />
            </button>
            <span className="display text-3xl lg:text-4xl font-black tracking-wide uppercase select-text cursor-text">
              NITKKR DESK
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} toggle={toggle} />
          </div>
        </header>

        <hr className="hidden lg:block rule-ink shrink-0" style={{ background: 'var(--color-present)', opacity: 1 }} />

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-4 min-h-0">
          {/* ---- LEFT COLUMN: Signal, Readings, Doors (order-2 on mobile, order-1 on desktop) ---- */}
          <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col justify-between gap-3 lg:gap-4 h-full min-h-0">
            {/* HERO SIGNAL CARD (order-2 on mobile, order-1 on desktop) */}
            <section
              className="order-2 lg:order-1 board board-hard tone-edge relative p-4 sm:p-5 flex-1 border-l-4 transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg min-h-0 flex flex-col justify-between"
              style={{ '--tone': 'var(--color-present)', borderLeftColor: 'var(--color-present)' }}
            >
              {/* DESKTOP TOP ROW: Title & Clock (Left) | Unified Cyber-Student ID Keycard (Right) - Visible on lg+ */}
              <div className="hidden lg:flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2.5 shrink-0">
                {/* Top Left: Clock & Editable Status Title */}
                <div className="min-w-0 pr-1">
                  <p className="label muted text-xs sm:text-[0.8125rem] font-medium truncate">
                    {weekday} · {clock}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {editingStatus ? (
                      <form onSubmit={handleSaveStatus} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          className="field !py-1 !px-2.5 text-sm sm:text-base font-bold w-48 sm:w-64"
                          placeholder="e.g. Done for the day!"
                          value={statusInput}
                          onChange={(e) => setStatusInput(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="btn !p-1.5 text-xs cursor-pointer bg-[var(--color-present)] text-[var(--on-accent)] border-[var(--color-present)]"
                          title="Save custom message"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn !p-1.5 text-xs cursor-pointer"
                          onClick={() => setEditingStatus(false)}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </form>
                    ) : (
                      <>
                        <h1 className="heading text-xl sm:text-2xl font-extrabold truncate" title={activeStatusText}>
                          {activeStatusText}
                        </h1>
                        <button
                          type="button"
                          className="p-1 muted hover:text-[var(--primary)] transition-colors cursor-pointer shrink-0"
                          onClick={() => {
                            setStatusInput(customStatus)
                            setEditingStatus(true)
                          }}
                          title="Edit custom message"
                        >
                          <Pencil size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Top Right: Cyber-Student Keycard */}
                {(() => {
                  const idAccent = profile.avatarColor || 'var(--color-sky)'
                  const avatarTextColor = inkFor(idAccent)

                  return (
                    <Link
                      to="/profile"
                      className="board board-hard flex items-center gap-3 p-2 sm:p-2.5 bg-[var(--surface)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm group"
                      title="Edit Profile"
                    >
                      {/* Avatar Photo Box with Live Status Indicator Dot */}
                      <div className="relative shrink-0">
                        {profile.name || profile.avatarEmoji ? (
                          <span
                            className={`grid size-8.5 sm:size-9 place-items-center shrink-0 border border-black/20 font-bold ${
                              profile.avatarEmoji ? 'avatar-emoji-box' : 'text-sm'
                            }`}
                            style={{
                              background: idAccent,
                              color: avatarTextColor,
                              borderRadius: 3,
                            }}
                          >
                            <span className={profile.avatarEmoji ? 'avatar-emoji' : ''}>
                              {avatarOf(profile)}
                            </span>
                          </span>
                        ) : (
                          <span
                            className="grid size-8.5 sm:size-9 place-items-center text-sm shrink-0 border border-black/20 rounded-[3px]"
                            style={{
                              background: idAccent,
                              color: avatarTextColor,
                            }}
                          >
                            <User size={16} />
                          </span>
                        )}

                        {/* Live Pulse Dot */}
                        <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-present)] opacity-75" />
                          <span className="relative inline-flex rounded-full size-2.5 bg-[var(--color-present)] border border-[var(--surface)]" />
                        </span>
                      </div>

                      {/* Vertical Separator */}
                      <div className="h-7 w-px bg-[var(--border)] shrink-0" aria-hidden="true" />

                      {/* Student Details: Branch · Year (Top) | Hostel (Bottom) - Dynamic to avatar color */}
                      <div className="flex flex-col pr-1 text-left min-w-0">
                        <div className="flex items-center gap-1.5 pb-0.5">
                          <span
                            className="label text-[0.7rem] sm:text-xs font-bold tracking-wider truncate"
                            style={{ color: idAccent }}
                          >
                            {branchName(profile.branch)}
                          </span>
                          <span
                            className="chip !py-0.2 !px-1.5 text-[0.6rem] font-black shrink-0 border"
                            style={{
                              borderColor: idAccent,
                              color: idAccent,
                              backgroundColor: 'transparent',
                            }}
                          >
                            Y{year}
                          </span>
                        </div>
                        <div className="w-full h-px bg-[var(--border)] my-0.5" aria-hidden="true" />
                        <span
                          className="label text-[0.65rem] sm:text-[0.7rem] font-bold tracking-wider truncate pt-0.5"
                          style={{ color: idAccent }}
                        >
                          {hostelName(profile.hostel)}
                        </span>
                      </div>
                    </Link>
                  )
                })()}
              </div>

              {/* BOTTOM ROW: Mini Calendar (Left) | Scrollable Upcoming Events (Right) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 lg:pt-3 flex-1 items-stretch min-h-0">
                {/* Left: Tight Mini Month Calendar with expanding date grid */}
                <div className="sm:col-span-6 h-full flex flex-col min-h-0">
                  <HeroMiniCalendar events={events} getCatStyle={getCatStyle} />
                </div>

                {/* Right: Upcoming Events List with Quick Add Event Button */}
                <div className="sm:col-span-6 h-full board p-2.5 sm:p-3 flex flex-col justify-between bg-[var(--surface-2)]/60 min-h-0">
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 shrink-0">
                      <span className="label text-xs sm:text-[0.8125rem] font-bold text-[var(--color-present)]">UPCOMING EVENTS</span>
                      <button
                        type="button"
                        className="label text-xs font-bold text-[var(--color-present)] hover:underline flex items-center gap-1.5 cursor-pointer"
                        onClick={() => setShowAddEvent(true)}
                      >
                        <Plus size={13} strokeWidth={2.5} /> ADD EVENT
                      </button>
                    </div>

                    <div className="mt-2 space-y-1.5 sm:space-y-2 flex-1 overflow-y-auto pr-1 min-h-0">
                      {upcomingEvents.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center py-2">
                          <p className="label muted text-xs sm:text-sm">NO UPCOMING EVENTS</p>
                        </div>
                      ) : (
                        upcomingEvents.map((evt) => {
                          const catStyle = getCatStyle(evt.category)
                          const isEvtToday = evt.date === todayDateStr
                          return (
                            <div
                              key={evt.id}
                              className="flex items-center justify-between gap-2 text-xs p-1.5 sm:p-2 rounded border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-all border-l-4"
                              style={{ borderLeftColor: catStyle.bg }}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-1">
                                <span
                                  className="size-2 rounded-full shrink-0 border border-black/30"
                                  style={{ background: catStyle.bg }}
                                />
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="truncate text-xs sm:text-sm font-bold" title={evt.title}>
                                    {evt.title}
                                  </span>
                                  {isEvtToday && (
                                    <span
                                      className="px-1 py-0.5 text-[0.55rem] font-black rounded uppercase tracking-wider shadow-2xs shrink-0"
                                      style={{ background: 'var(--color-acid)', color: 'var(--on-accent)' }}
                                    >
                                      TODAY
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span
                                className="chip !py-0.5 !px-2 text-[0.6875rem] font-bold shrink-0 border transition-all"
                                style={{
                                  borderColor: catStyle.bg,
                                  backgroundColor: `color-mix(in srgb, ${catStyle.bg} 18%, var(--surface))`,
                                  color: 'var(--text)',
                                }}
                              >
                                {fmtDateDDMMYYYY(evt.date)}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* READINGS TILES - 4 EQUAL CARDS (hidden on mobile, visible on desktop) */}
            <section className="hidden lg:grid lg:order-2 sm:grid-cols-4 gap-3 sm:gap-3 shrink-0">
              {/* 1. ATTENDANCE (CIRCULAR PROGRESS GAUGE + MARGIN) */}
              <Link
                to="/attendance"
                className="board board-hard tile-link flex flex-col justify-between p-3.5 sm:p-4 border-l-4 border-l-[var(--color-coral)] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
              >
                <p className="label flex items-center justify-between gap-1.5 text-xs font-bold text-[var(--color-coral)]">
                  <span className="truncate">ATTENDANCE</span>
                  <ArrowRight size={14} strokeWidth={2.5} className="shrink-0" aria-hidden />
                </p>

                <div className="flex items-center gap-3 my-1.5 flex-1">
                  <div className="relative shrink-0 size-16 sm:size-20">
                    <svg viewBox="0 0 52 52" className="size-full -rotate-90" aria-hidden>
                      <circle
                        cx="26"
                        cy="26"
                        r="21"
                        fill="none"
                        strokeWidth="5"
                        className="stroke-[var(--border)]"
                      />
                      <circle
                        cx="26"
                        cy="26"
                        r="21"
                        fill="none"
                        strokeWidth="5"
                        stroke={attendance.percent === null ? 'var(--border)' : STATUS_COLOR[st]}
                        strokeDasharray={`${filledCircle} ${circumference}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="heading text-base sm:text-xl font-extrabold leading-none">
                        {attendance.percent === null ? '—' : `${Math.round(attendance.percent)}%`}
                      </span>
                    </div>
                  </div>

                  <span
                    className="heading text-lg sm:text-[22px] font-extrabold leading-none min-w-0"
                    style={{
                      color:
                        attendance.percent === null
                          ? 'var(--muted)'
                          : st === 'short'
                            ? 'var(--absent-ink)'
                            : st === 'edge'
                              ? 'var(--warn-ink)'
                              : 'var(--present-ink)',
                    }}
                  >
                    {attendanceWord}
                  </span>
                </div>
              </Link>

              {/* 2. NEXT MEAL */}
              <Link
                to="/mess"
                className="board board-hard tile-link flex flex-col justify-between p-3.5 sm:p-4 border-l-4 border-l-[var(--color-amber)] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
              >
                <p className="label flex items-center justify-between gap-1.5 text-xs font-bold text-[var(--color-amber)]">
                  <span className="truncate">NEXT MEAL</span>
                  <ArrowRight size={14} strokeWidth={2.5} className="shrink-0" aria-hidden />
                </p>
                <p className="heading mt-2 text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                  {nextMealInfo.isTomorrow ? `TOMORROW'S ${meal.label}` : meal.label}
                </p>
                <p className="label mt-1.5 text-xs sm:text-[0.8125rem] font-medium muted truncate">
                  {meal.time}
                </p>
              </Link>

              {/* 3. CLASSES LEFT (WITH LIVE / UPCOMING ROOM & COUNTDOWN) */}
              <Link
                to="/home"
                className="board board-hard tile-link flex flex-col justify-between p-3.5 sm:p-4 border-l-4 border-l-[var(--color-present)] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
              >
                <p className="label flex items-center justify-between gap-1.5 text-xs font-bold text-[var(--color-present)]">
                  <span className="truncate">CLASSES LEFT</span>
                  <ArrowRight size={14} strokeWidth={2.5} className="shrink-0" aria-hidden />
                </p>
                <p className="heading mt-2 text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                  {remaining}
                </p>
                <p className="label mt-1.5 text-xs sm:text-[0.8125rem] font-medium muted truncate" title={classNote}>
                  {classNote}
                </p>
              </Link>

              {/* 4. MORE TOOLS (INFO) */}
              <Link
                to="/info"
                className="board board-hard tile-link flex flex-col justify-between p-3.5 sm:p-4 border-l-4 border-l-[var(--color-sky)] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
              >
                <p className="label flex items-center justify-between gap-1.5 text-xs font-bold text-[var(--color-sky)]">
                  <span className="truncate">INFO</span>
                  <ArrowRight size={14} strokeWidth={2.5} className="shrink-0" aria-hidden />
                </p>
                <p className="heading mt-2 text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                  MORE TOOLS
                </p>
                <p className="label mt-1.5 text-xs sm:text-[0.8125rem] font-medium muted truncate">
                  MAPS, CGPA & PYQ
                </p>
              </Link>
            </section>
          </div>

          {/* ---- RIGHT COLUMN: Glance Control Widgets (order-1 on mobile, order-2 on desktop) ---- */}
          <div className="order-1 lg:order-2 lg:col-span-5 flex flex-col gap-3 lg:gap-4 h-full min-h-0">
            {/* Timetable Widget: 3-day scroll on mobile, 5-day full view on desktop */}
            <div className="flex flex-col h-[calc(100dvh*450/956)] lg:h-auto lg:flex-[1.25] lg:min-h-0 shrink-0 lg:shrink">
              <VisualTimetableWidget
                sessions={effectiveSessions}
                day={day}
                mins={mins}
                profile={profile}
                year={year}
              />
            </div>

            {/* Mobile Only: Next Meal */}
            <div className="lg:hidden flex-1 flex flex-col min-h-[260px]">
              <MessWidget mins={mins} day={day} profile={profile} />
            </div>

            {/* Desktop Only: Student To-Dos */}
            <div className="hidden lg:flex flex-1 flex-col min-h-0">
              <TodoWidget />
            </div>
          </div>
        </div>

        <Disclaimers className="shrink-0 pt-1" />
      </div>

      {/* QUICK ADD EVENT MODAL */}
      {showAddEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="board board-hard w-full max-w-md p-4 sm:p-5 bg-[var(--surface)] shadow-hard-lg border-2 border-[var(--color-present)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-[var(--color-present)]" />
                <h3 className="heading text-base font-bold text-[var(--color-present)]">QUICK ADD EVENT</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEvent(false)}
                className="p-1 muted hover:text-[var(--primary)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="label text-[0.65rem] muted block mb-1">EVENT TITLE</label>
                <input
                  type="text"
                  className="field w-full text-xs font-bold"
                  placeholder="e.g. Lab Viva, Quiz, Project Deadline..."
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-[0.65rem] muted block mb-1">DATE</label>
                  <input
                    type="date"
                    className="field w-full text-xs font-bold"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label text-[0.65rem] muted block mb-1">CATEGORY</label>
                  <select
                    className="field w-full text-xs font-bold"
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  className="btn text-xs font-bold px-3 py-1.5 cursor-pointer"
                  onClick={() => setShowAddEvent(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="btn text-xs font-bold px-4 py-1.5 cursor-pointer bg-[var(--color-present)] text-[var(--on-accent)] border-[var(--color-present)]"
                >
                  SAVE EVENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
