import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardCheck, Info, Moon, Sun, UtensilsCrossed } from 'lucide-react'
import Intro from '../components/Intro'
import { initialsOf, useProfile, useRollcallSettings, useTheme } from '../lib/storage'
import { branchName, hostelName } from '../data/campus'
import { coursesOf, currentSession, nextSession, sessionsForDay, useBoard } from '../lib/board'
import { currentMeal } from '../data/mess'
import { status, tally, useRollcall } from '../lib/rollcall'
import { dayCode, fmtRange, fmtTime, minutesNow } from '../lib/time'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

const NAV = [
  { to: '/home', icon: CalendarDays, label: 'BOARD' },
  { to: '/mess', icon: UtensilsCrossed, label: 'MESS' },
  { to: '/rollcall', icon: ClipboardCheck, label: 'ROLL CALL' },
  { to: '/info', icon: Info, label: 'INFO' },
]

/**
 * The one question this page exists to answer: what is happening, and when.
 *
 * This is the page's SIGNAL (design.md §3.3) — it takes the strong colour and
 * the top of the page, so that everything else staying quiet means something.
 */
function signalFor({ live, next, mins, onboarded }) {
  if (!onboarded) {
    return {
      eyebrow: 'NOT SET UP YET',
      title: 'PICK YOUR BRANCH',
      detail: 'Choose a branch and year, and the board fills itself in.',
      tone: 'var(--color-amber)',
    }
  }
  if (live) {
    const left = live.end - mins
    return {
      eyebrow: 'IN SESSION NOW',
      title: live.name,
      detail: [live.room, `until ${fmtTime(live.end)}`, live.code].filter(Boolean).join(' · '),
      note: left <= 60 ? `${left} MIN LEFT` : null,
      tone: 'var(--color-present)',
    }
  }
  if (next) {
    const until = next.start - mins
    return {
      eyebrow: until <= 60 ? `NEXT IN ${until} MIN` : 'NEXT UP',
      title: next.name,
      detail: [next.room, fmtRange(next.start, next.end), next.code].filter(Boolean).join(' · '),
      tone: 'var(--color-sky)',
    }
  }
  return {
    eyebrow: 'NOTHING LEFT TODAY',
    title: 'YOU ARE DONE',
    detail: 'No more classes on the board today.',
    tone: 'var(--color-present)',
  }
}

