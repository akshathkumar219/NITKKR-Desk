import { useMemo, useRef, useState } from 'react'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Compass,
  ExternalLink,
  Map as MapIcon,
  Navigation,
  RotateCcw,
  Search,
  Tag,
  X,
} from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, Panel, Segmented } from '../ui'
import { LANDMARKS, LANDMARK_TAGS, MAP_EMBED } from '../data/info'

// Category accents matching the project map design system
const TAG_STYLES = {
  HOSTEL: { bg: '#60a5fa', label: 'HOSTELS', desc: 'Boys & Girls Campus Hostels' },
  ACADEMIC: { bg: '#facc15', label: 'ACADEMIC', desc: 'Lecture Halls, Departments & Labs' },
  ADMIN: { bg: '#c084fc', label: 'ADMINISTRATION', desc: 'Administrative & Institute Offices' },
  FOOD: { bg: '#c084fc', label: 'FOOD & MARKET', desc: 'Canteens, Cafeterias & Shopping Market' },
  SPORTS: { bg: '#c084fc', label: 'SPORTS', desc: 'Playgrounds, Complex & Athletic Courts' },
  HOUSING: { bg: '#c084fc', label: 'HOUSING', desc: 'Faculty & Staff Residences' },
  ENTRANCE: { bg: 'var(--color-orange)', label: 'ENTRANCES', desc: 'Campus Gates & Main Access Points' },
  NATURE: { bg: 'var(--color-lime)', label: 'NATURE', desc: 'Green Belts, Parks & Eco Zones' },
  TRANSIT: { bg: 'var(--color-sky)', label: 'TRANSIT', desc: 'Railway, Bus Stands & Transit Hubs' },
  HERITAGE: { bg: 'var(--color-violet)', label: 'HERITAGE', desc: 'Historical & Cultural Landmarks' },
  EMERGENCY: { bg: 'var(--color-coral)', label: 'EMERGENCY', desc: 'Hospitals & Medical Care' },
}

// Micro-helper to assign specific pink/blue badge meta to hostels
const getPlaceBadgeMeta = (place) => {
  if (!place) return { bg: 'var(--surface-2)', label: '' }
  if (place.tag === 'HOSTEL') {
    const isGirls =
      place.name.includes('GIRLS') ||
      place.name.startsWith('GH-') ||
      place.name.includes('KALPANA') ||
      place.name.includes('CAUVERY') ||
      place.name.includes('ALAKNANDA') ||
      place.name.includes('BHAGIRATHI')
    if (isGirls) {
      return { bg: '#f472b6', label: 'GIRLS HOSTEL' }
    }
    return { bg: '#60a5fa', label: 'BOYS HOSTEL' }
  }
  return TAG_STYLES[place.tag] || { bg: 'var(--surface-2)', label: place.tag }
}

