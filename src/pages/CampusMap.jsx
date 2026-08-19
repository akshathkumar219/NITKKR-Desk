import { useMemo, useState } from 'react'
import { ExternalLink, MapPin, Search } from 'lucide-react'
import PlainShell from '../components/PlainShell'
import { Chip, Eyebrow, Panel, Segmented } from '../ui'
import { LANDMARKS, LANDMARK_TAGS, MAP_EMBED } from '../data/info'

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
    <PlainShell back="/info" backLabel="BACK TO INFO">
      <Eyebrow icon={MapPin}>CAMPUS NAVIGATION</Eyebrow>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <h1 className="display text-5xl sm:text-6xl">
          campus
          <br />
          map
        </h1>
        <p className="label muted max-w-sm sm:text-right">
          TAP A LANDMARK TO OPEN WALKING DIRECTIONS IN GOOGLE MAPS.
        </p>
      </div>

      <Panel className="mt-8 space-y-3 p-4">
        <Segmented options={LANDMARK_TAGS} value={tag} onChange={setTag} size="sm" />
        <div className="relative">
          <Search
            size={15}
            strokeWidth={2.5}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50"
            aria-hidden
          />
          <input
            className="field !pl-9"
            placeholder="SEARCH LANDMARK"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search landmarks"
          />
        </div>
      </Panel>

      {list.length === 0 ? (
        <Panel className="mt-4 p-8 text-center">
          <p className="heading text-lg">NO LANDMARKS MATCH</p>
        </Panel>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((l) => (
            <a
              key={l.name}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="board board-hard flex items-start justify-between gap-3 p-4 transition-transform hover:-translate-y-0.5"
            >
              <div className="min-w-0">
                <p className="heading text-base">{l.name}</p>
                <Chip className="mt-2">{l.tag}</Chip>
              </div>
              <ExternalLink size={15} strokeWidth={2.5} className="shrink-0 opacity-60" aria-hidden />
            </a>
          ))}
        </div>
      )}

      <Panel className="mt-6 overflow-hidden">
        <div className="label muted border-b-2 border-[var(--border)] px-4 py-2.5">
          LIVE MAP · NIT KURUKSHETRA
        </div>
        <iframe
          title="NIT Kurukshetra campus map"
          src={MAP_EMBED}
          className="h-[420px] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Panel>

      <p className="label muted mt-4">
        LANDMARK LINKS SEARCH GOOGLE MAPS BY NAME. FOR EXACT PINS, REPLACE THE
        QUERY WITH LAT/LNG COORDINATES IN SRC/DATA/INFO.JS
      </p>
    </PlainShell>
  )
}
