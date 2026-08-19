// ---------------------------------------------------------------------------
// CAMPUS INFO — generated from content/*.md
//
// Edit the markdown, not this file:
//   content/institute.md          institute facts + blurb
//   content/calendar/*.md         academic calendar (and holidays)
//   content/helpline.md           emergency contacts
//   content/links.md              useful + quick links
//   content/transport.md          local destinations
//   content/placements.md         placement checklist
//   content/campus/landmarks.md   map landmarks
//
// This file only reshapes that JSON into the exact objects the pages already
// consume, so the pipeline stayed invisible to every component.
// ---------------------------------------------------------------------------

import links from './generated/links.json'
import landmarksJson from './generated/landmarks.json'
import calendarJson from './generated/calendar.json'

const rows = (dataset, section = 'DEFAULT') => links[dataset]?.[section] ?? []

/** `| Label | Value |` tables read most naturally as an object. */
function byLabel(list) {
  return Object.fromEntries(list.map((r) => [r.label?.toLowerCase(), r.value]))
}

// ------------------------------------------------------------- institute --

const inst = byLabel(rows('institute'))

export const INSTITUTE = {
  name: inst.name ?? '',
  short: inst.short ?? '',
  address: inst.address ?? '',
  established: inst.established ?? '',
  campus: inst.campus ?? '',
  location: inst.location ?? '',
  website: inst.website ?? '',
  blurb: rows('institute', 'ABOUT')[0]?.text ?? '',
}

// -------------------------------------------------------------- calendar --

const term = calendarJson.calendars[0] ?? { title: '', events: [] }

export const CALENDAR = {
  title: term.title,
  audience: term.audience ?? '',
  // The warning only shows while the file says it is unverified, so it
  // disappears on its own the moment the real calendar lands.
  note: term.verified ? '' : 'PLACEHOLDER — REPLACE WITH THE OFFICIAL NITKKR ACADEMIC CALENDAR',
  verified: term.verified,
  events: term.events,
}

/** Every category actually present, so no chip filters to an empty list. */
export const CALENDAR_CATEGORIES = [
  'ALL',
  ...[...new Set(term.events.map((e) => e.category))].sort(),
]

/** Exam schedule — same shape, its own content/exams/*.md files. */
export const EXAMS = calendarJson.exams ?? []

/**
 * Dates with no classes, as ISO strings. Attendance uses this to stop
 * counting a holiday as an unmarked day. Only events that carry a real
 * `Date` can contribute; a human-readable `value` alone is not enough.
 */
export const HOLIDAYS = [...calendarJson.calendars, ...(calendarJson.exams ?? [])]
  .flatMap((c) => c.events)
  .filter((e) => e.category === 'HOLIDAYS' || e.category === 'BREAKS')
  .flatMap((e) => expandRange(e.date, e.endDate))
  .filter(Boolean)

function expandRange(from, to) {
  if (!from) return []
  if (!to) return [from]
  const out = []
  const cur = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  // Bounded so a typo'd end date cannot hang the app.
  for (let guard = 0; cur <= end && guard < 400; guard++) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

// --------------------------------------------------------------- helpline --

export const HELPLINE = rows('helpline').map((r) => ({ label: r.label, value: r.value }))

// ------------------------------------------------------------------ links --

export const QUICK_LINKS = rows('links', 'QUICK').map((r) => ({ label: r.title, url: r.url }))

export const USEFUL_LINKS = rows('links', 'USEFUL').map((r) => ({
  tag: r.tag,
  title: r.title,
  description: r.description,
  url: r.url,
}))

export const TRANSPORT = rows('transport').map((r) => ({ name: r.name, url: r.url }))

export const PLACEMENT_CHECKLIST = rows('placements').map((r) => ({
  title: r.title,
  body: r.description,
}))

// -------------------------------------------------------------- landmarks --

const maps = (q) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`

export const LANDMARKS = landmarksJson.map((l) => ({
  name: l.name,
  tag: l.tag,
  // Coordinates beat a name search, which can land on a same-named place in
  // another town. Fall back to the query only while lat/lng are missing.
  url: l.lat !== null && l.lng !== null ? maps(`${l.lat},${l.lng}`) : maps(l.query),
  hasCoords: l.lat !== null && l.lng !== null,
}))

export const LANDMARK_TAGS = ['ALL', ...[...new Set(landmarksJson.map((l) => l.tag))].sort()]

export const MAP_EMBED =
  'https://maps.google.com/maps?q=NIT%20Kurukshetra&t=&z=16&ie=UTF8&iwloc=&output=embed'

export const CREDITS = [{ role: 'BUILD', name: 'Akshath Kumar', detail: '' }]
