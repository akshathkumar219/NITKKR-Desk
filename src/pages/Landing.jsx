import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Info, Moon, Sun, UtensilsCrossed } from 'lucide-react'
import { Panel } from '../ui'
import { initialsOf, useProfile, useTheme } from '../lib/storage'
import { branchName, hostelName } from '../data/campus'
import { useBoard, currentSession, nextSession } from '../lib/board'
import { currentMeal } from '../data/mess'
import { dayCode, fmtRange, minutesNow } from '../lib/time'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function Landing() {
  const { profile, year, onboarded } = useProfile()
  const { theme, toggle } = useTheme()
  const { sessions } = useBoard(profile.branch, year)
  const now = useClock()
  const navigate = useNavigate()

  const mins = minutesNow(now)
  const day = dayCode(now)
  const live = currentSession(sessions, day, mins)
  const next = nextSession(sessions, day, mins)
  const meal = currentMeal(mins)

  const clock = now
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    .toUpperCase()
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()

  let headline = 'NOTHING ON THE BOARD YET.'
  let detail = 'Pick a branch and the board fills itself in.'
  if (onboarded && live) {
    headline = 'IN SESSION NOW.'
    detail = `${live.name}${live.room ? ` · ${live.room}` : ''} · until ${fmtRange(live.start, live.end).split('–')[1]}`
  } else if (onboarded && next) {
    headline = 'NEXT DEPARTURE.'
    detail = `${next.name}${next.room ? ` · ${next.room}` : ''} at ${fmtRange(next.start, next.end)}`
  } else if (onboarded) {
    headline = 'BOARD IS CLEAR.'
    detail = 'Nothing else scheduled today.'
  }

  const tiles = onboarded
    ? [
        {
          to: '/home',
          icon: CalendarDays,
          accent: 'var(--color-sky)',
          title: 'TIMETABLE',
          sub: `${branchName(profile.branch)} · YEAR ${year}`,
        },
        {
          to: '/mess',
          icon: UtensilsCrossed,
          accent: 'var(--color-coral)',
          title: 'MESS BOARD',
          sub: `${hostelName(profile.hostel)} · ${meal.label}`,
        },
        {
          to: '/info',
          icon: Info,
          accent: 'var(--color-acid)',
          title: 'INFO',
          sub: 'PROFILE, TOOLS AND CAMPUS INFO',
        },
      ]
    : [
        {
          to: '/select/branch',
          icon: CalendarDays,
          accent: 'var(--color-sky)',
          title: 'PICK YOUR BRANCH',
          sub: 'YEAR AND DEPARTMENT',
        },
        {
          to: '/select/hostel',
          icon: UtensilsCrossed,
          accent: 'var(--color-coral)',
          title: 'PICK YOUR HOSTEL',
          sub: 'FOR THE RIGHT MESS MENU',
        },
        {
          to: '/select/info',
          icon: Info,
          accent: 'var(--color-acid)',
          title: 'INFO',
          sub: 'PROFILE, TOOLS AND CAMPUS INFO',
        },
      ]

  return (
    <div className="min-h-dvh px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex justify-end">
          <button type="button" className="btn" onClick={toggle}>
            {theme === 'dark' ? <Sun size={14} strokeWidth={2.5} /> : <Moon size={14} strokeWidth={2.5} />}
            {theme === 'dark' ? 'LIGHT' : 'DARK'} MODE
          </button>
        </div>

        <div className="text-center">
          <span className="chip" style={{ background: 'var(--color-acid)', color: 'var(--color-ink)' }}>
            STUDENT DEPARTURE BOARD
          </span>
          <h1 className="heading mt-5 text-6xl sm:text-8xl">
            NITKKR
            <br />
            BOARD
          </h1>
        </div>

        <Panel className="mt-10 p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <span className="chip" style={{ gap: '0.4rem' }}>
              <span
                className="animate-live inline-block size-2 rounded-full"
                style={{ background: 'var(--color-present)' }}
                aria-hidden
              />
              BOARD · LIVE
            </span>
            <span className="label muted">
              {clock} · {weekday}
            </span>
          </div>

          <div className="mt-5 flex items-start gap-4">
            <span
              className="grid size-12 shrink-0 place-items-center border-2 border-[var(--border)] font-mono text-sm font-bold"
              style={{ background: 'var(--color-amber)', borderRadius: 2, color: 'var(--color-ink)' }}
              aria-hidden
            >
              {initialsOf(profile.name)}
            </span>
            <div className="min-w-0">
              <h2 className="heading text-2xl sm:text-3xl">{headline}</h2>
              <p className="mt-2 text-sm font-medium">{detail}</p>
            </div>
          </div>

          <p className="label muted mt-4">EVERYTHING STAYS ON THIS DEVICE.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">
              {profile.branch} · Y{year}
            </span>
            <span className="chip">{profile.hostel}</span>
          </div>

          <button
            type="button"
            className="btn btn-primary mt-5 w-full !py-3.5"
            onClick={() => navigate(onboarded ? '/home' : '/select/branch')}
          >
            {onboarded ? 'OPEN THE BOARD' : 'PICK YOUR BRANCH'}
          </button>

          <p className="label muted mt-3">
            WRONG NAME, BRANCH OR HOSTEL? INFO → EDIT PROFILE.
          </p>
        </Panel>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {tiles.map((t) => (
            <Link key={t.to} to={t.to} className="board board-hard block p-5 transition-transform hover:-translate-y-0.5">
              <span
                className="grid size-10 place-items-center border-2 border-[var(--border)]"
                style={{ background: t.accent, borderRadius: 'var(--radius-board)' }}
                aria-hidden
              >
                <t.icon size={18} strokeWidth={2.5} color="var(--color-ink)" />
              </span>
              <p className="heading mt-4 text-lg">{t.title}</p>
              <p className="label muted mt-1.5">{t.sub}</p>
            </Link>
          ))}
        </div>

        <p className="label muted mt-10 text-center">
          UNOFFICIAL STUDENT PROJECT · NOT AFFILIATED WITH NIT KURUKSHETRA
        </p>
      </div>
    </div>
  )
}
