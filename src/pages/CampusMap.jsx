import { useMemo, useState } from 'react'
import { ExternalLink, Map as MapIcon, Search } from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, Panel } from '../ui'
import { LANDMARKS, LANDMARK_TAGS, MAP_EMBED } from '../data/info'

/** One header dropdown, styled to match the timetable's BRANCH / YEAR / GROUP. */
function Picker({ label, value, onChange, children }) {
  return (
    <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border)] rounded px-2.5 py-1.5 shadow-2xs hover:border-[var(--border-strong)] transition-colors">
      <span className="t-micro muted mr-1.5">
        {label}
      </span>
      <select
        aria-label={label}
        className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  )
}

export default function CampusMap() {
  const [tag, setTag] = useState('ALL')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LANDMARKS.filter(
      (l) =>
        (tag === 'ALL' || l.tag === tag) && (!q || l.name.toLowerCase().includes(q)),
    )
  }, [tag, query])

  return (
    <Shell>
      <div className="space-y-4">
        {/* TOP COMMAND HEADER */}
        <Panel className="board board-hard bg-[var(--surface)] pad-page">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="icon-tile shrink-0"
                style={{
                  background: 'var(--color-orange)',
                  color: 'var(--on-accent)',
                }}
                aria-hidden
              >
                <MapIcon className="icon-lg" strokeWidth={2.5} />
              </div>
              <h1 className="t-masthead text-[var(--text)]">
                MAP
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Picker label="CATEGORY" value={tag} onChange={setTag}>
                {LANDMARK_TAGS.map((t) => (
                  <option key={t} value={t} className="bg-[var(--surface)] text-[var(--text)]">
                    {t}
                  </option>
                ))}
              </Picker>
            </div>
          </div>
        </Panel>

        {/* SEARCH CONTROLS BAR */}
        <Panel className="board board-hard bg-[var(--surface)] pad-tight shrink-0">
          <div className="relative flex-1">
            <Search
              className="icon-micro shrink-0 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50"
              strokeWidth={2}
              aria-hidden
            />
            <input
              className="field !pl-9 uppercase !py-2 text-xs sm:text-sm font-bold"
              placeholder="SEARCH A PLACE..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search places"
            />
          </div>
        </Panel>

        {/* PLACE GRID */}
        {list.length === 0 ? (
          <Panel className="board board-hard bg-[var(--surface)] pad-page text-center">
            <p className="t-section">NO PLACES MATCH</p>
          </Panel>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((l) => (
              <a
                key={l.name}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="board board-hard bg-[var(--surface)] flex items-start justify-between gap-3 pad-card transition-transform hover:-translate-y-0.5"
              >
                <div className="min-w-0">
                  <p className="t-card-title">{l.name}</p>
                  <Chip className="mt-2">{l.tag}</Chip>
                </div>
                <ExternalLink className="icon-micro shrink-0 opacity-60" strokeWidth={2.5} aria-hidden />
              </a>
            ))}
          </div>
        )}

        {/* LIVE MAP */}
        <Panel className="board board-hard bg-[var(--surface)] overflow-hidden !p-0">
          <div className="t-meta muted border-b-2 border-[var(--border)] px-4 py-2.5">
            LIVE MAP · KURUKSHETRA
          </div>
          <iframe
            title="Kurukshetra map"
            src={MAP_EMBED}
            className="h-[420px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Panel>

        <p className="t-meta muted">
          TAP A PLACE TO OPEN DIRECTIONS IN GOOGLE MAPS.
        </p>
      </div>
    </Shell>
  )
}