const KURUKSHETRA_PLACES = [
  {
    name: 'KURUKSHETRA JUNCTION (KKDE)',
    tag: 'TRANSIT',
    desc: 'Main railway station connecting Delhi, Amritsar & Chandigarh (~5 km from campus)',
    url: 'https://www.google.com/maps/dir/?api=1&destination=Kurukshetra%20Junction%20Railway%20Station',
    lat: '29.9723',
    lng: '76.8436',
  },
  {
    name: 'NEW KURUKSHETRA BUS STAND',
    tag: 'TRANSIT',
    desc: 'Haryana Roadways interstate bus terminus (~4.5 km from campus)',
    url: 'https://www.google.com/maps/dir/?api=1&destination=Kurukshetra%20Bus%20Stand',
    lat: '29.9754',
    lng: '76.8398',
  },
  {
    name: 'PIPLI BUS STOP (NH 44 GT ROAD)',
    tag: 'TRANSIT',
    desc: 'Major highway transit hub on GT Road for long-distance Volvo & intercity buses (~8 km)',
    url: 'https://www.google.com/maps/dir/?api=1&destination=Pipli%20Kurukshetra',
    lat: '29.9890',
    lng: '76.8770',
  },
  {
    name: 'CHANDIGARH INTERNATIONAL AIRPORT (IXC)',
    tag: 'TRANSIT',
    desc: 'Nearest commercial airport (~85 km via NH 44 / NH 152)',
    url: 'https://www.google.com/maps/dir/?api=1&destination=Chandigarh%20International%20Airport',
    lat: '30.6735',
    lng: '76.7885',
  },
  {
    name: 'BRAHMA SAROVAR',
    tag: 'HERITAGE',
    desc: 'Historic sacred water body, venue of the International Gita Mahotsav (~3 km)',
    url: 'https://www.google.com/maps/dir/?api=1&destination=Brahma%20Sarovar%20Kurukshetra',
    lat: '29.9592',
    lng: '76.8354',
  },
  {
    name: 'JYOTISAR TIRTH',
    tag: 'HERITAGE',
    desc: 'Birthplace of the Bhagavad Gita under the sacred banyan tree (~9 km)',
    url: 'https://www.google.com/maps/dir/?api=1&destination=Jyotisar%20Kurukshetra',
    lat: '29.9575',
    lng: '76.7645',
  },
  {
    name: 'CIVIL HOSPITAL KURUKSHETRA (LNJP)',
    tag: 'EMERGENCY',
    desc: 'District civil hospital for medical care & emergency needs (~4 km)',
    url: 'https://www.google.com/maps/dir/?api=1&destination=Lok+Nayak+Jai+Prakash+Civil+Hospital+Kurukshetra',
    lat: '29.9712',
    lng: '76.8320',
  },
]

const KURUKSHETRA_TAGS = ['ALL', ...[...new Set(KURUKSHETRA_PLACES.map((p) => p.tag))].sort()]

const KURUKSHETRA_MAP_EMBED =
  'https://maps.google.com/maps?q=Kurukshetra%20Haryana&t=&z=13&ie=UTF8&iwloc=&output=embed'

