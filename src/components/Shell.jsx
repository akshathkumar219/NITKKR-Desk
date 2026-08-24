import { NavLink, useNavigate } from 'react-router-dom'

import {
  Calendar,
  ClipboardCheck,
  Clock,
  LayoutGrid,
  Moon,
  Repeat,
  Sun,
  UtensilsCrossed,
} from 'lucide-react'
import AppHeader from './AppHeader'
import { avatarOf, useProfile, useTheme } from '../lib/storage'
import { inkFor } from '../lib/palette'

const NAV = [
  { to: '/home', label: 'TIMETABLE', icon: Clock },
  { to: '/attendance', label: 'ATTENDANCE', icon: ClipboardCheck },
  { to: '/mess', label: 'MESS MENU', icon: UtensilsCrossed },
  { to: '/calendar', label: 'CALENDAR', icon: Calendar },
  { to: '/info', label: 'MORE TOOLS', icon: LayoutGrid },
]

function NavItem({ to, label, icon: Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `btn w-full !justify-start !text-xs sm:!text-sm font-bold tracking-tight uppercase transition-all cursor-pointer ${
          isActive
            ? '!bg-[var(--text)] !border-[var(--text)] !text-[var(--bg)] shadow-hard-sm'
            : 'hover:border-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
        }`
      }
    >
      <Icon size={17} strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Shell({ children }) {
  const { profile, year } = useProfile()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const identity = `${profile.branch} · Y${year} · ${profile.hostel}`


  return (
    <div className="min-h-dvh lg:flex">
      {/* ---- Sidebar (desktop) ---- */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r-2 border-[var(--border)] lg:flex relative overflow-hidden">
        {/* Halftone Dot Grid Background */}
        <div
          className="world world-halftone pointer-events-none absolute inset-0 z-0 opacity-20"
          style={{ color: 'var(--primary)' }}
          aria-hidden
        />

        {/* Top Single-Line Logo Header */}
        <div
          className="relative z-10 flex items-center gap-3 border-b-2 border-[var(--border)] p-6 text-left"
          style={{ background: '#6C63FF' }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            className="grid size-10 shrink-0 place-items-center border-2 border-[var(--border)] bg-[var(--color-acid)] shadow-sm cursor-pointer transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5"
            title="Go to Dashboard"
            aria-label="Go to Dashboard"
          >
            <Repeat size={18} strokeWidth={3} color="var(--on-accent)" />
          </button>
          <span
            className="display leading-none text-white font-black uppercase tracking-wide truncate select-text cursor-text"
            style={{ fontSize: '24px' }}
          >
            NITKKR DESK
          </span>
        </div>

        {/* 5 Navigation Links */}
        <nav className="relative z-10 flex flex-col gap-2 p-3">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Bottom Control Deck */}
        <div className="relative z-10 mt-auto space-y-2 border-t-2 border-[var(--border)] p-3">
          {/* Top Full-Width Theme Toggle */}
          <button
            type="button"
            className="btn btn-punk-toggle w-full !justify-center font-bold text-xs sm:text-sm tracking-wider uppercase cursor-pointer"
            onClick={(e) => toggle(e)}
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={2.5} /> : <Moon size={15} strokeWidth={2.5} />}
            <span>{theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}</span>
          </button>

          {/* 2 Side-by-Side Smaller Buttons: GUIDE & ABOUT */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn font-bold text-xs sm:text-sm tracking-wider uppercase !justify-center cursor-pointer"
              onClick={() => navigate('/guide')}
            >
              GUIDE
            </button>
            <button
              type="button"
              className="btn font-bold text-xs sm:text-sm tracking-wider uppercase !justify-center cursor-pointer"
              onClick={() => navigate('/about')}
            >
              ABOUT
            </button>
          </div>

          {/* Profile Identity Card */}
          {(() => {
            const avatarBg = profile.avatarColor === '#111827' ? 'var(--text)' : (profile.avatarColor || 'var(--color-sky)')
            const textColor = avatarBg === 'var(--text)' ? 'var(--bg)' : inkFor(avatarBg)

            return (
              <button
                type="button"
                className="board flex w-full items-center gap-3 p-2.5 text-left transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer"
                onClick={() => navigate('/profile')}
              >
                <span
                  className={`flex size-9 sm:size-9.5 shrink-0 items-center justify-center border-2 border-[var(--border)] font-black shadow-sm overflow-hidden ${
                    profile.avatarEmoji ? 'avatar-emoji-box' : 'text-[0.6rem] sm:text-xs tracking-widest'
                  }`}
                  style={{ background: avatarBg, borderRadius: 2, color: textColor }}
                  aria-hidden
                >
                  <span
                    className={
                      profile.avatarEmoji
                        ? 'avatar-emoji'
                        : 'inline-flex items-center justify-center leading-none select-none'
                    }
                  >
                    {avatarOf(profile)}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs sm:text-base font-extrabold uppercase">
                    {profile.name || 'SET NAME'}
                  </span>
                  <span className="label muted block truncate text-[0.6875rem] sm:text-xs font-semibold tracking-wider uppercase">{identity}</span>
                </span>
              </button>
            )
          })()}
        </div>
      </aside>

      {/* ---- Main ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — shared masthead (see AppHeader) */}
        <div className="lg:hidden">
          <AppHeader variant="band" />
        </div>

        <main className="world-grain relative flex-1 space-y-4 p-3 pb-24 sm:p-5 lg:pb-8">{children}</main>

        {/* Mobile bottom nav (5 columns) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1.5 border-t-2 border-[var(--border)] bg-[var(--bg)] p-1.5 lg:hidden"
          aria-label="Primary"
        >
          {NAV.map(({ to, label, icon: Icon }) => {
            const shortLabel = label.split(' ')[0]
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `btn !flex-col !gap-1.5 !px-0.5 !py-1.5 !text-[0.6rem] sm:!text-xs font-black uppercase tracking-widest transition-all ${
                    isActive
                      ? '!bg-[var(--text)] !border-[var(--text)] !text-[var(--bg)] shadow-hard-sm'
                      : 'hover:border-[var(--text)]'
                  }`
                }
              >
                <Icon size={16} strokeWidth={2.5} aria-hidden />
                <span className="truncate max-w-[56px]">{shortLabel}</span>
              </NavLink>
            )
          })}

        </nav>
      </div>
    </div>
  )
}
