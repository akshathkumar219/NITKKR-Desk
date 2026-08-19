import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, Info, Moon, Sun, UtensilsCrossed, Repeat, ClipboardCheck } from 'lucide-react'
import { initialsOf, useProfile, useTheme } from '../lib/storage'

const NAV = [
  { to: '/home', label: 'BOARD', icon: CalendarDays },
  { to: '/mess', label: 'MESS', icon: UtensilsCrossed },
  { to: '/rollcall', label: 'ROLL CALL', icon: ClipboardCheck },
  { to: '/info', label: 'INFO', icon: Info },
]

function NavItem({ to, label, icon: Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `btn w-full !justify-start ${isActive ? '!bg-[var(--primary)] !border-[var(--primary)] !text-[var(--on-primary)]' : ''}`
      }
    >
      <Icon size={16} strokeWidth={2.5} aria-hidden />
      {label}
    </NavLink>
  )
}

export default function Shell({ children }) {
  const { profile, year } = useProfile()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const identity = `${profile.branch} · Y${year} · ${profile.hostel}`

  return (
    <div className="min-h-dvh lg:flex">
      {/* ---- Sidebar (desktop) ---- */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r-2 border-[var(--border)] lg:flex">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 border-b-2 border-[var(--border)] px-4 py-4 text-left"
          style={{ background: 'var(--color-brand)' }}
        >
          <span
            className="grid size-9 shrink-0 place-items-center border-2 border-[var(--border)] bg-white"
            style={{ borderRadius: 'var(--radius-board)' }}
            aria-hidden
          >
            <Repeat size={17} strokeWidth={3} color="var(--color-ink)" />
          </span>
          <span className="display text-xl leading-none text-white">
            nitkkr
            <br />
            board
          </span>
        </button>

        <nav className="flex flex-col gap-2 p-3">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t-2 border-[var(--border)] p-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn" onClick={toggle}>
              {theme === 'dark' ? <Sun size={14} strokeWidth={2.5} /> : <Moon size={14} strokeWidth={2.5} />}
              {theme === 'dark' ? 'LIGHT' : 'DARK'}
            </button>
            <button type="button" className="btn" onClick={() => navigate('/about')}>
              ABOUT
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => navigate('/select/branch')}
          >
            CHANGE BRANCH
          </button>
          <button
            type="button"
            className="board flex w-full items-center gap-3 p-2.5 text-left"
            onClick={() => navigate('/profile')}
          >
            <span
              className="grid size-9 shrink-0 place-items-center border-2 border-[var(--border)] text-xs font-bold"
              style={{ background: 'var(--color-acid)', borderRadius: 2, color: 'var(--color-ink)' }}
              aria-hidden
            >
              {initialsOf(profile.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">
                {profile.name || 'SET NAME'}
              </span>
              <span className="label muted block truncate">{identity}</span>
            </span>
          </button>
        </div>
      </aside>

      {/* ---- Main ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b-2 border-[var(--border)] px-4 py-3 lg:hidden"
          style={{ background: 'var(--color-brand)' }}
        >
          <button
            type="button"
            className="display text-lg leading-none text-white"
            onClick={() => navigate('/')}
          >
            NITKKR BOARD
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn !px-2 !py-1.5"
              onClick={toggle}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={14} strokeWidth={2.5} /> : <Moon size={14} strokeWidth={2.5} />}
            </button>
            <button
              type="button"
              className="btn !px-2 !py-1.5"
              onClick={() => navigate('/profile')}
              aria-label="Profile"
            >
              {initialsOf(profile.name)}
            </button>
          </div>
        </header>

        <main className="world-grain relative flex-1 space-y-4 p-3 pb-24 sm:p-5 lg:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t-2 border-[var(--border)] bg-[var(--bg)] p-2 lg:hidden"
          aria-label="Primary"
        >
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                className="btn !flex-col !gap-1 !px-1 !py-2 !text-[0.55rem]"
                style={
                  active
                    ? {
                        background: 'var(--primary)',
                        borderColor: 'var(--primary)',
                        color: 'var(--on-primary)',
                      }
                    : undefined
                }
              >
                <Icon size={16} strokeWidth={2.5} aria-hidden />
                {label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