export default function CampusMap() {
  const [mode, setMode] = useState('campus') // 'campus' | 'kurukshetra'
  const [mapType, setMapType] = useState('m') // 'm' (roadmap) | 'k' (satellite)
  const [tag, setTag] = useState('ALL')
  const [query, setQuery] = useState('')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [collapsedCategories, setCollapsedCategories] = useState(() => new Set())

  const mapSectionRef = useRef(null)

  // Current active raw dataset based on top-card toggle
  const activeDataset = useMemo(() => {
    return mode === 'campus' ? LANDMARKS : KURUKSHETRA_PLACES
  }, [mode])

  // Active tags for the slide-able category strip
  const activeTags = useMemo(() => {
    return mode === 'campus' ? LANDMARK_TAGS : KURUKSHETRA_TAGS
  }, [mode])

  // Dynamic Google Maps embed URL focusing on selectedPlace or full view
  const embedUrl = useMemo(() => {
    if (selectedPlace?.lat && selectedPlace?.lng) {
      return `https://maps.google.com/maps?q=${selectedPlace.lat},${selectedPlace.lng}&t=${mapType}&z=18&ie=UTF8&iwloc=&output=embed`
    }
    if (selectedPlace?.name) {
      const suffix = mode === 'campus' ? ', NIT Kurukshetra' : ', Kurukshetra'
      return `https://maps.google.com/maps?q=${encodeURIComponent(selectedPlace.name + suffix)}&t=${mapType}&z=18&ie=UTF8&iwloc=&output=embed`
    }
    if (mode === 'campus') {
      return `https://maps.google.com/maps?q=NIT%20Kurukshetra&t=${mapType}&z=16&ie=UTF8&iwloc=&output=embed`
    }
    return `https://maps.google.com/maps?q=Kurukshetra%20Haryana&t=${mapType}&z=13&ie=UTF8&iwloc=&output=embed`
  }, [selectedPlace, mode, mapType])

  // Clean, fast search query matching
  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase()
    return activeDataset.filter((item) => {
      const matchesTag = tag === 'ALL' || item.tag === tag
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.desc && item.desc.toLowerCase().includes(q)) ||
        (item.tag && item.tag.toLowerCase().includes(q))
      return matchesTag && matchesQuery
    })
  }, [activeDataset, tag, query])

  // Group filtered locations into category buckets
  const groupedCategories = useMemo(() => {
    const groups = {}
    filteredList.forEach((item) => {
      const cat = item.tag || 'OTHER'
      if (!groups[cat]) {
        groups[cat] = []
      }
      groups[cat].push(item)
    })
    return groups
  }, [filteredList])

  // Toggle category collapse
  const toggleCategoryCollapse = (cat) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  // Handle selecting a place
  const handleSelectPlace = (place) => {
    setSelectedPlace(place)
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <Shell>
      <div className="space-y-4">
        {/* TOP COMMAND HEADER WITH CAMPUS vs KURUKSHETRA TOGGLE */}
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
                {mode === 'campus' ? 'CAMPUS MAP' : 'KURUKSHETRA MAP'}
              </h1>
            </div>

            {/* LOCATION TOGGLE: CAMPUS vs KURUKSHETRA */}
            <div className="flex items-center gap-2">
              <Segmented
                label="MAP"
                size="sm"
                options={[
                  { label: 'CAMPUS', value: 'campus' },
                  { label: 'KURUKSHETRA', value: 'kurukshetra' },
                ]}
                value={mode}
                onChange={(newMode) => {
                  setMode(newMode)
                  setTag('ALL')
                  setQuery('')
                  setSelectedPlace(null)
                  setCollapsedCategories(new Set())
                }}
              />
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
              className="field !pl-9 uppercase !py-2 text-xs sm:text-sm font-bold w-full"
              placeholder={
                mode === 'campus'
                  ? 'SEARCH ANY HOSTEL, LAB, DEPT, SHOP, OR GATE...'
                  : 'SEARCH KURUKSHETRA TRANSIT, SAROVAR, OR SPOT...'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search places"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 opacity-50 hover:opacity-100 cursor-pointer p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </Panel>

        {/* SLIDE-ABLE CATEGORY FILTER STRIP (LIKE CALENDAR) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
          <span className="label text-xs font-bold muted mr-0.5 flex items-center gap-1 shrink-0">
            <Tag size={13} className="text-[var(--color-orange)]" /> CATEGORY:
          </span>

          <button
            type="button"
            onClick={() => setTag('ALL')}
            className={`btn !py-1 !px-2.5 !text-xs font-bold transition-all cursor-pointer shrink-0 ${
              tag === 'ALL'
                ? 'ring-2 ring-black dark:ring-white scale-105 shadow-hard-sm'
                : 'opacity-80 hover:opacity-100'
            }`}
            style={
              tag === 'ALL'
                ? { background: 'var(--text)', color: 'var(--bg)' }
                : undefined
            }
          >
            ALL ({activeDataset.length})
          </button>

          {activeTags
            .filter((t) => t !== 'ALL')
            .map((t) => {
              const active = tag === t
              const count = activeDataset.filter((l) => l.tag === t).length
              const styleMeta = TAG_STYLES[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`btn !py-1 !px-2.5 !text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    active
                      ? 'ring-2 ring-black dark:ring-white scale-105 shadow-hard-sm'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={
                    active && styleMeta
                      ? { background: styleMeta.bg, color: 'var(--on-accent)', borderColor: styleMeta.bg }
                      : undefined
                  }
                >
                  {t} ({count})
                </button>
              )
            })}
        </div>

        {/* FLOATING LOCATION POPOVER (WHEN A PLACE IS SELECTED) */}
        {selectedPlace && (
          <div className="board board-hard bg-[var(--surface)] border-2 border-[var(--border)] p-3.5 sm:p-4 shadow-hard-lg animate-flip">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-orange)] flex items-center gap-1">
                    <Navigation size={12} className="fill-current" /> SELECTED LOCATION
                  </span>
                  <Chip
                    style={{
                      background: getPlaceBadgeMeta(selectedPlace).bg,
                      color: 'var(--on-accent)',
                    }}
                    className="text-[10px] !py-0.5"
                  >
                    {getPlaceBadgeMeta(selectedPlace).label || selectedPlace.tag}
                  </Chip>
                  {selectedPlace.lat && selectedPlace.lng && (
                    <span className="font-mono text-[10px] muted">
                      {selectedPlace.lat}° N, {selectedPlace.lng}° E
                    </span>
                  )}
                </div>

                <h3 className="t-card-title text-base sm:text-lg text-[var(--text)] mt-1.5">
                  {selectedPlace.name}
                </h3>
                {selectedPlace.desc && (
                  <p className="t-body text-xs muted mt-1">{selectedPlace.desc}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlace(null)}
                className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text)] cursor-pointer shrink-0"
                aria-label="Close location popover"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
              <a
                href={selectedPlace.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-go flex items-center gap-1.5 !py-1.5 !px-3 font-bold text-xs shadow-hard-sm"
              >
                <Navigation className="w-3.5 h-3.5 fill-current" />
                <span>OPEN DIRECTIONS IN GOOGLE MAPS</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>

              <button
                type="button"
                onClick={() => {
                  mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                className="btn !py-1.5 !px-2.5 text-xs font-bold flex items-center gap-1 cursor-pointer ml-auto"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>VIEW MAP</span>
              </button>
            </div>
          </div>
        )}

        {/* GOOGLE MAPS VIEWER */}
        <div ref={mapSectionRef}>
          <Panel className="board board-hard bg-[var(--surface)] overflow-hidden !p-0 shadow-xs">
            {/* Map Header Bar with Title, Status & Mode Switches */}
            <div className="t-meta muted border-b-2 border-[var(--border)] px-3.5 py-2.5 flex items-center justify-between flex-wrap gap-2 bg-[var(--surface-2)]/50">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: 'var(--color-orange)' }}
                />
                <span className="font-bold text-xs uppercase truncate text-[var(--text)]">
                  {mode === 'campus' ? 'NIT KURUKSHETRA CAMPUS' : 'KURUKSHETRA CITY'}
                  {selectedPlace && (
                    <span className="text-[var(--color-orange)] font-black ml-1.5 truncate">
                      · {selectedPlace.name}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedPlace && (
                  <button
                    type="button"
                    onClick={() => setSelectedPlace(null)}
                    className="btn !py-1 !px-2 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Reset to campus overview"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>RESET</span>
                  </button>
                )}

                <div className="flex items-center border border-[var(--border)] rounded-md overflow-hidden p-0.5 bg-[var(--surface)]">
                  <button
                    type="button"
                    onClick={() => setMapType('m')}
                    className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-xs transition-colors cursor-pointer ${
                      mapType === 'm'
                        ? 'bg-[var(--text)] text-[var(--bg)] shadow-xs'
                        : 'text-[var(--text)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    MAP
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapType('k')}
                    className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-xs transition-colors cursor-pointer ${
                      mapType === 'k'
                        ? 'bg-[var(--text)] text-[var(--bg)] shadow-xs'
                        : 'text-[var(--text)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    SATELLITE
                  </button>
                </div>
              </div>
            </div>

            <iframe
              key={embedUrl}
              title={mode === 'campus' ? 'NIT Kurukshetra Campus Map' : 'Kurukshetra City Map'}
              src={embedUrl}
              className="h-[420px] sm:h-[500px] lg:h-[560px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Panel>
        </div>

        {/* CATEGORY DROPDOWNS / ACCORDIONS */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2 px-1">
            <h2 className="t-section text-sm sm:text-base">
              {mode === 'campus' ? 'CAMPUS CATEGORIES & PLACES' : 'KURUKSHETRA DESTINATIONS'}
            </h2>
            <div className="t-meta muted text-xs">
              {filteredList.length} OF {activeDataset.length} PLACES
            </div>
          </div>

          {filteredList.length === 0 ? (
            <Panel className="board board-hard bg-[var(--surface)] pad-page text-center">
              <p className="t-section">NO PLACES MATCH "{query.toUpperCase()}"</p>
              <p className="t-meta muted mt-1">
                Try searching for another keyword or switch category filters above.
              </p>
            </Panel>
          ) : (
            Object.entries(groupedCategories).map(([catKey, items]) => {
              const meta = TAG_STYLES[catKey] || {
                bg: 'var(--surface-2)',
                label: catKey,
                desc: 'Campus locations',
              }
              const isCollapsed = collapsedCategories.has(catKey) && !query.trim()

              return (
                <div
                  key={catKey}
                  className="board board-hard bg-[var(--surface)] overflow-hidden transition-all"
                >
                  {/* Category Dropdown Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleCategoryCollapse(catKey)}
                    className="w-full flex items-center justify-between p-3 sm:p-3.5 bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors text-left cursor-pointer border-b border-[var(--border)]"
                    aria-expanded={!isCollapsed}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="size-3 rounded-sm shrink-0 border border-black/20"
                        style={{ background: meta.bg }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="t-card-title text-sm sm:text-base text-[var(--text)]">
                            {meta.label || catKey}
                          </h3>
                          <span className="chip !py-0.5 !px-2 text-[10px] font-black">
                            {items.length} {items.length === 1 ? 'PLACE' : 'PLACES'}
                          </span>
                        </div>
                        {meta.desc && (
                          <p className="t-micro muted mt-0.5 truncate hidden sm:block">
                            {meta.desc}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="t-micro muted uppercase hidden sm:inline">
                        {isCollapsed ? 'EXPAND' : 'COLLAPSE'}
                      </span>
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 opacity-70" />
                      ) : (
                        <ChevronDown className="w-4 h-4 opacity-70" />
                      )}
                    </div>
                  </button>

                  {/* Locations Grid Inside Category */}
                  {!isCollapsed && (
                    <div className="p-3 sm:p-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 bg-[var(--surface-2)]/30">
                      {items.map((place) => {
                        const isSelected = selectedPlace?.name === place.name
                        return (
                          <div
                            key={place.name}
                            onClick={() => handleSelectPlace(place)}
                            className={`board board-hard bg-[var(--surface)] p-3 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                              isSelected
                                ? '!border-[var(--color-orange)] ring-2 ring-[var(--color-orange)]/50 shadow-md bg-orange-50/20'
                                : 'hover:-translate-y-0.5 hover:border-[var(--border-strong)]'
                            }`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleSelectPlace(place)
                              }
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Building2
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSelected
                                      ? 'text-[var(--color-orange)]'
                                      : 'text-slate-400'
                                  }`}
                                />
                                <p
                                  className={`t-card-title text-xs sm:text-sm truncate ${
                                    isSelected ? 'font-black text-[var(--color-orange)]' : ''
                                  }`}
                                >
                                  {place.name}
                                </p>
                              </div>

                              {place.desc && (
                                <p className="t-micro muted line-clamp-2 mt-1">
                                  {place.desc}
                                </p>
                              )}

                              <div className="flex items-center gap-2 mt-2">
                                <Chip
                                  style={{
                                    background: getPlaceBadgeMeta(place).bg,
                                    color: 'var(--on-accent)',
                                  }}
                                  className="text-[10px] !py-0.5"
                                >
                                  {getPlaceBadgeMeta(place).label || place.tag}
                                </Chip>
                                {isSelected && (
                                  <span className="text-[10px] font-black text-[var(--color-orange)] tracking-wider">
                                    POPOVER OPEN
                                  </span>
                                )}
                              </div>
                            </div>

                            <a
                              href={place.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text)] opacity-60 hover:opacity-100 transition-opacity shrink-0"
                              title="Open Directions in Google Maps"
                              aria-label={`Open directions to ${place.name} in Google Maps`}
                            >
                              <ExternalLink className="icon-micro" strokeWidth={2.5} />
                            </a>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <p className="t-meta muted text-center pt-2 pb-4">
          TAP ANY LOCATION TO OPEN ITS FLOATING CARD · TAP EXTERNAL LINK FOR GOOGLE MAPS NAVIGATION.
        </p>
      </div>
    </Shell>
  )
}