export default function Landing() {
  const { profile, year, onboarded } = useProfile()
  const { theme, toggle } = useTheme()
  const { sessions } = useBoard(profile.branch, year)
  const { marks } = useRollcall()
  const [settings] = useRollcallSettings()
  const now = useClock()
  const navigate = useNavigate()

  const mins = minutesNow(now)
  const day = dayCode(now)
  const live = currentSession(sessions, day, mins)
  const next = nextSession(sessions, day, mins)
  const meal = currentMeal(mins)
  const signal = signalFor({ live, next, mins, onboarded })

  const attendance = useMemo(() => {
    const ids = coursesOf(sessions).flatMap((c) => c.sessions.map((s) => s.id))
    return tally(marks, ids, settings.trackingSince)
  }, [marks, sessions, settings.trackingSince])

  // Classes still to come today, breaks excluded — "how much is left".
  const remaining = useMemo(
    () => sessionsForDay(sessions, day).filter((s) => s.type !== 'break' && s.end > mins).length,
    [sessions, day, mins],
  )

  const clock = now
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    .toUpperCase()
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()

  const st = status(attendance.percent, settings.required)

  // Values render in --text, not an accent. The accent tokens are FILLS,
  // bright enough to carry ink text; as foreground on --surface they fail
  // contrast outright (--color-sky on white is 1.67:1).
  //
  // Attendance is the one tile with real state, so it carries a word as well
  // as a colour — §12: "Do not use color alone to communicate critical
  // status." The colour comes from the *-ink tokens, which are readable.
  const attendanceWord =
    attendance.percent === null
      ? 'NOTHING LOGGED'
      : st === 'short'
        ? 'BELOW TARGET'
        : st === 'edge'
          ? 'CUTTING IT FINE'
          : 'ON TRACK'

  const tiles = [
    {
      label: 'ATTENDANCE',
      value: attendance.percent === null ? '—' : `${Math.round(attendance.percent)}%`,
      note: attendanceWord,
      noteColor:
        attendance.percent === null
          ? 'var(--muted)'
          : st === 'short'
            ? 'var(--absent-ink)'
            : st === 'edge'
              ? 'var(--warn-ink)'
              : 'var(--present-ink)',
      to: '/rollcall',
    },
    {
      label: 'NEXT MEAL',
      value: meal.label,
      note: meal.time,
      to: '/mess',
    },
    {
      label: 'LEFT TODAY',
      value: String(remaining),
      note: remaining === 1 ? 'CLASS REMAINING' : 'CLASSES REMAINING',
      to: '/home',
    },
  ]

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Intro />

      {/* WORLD (§3.1) — atmosphere only: behind the content, no pointer
          events, and faded out before it reaches the information layer. */}
      <div className="world world-grain" aria-hidden />
      <div
        className="world world-halftone"
        style={{
          color: 'var(--primary)',
          maskImage: 'linear-gradient(180deg, #000, transparent 62%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 62%)',
        }}
        aria-hidden
      />
      {/* Oversized background typography. Anchored to the bottom edge so it
          never sits underneath body text (§3.1), and hidden on small screens
          where §13 asks for reduced decorative complexity. */}
      <p className="ghost-type absolute -bottom-6 -left-4 z-0 hidden text-[13rem] sm:block" aria-hidden>
        NITKKR
      </p>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        {/* The wordmark lives up here now, small. This page's job is to
            answer a question, not to reintroduce itself every visit. */}
        <header className="flex items-center justify-between gap-4">
          <span className="display text-2xl sm:text-3xl">nitkkr board</span>
          <div className="flex items-center gap-3">
            <span className="label muted hidden sm:inline">
              {clock} · {weekday}
            </span>
            <button
              type="button"
              className="btn !px-2.5"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={15} strokeWidth={2.5} /> : <Moon size={15} strokeWidth={2.5} />}
            </button>
          </div>
        </header>

        <hr className="rule-ink mt-4" />

        {/* ---- SIGNAL ---- */}
        <section className="mt-10 sm:mt-14">
          <div className="flex flex-wrap items-center gap-2">
            <span className="sticker" style={{ background: signal.tone }}>
              {signal.eyebrow}
            </span>
            {signal.note ? <span className="sticker sticker-flip">{signal.note}</span> : null}
          </div>

          <h1 className="heading mt-5 text-5xl sm:text-7xl">{signal.title}</h1>
          <p className="mt-3 text-sm font-medium">{signal.detail}</p>

          {onboarded ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {profile.name ? (
                <span
                  className="grid size-6 place-items-center text-[0.6rem] font-bold"
                  style={{ background: 'var(--color-amber)', color: 'var(--color-ink)', borderRadius: 2 }}
                  aria-hidden
                >
                  {initialsOf(profile.name)}
                </span>
              ) : null}
              <span className="chip">
                {branchName(profile.branch)} · Y{year}
              </span>
              <span className="chip">{hostelName(profile.hostel)}</span>
            </div>
          ) : (
            /* Before onboarding there is no branch or hostel to report. The
               previous build printed the DEFAULT_BRANCH / DEFAULT_HOSTEL
               fallbacks as chips here, asserting a branch and hostel the
               student never picked — directly underneath a headline saying
               nothing was set up yet. */
            <button
              type="button"
              className="btn btn-primary mt-6 w-full !py-3.5 sm:w-auto sm:!px-10"
              onClick={() => navigate('/select/branch')}
            >
              PICK YOUR BRANCH
            </button>
          )}
        </section>

        {/* ---- INTERFACE ---- quiet on purpose, so the signal stays a signal */}
        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <Link key={t.label} to={t.to} className="board board-hard block p-4">
              <p className="label muted">{t.label}</p>
              <p className="heading mt-1.5 text-3xl">{t.value}</p>
              <p
                className={`label mt-1.5 ${t.noteColor ? '' : 'muted'}`}
                style={t.noteColor ? { color: t.noteColor } : undefined}
              >
                {t.note}
              </p>
            </Link>
          ))}
        </section>

        <nav className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="btn !justify-start !py-3">
              <n.icon size={15} strokeWidth={2.5} />
              {n.label}
            </Link>
          ))}
        </nav>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-2">
          <p className="label muted">EVERYTHING STAYS ON THIS DEVICE.</p>
          <p className="label muted">UNOFFICIAL · NOT AFFILIATED WITH NIT KURUKSHETRA</p>
        </footer>
      </div>
    </div>
  )
}
