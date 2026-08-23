import { Link } from 'react-router-dom'
import { ArrowUpRight, LayoutGrid } from 'lucide-react'
import Shell from '../components/Shell'
import { HELP_TILES, HUB_TILES, tileStyle } from '../data/hubs'

export default function InfoHub() {
  return (
    <Shell>
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* TOP CONTROL HEADER */}
        <header className="board board-hard bg-[var(--surface)] pad-page flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="icon-tile shrink-0"
              style={{
                background: 'var(--color-sky)',
                color: 'var(--on-accent)',
              }}
            >
              <LayoutGrid className="icon-lg" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="t-masthead">
                MORE TOOLS
              </h1>
            </div>
          </div>
        </header>

        {/* 6 CORE MODULE TILES GRID */}
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...HUB_TILES, ...HELP_TILES].map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="board board-hard group relative overflow-hidden pad-page transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 shadow-hard-sm hover:shadow-hard min-h-[160px] sm:min-h-[180px] cursor-pointer"
              style={{ ...tileStyle(t) }}
            >
              {/* Oversized watermark icon, kept inside the card so it never clips */}
              <t.icon
                aria-hidden
                strokeWidth={1.5}
                className="pointer-events-none absolute right-3 bottom-3 opacity-[0.16]"
                style={{ width: 132, height: 132 }}
              />

              <div className="relative z-10 flex items-start justify-between gap-2">
                <div className="min-w-0 pr-2">
                  <h2 className="t-card-title" style={{ fontSize: 24 }}>
                    {t.title}
                  </h2>
                  <p className="t-meta mt-1 opacity-80 uppercase tracking-wide">
                    {t.sub}
                  </p>
                </div>
                <span className="grid size-7 shrink-0 place-items-center rounded-sm border border-black/20 bg-black/5 opacity-60 transition-all duration-150 group-hover:opacity-100 group-hover:scale-110">
                  <ArrowUpRight className="icon-sm shrink-0" strokeWidth={2.5} aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  )
}
