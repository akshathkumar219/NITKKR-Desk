import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import {
  ArrowRight,
  Calendar,
  ClipboardCheck,
  Clock,
  LayoutGrid,
  Moon,
  Repeat,
  Sun,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import AppHeader from './AppHeader'
import { avatarOf, useProfile, useTheme } from '../lib/storage'
import { inkFor } from '../lib/palette'

const NAV = [
  { to: '/home', label: 'TIMETABLE', icon: Clock, color: 'var(--color-violet)' },
  { to: '/attendance', label: 'ATTENDANCE', icon: ClipboardCheck, color: 'var(--color-coral)' },
  { to: '/mess', label: 'MESS MENU', icon: UtensilsCrossed, color: 'var(--color-amber)' },
  { to: '/calendar', label: 'CALENDAR', icon: Calendar, color: 'var(--color-acid)' },
  { to: '/info', label: 'MORE TOOLS', icon: LayoutGrid, color: 'var(--color-sky)' },
]

// Global session state for mobile guide banner dismissal (persists across navigation, resets on browser reload)
let isGuideBannerDismissed = false
const guideBannerListeners = new Set()

function setGlobalGuideBannerDismissed(dismissed) {
  isGuideBannerDismissed = dismissed
  guideBannerListeners.forEach((listener) => listener(dismissed))
}

function useGuideBannerDismissed() {
  const [dismissed, setDismissed] = useState(isGuideBannerDismissed)
  useEffect(() => {
    guideBannerListeners.add(setDismissed)
    return () => guideBannerListeners.delete(setDismissed)
  }, [])
  return [dismissed, setGlobalGuideBannerDismissed]
}

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
  const { pathname } = useLocation()
  const [isBannerDismissed, setBannerDismissed] = useGuideBannerDismissed()

  const identity = `${profile.branch} · Y${year} · ${profile.hostel}`

  // Show guide banner on all pages except Dashboard (/ or /dashboard) and Guide page (/guide)
  const showGuideBanner = !isBannerDismissed && pathname !== '/' && pathname !== '/dashboard' && pathname !== '/guide'

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
            <div className="relative">
              <button
                type="button"
                className="btn w-full font-bold text-xs sm:text-sm tracking-wider uppercase !justify-center cursor-pointer"
                onClick={() => navigate('/guide')}
              >
                GUIDE
              </button>
              <span
                className="sticker absolute -top-2.5 -right-2 pointer-events-none !px-1.5 !py-0.5 !text-[10.5px] !font-black !tracking-wider !leading-none z-20"
                style={{
                  backgroundColor: 'var(--color-lime)',
                  color: 'var(--color-ink)',
                  transform: 'rotate(7.5deg)',
                }}
              >
                NEW
              </span>
            </div>
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

          {/* Mobile Guide Banner Notification (Shown on all pages except Dashboard and Guide) */}
          {showGuideBanner ? (
            <div className="px-3 pt-3 sm:px-5">
              <div
                className="board board-hard flex items-center justify-between p-2 sm:p-2.5 transition-transform active:scale-[0.99] cursor-pointer"
                style={{
                  background: 'var(--color-lime)',
                  color: theme === 'dark' ? '#111111' : '#ffffff',
                }}
                onClick={() => navigate('/guide')}
              >
                {/* Left: Cross Icon in a Box */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setBannerDismissed(true)
                  }}
                  className="grid size-8 shrink-0 place-items-center border-2 border-current rounded-[3px] shadow-sm cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  style={{ color: 'inherit' }}
                  aria-label="Dismiss Guide notification"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>

                {/* Center: Text GUIDE (20px) */}
                <div className="flex items-center flex-1 ml-3">
                  <span
                    className="font-black text-[20px] leading-none tracking-wider uppercase"
                    style={{ color: 'inherit' }}
                  >
                    GUIDE
                  </span>
                </div>

                {/* Right: Arrow in a Box */}
                <div
                  className="grid size-8 shrink-0 place-items-center border-2 border-current rounded-[3px] shadow-sm"
                  style={{ color: 'inherit' }}
                >
                  <ArrowRight size={17} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <main className="world-grain relative flex-1 space-y-4 p-3 pb-24 sm:p-5 lg:pb-8">{children}</main>

        {/* Mobile bottom nav (5 columns) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1.5 border-t-2 border-[var(--border)] bg-[var(--bg)] p-1.5 lg:hidden"
          aria-label="Primary"
        >
          {NAV.map(({ to, label, icon: Icon, color }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                `btn !p-2 transition-all ${
                  isActive
                    ? '!bg-[var(--surface-2)] !border-[var(--text)] shadow-hard-sm'
                    : 'hover:border-[var(--text)] opacity-75 hover:opacity-100'
                }`
              }
            >
              <Icon size={25} strokeWidth={2.5} style={{ color }} aria-hidden />
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
