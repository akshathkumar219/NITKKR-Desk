import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import PlainShell from '../components/PlainShell'
import { Eyebrow } from '../ui'
import { HUB_TILES } from '../data/hubs'
import { inkFor } from '../lib/palette'

export default function SelectInfo() {
  return (
    <PlainShell back="/">
      <Eyebrow icon={Info}>INFO SELECTION</Eyebrow>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-5xl sm:text-6xl">
          select
          <br />
          your info
        </h1>
        <p className="label muted max-w-xs sm:text-right">
          EDIT YOUR PROFILE, OPEN THE TOOLKIT, OR JUMP TO CAMPUS TOOLS.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HUB_TILES.map((t) => {
            const iconColor = t.neutral ? 'var(--text)' : inkFor(t.bg)
            return (
              <Link
                key={t.to}
                to={t.to}
                className="board board-hard flex items-start gap-3 p-3.5 sm:p-4 transition-transform hover:-translate-y-0.5"
                style={{ transitionDuration: 'var(--dur-fast)' }}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center border-2 border-[var(--border)]"
                  style={{
                    background: t.neutral ? 'var(--surface)' : t.bg,
                    color: iconColor,
                    borderRadius: 2,
                  }}
                  aria-hidden
                >
                  <t.icon size={16} strokeWidth={2.5} />
                </span>
                <span className="min-w-0">
                  <span className="heading block text-base">{t.title}</span>
                  <span className="label muted mt-1 block">{t.sub}</span>
                </span>
              </Link>
            )
          })}
      </div>
    </PlainShell>
  )
}
