import { Link, useNavigate } from 'react-router-dom'
import { Moon, Repeat, Sun } from 'lucide-react'
import { avatarOf, useProfile, useTheme } from '../lib/storage'
import { inkFor } from '../lib/palette'

/**
 * The one mobile masthead. Both shells render this, so the swap button can
 * never shift a control by a pixel.
 *
 * Geometry is fixed here and identical across variants:
 *   - every control is a 34px (size-8.5) square
 *   - gap-3 between logo and wordmark, gap-2 inside the right cluster
 *   - order is always: [swap] WORDMARK ......... [theme] [avatar]
 *   - the control row sits 16px from the top of its shell, 8px above whatever
 *     follows it, so the two headers line up when you swap between them
 *   - never sticky; it scrolls with the page
 *
 * `variant` changes ONLY colour: 'band' is the purple full-bleed bar used by
 * Shell, 'paper' is the bare masthead used by the Landing dashboard.
 */

const CONTROL =
  'grid size-8.5 shrink-0 place-items-center border-2 border-[var(--border)] cursor-pointer transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5'

export default function AppHeader({ variant = 'paper' }) {
  const { profile } = useProfile()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const band = variant === 'band'

  // Swap target: the band (inner pages) goes back to the dashboard, the
  // dashboard goes into the workspace.
  const swapTo = band ? '/' : '/home'
  const swapLabel = band ? 'Go to Dashboard' : 'Open Workspace / Timetable'
  const swapBg = band ? 'var(--color-acid)' : 'var(--color-present)'

  const avatarBg =
    profile.avatarColor === '#111827' ? 'var(--text)' : profile.avatarColor || 'var(--color-sky)'
  const avatarInk = avatarBg === 'var(--text)' ? 'var(--bg)' : inkFor(avatarBg)

  return (
    <div
      className={`flex items-center justify-between gap-3 pb-2 ${
        band ? 'border-b-2 border-[var(--border)] px-4 pt-4' : ''
      }`}
      style={band ? { background: '#6C63FF' } : undefined}
    >
      {/* Left: swap tile + wordmark */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(swapTo)}
          className={`${CONTROL} shadow-sm`}
          style={{ background: swapBg, color: 'var(--on-accent)' }}
          title={swapLabel}
          aria-label={swapLabel}
        >
          <Repeat size={16} strokeWidth={3} color="var(--on-accent)" />
        </button>
        <span
          className="display truncate text-2xl font-black uppercase leading-none tracking-wide select-text cursor-text"
          style={band ? { color: '#fff' } : undefined}
        >
          NITKKR DESK
        </span>
      </div>

      {/* Right: theme toggle, then avatar */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className={`btn btn-punk-toggle ${CONTROL} !gap-0 !p-0`}
          onClick={(e) => toggle(e)}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={14} strokeWidth={2.5} /> : <Moon size={14} strokeWidth={2.5} />}
        </button>

        <Link
          to="/profile"
          className={`${CONTROL} relative font-black shadow-hard-sm ${
            profile.avatarEmoji ? 'avatar-emoji-box' : 'text-xs tracking-widest'
          }`}
          style={{ background: avatarBg, color: avatarInk }}
          title="Profile"
          aria-label="Profile"
        >
          <span className={profile.avatarEmoji ? 'avatar-emoji' : ''}>
            {avatarOf(profile)}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-present)] opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full border border-[var(--surface)] bg-[var(--color-present)]" />
          </span>
        </Link>
      </div>
    </div>
  )
}
