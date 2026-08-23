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

const term =
  (calendarJson.calendars.find((c) => c.term?.toLowerCase().includes('odd')) ||
    calendarJson.calendars[0]) ?? { title: '', events: [] }

export const CALENDAR = {
  title: term.title,
  audience: term.audience ?? '',
  // The warning only shows while the file says it is unverified, so it
  // disappears on its own the moment the real calendar lands.
  note: term.verified ? '' : 'PLACEHOLDER — REPLACE WITH THE OFFICIAL NITKKR ACADEMIC CALENDAR',
  verified: term.verified,
  events: term.events,
}

/**
 * Filter chips for the calendar. `ALL` first, then every category actually
 * present in the content, so no chip can filter to an empty list.
 */
export const CALENDAR_CATEGORIES = [
  'ALL',
  ...[...new Set(term.events.map((e) => e.category))].sort(),
]

/**
 * The milestones worth pinning above the filters — the answers to "when does
 * term start / end" that people open this page for. Matched loosely so a
 * relabelled row ("WINTER BREAK (STUDENTS)") still counts, and falls back to
 * the first six events if none of the labels match.
 */
const KEY_DATE_PATTERNS = [
  /classes\s+begin/i,
  /mid[-\s]?term/i,
  /classes\s+end/i,
  /end[-\s]?term/i,
  /winter\s+break/i,
  /next\s+semester/i,
]

export const CALENDAR_KEY_DATES = (() => {
  const picked = KEY_DATE_PATTERNS.map((re) =>
    term.events.find((e) => re.test(e.label)),
  ).filter(Boolean)
  return picked.length ? picked : term.events.slice(0, 6)
})()

/**
 * Milestones that deserve extra width in the grid. Exams are what people
 * actually plan around; registration and result dates are logistics.
 */
const WIDE_PATTERNS = [/mid[-\s]?term/i, /end[-\s]?term/i]

export function isWideEvent(event) {
  return WIDE_PATTERNS.some((re) => re.test(event.label))
}

/* ------------------------------------------------- calendar time helpers -- */

const DAY_MS = 86400000

function parseISO(iso) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Where an event sits relative to today: `done`, `now` (a multi-day event
 * currently running), `next` (the soonest upcoming one) or `future`.
 * Events with no `Date` return `unknown` and are styled neutrally — that is
 * the honest state while the content still ships without dates.
 */
export function eventState(event, nextLabel) {
  const start = parseISO(event.date)
  if (!start) return 'unknown'
  const today = startOfToday()
  const end = parseISO(event.endDate) ?? start
  if (today > end) return 'done'
  if (today >= start && today <= end) return 'now'
  return event.label === nextLabel ? 'next' : 'future'
}

/** Whole days from today until an event starts. Null when it has no date. */
export function daysUntil(event) {
  const start = parseISO(event.date)
  if (!start) return null
  return Math.round((start - startOfToday()) / DAY_MS)
}

/** "in 31 days" / "today" / "25 days ago" — null when the event has no date. */
export function relativeLabel(event) {
  const n = daysUntil(event)
  if (n === null) return null
  const end = parseISO(event.endDate)
  if (end && startOfToday() <= end && n <= 0) return 'HAPPENING NOW'
  if (n === 0) return 'TODAY'
  if (n === 1) return 'TOMORROW'
  if (n > 0) return `IN ${n} DAYS`
  if (n === -1) return 'YESTERDAY'
  return `${Math.abs(n)} DAYS AGO`
}

/** The soonest event that has not finished yet — the one to lead with. */
export const CALENDAR_NEXT = (() => {
  const today = startOfToday()
  const dated = term.events
    .filter((e) => parseISO(e.date))
    .sort((a, b) => parseISO(a.date) - parseISO(b.date))
  return dated.find((e) => (parseISO(e.endDate) ?? parseISO(e.date)) >= today) ?? null
})()

/**
 * Semester progress for the rail: 0–1 between the first and last dated
 * milestone. Null when there are not enough dates to draw it.
 */
export const CALENDAR_SPAN = (() => {
  const dated = term.events
    .filter((e) => parseISO(e.date))
    .sort((a, b) => parseISO(a.date) - parseISO(b.date))
  if (dated.length < 2) return null
  const first = parseISO(dated[0].date)
  const last = parseISO(dated[dated.length - 1].endDate ?? dated[dated.length - 1].date)
  const total = last - first
  if (total <= 0) return null
  const pct = Math.min(1, Math.max(0, (startOfToday() - first) / total))
  return {
    events: dated,
    percent: pct,
    markers: dated.map((e) => ({
      label: e.label,
      at: Math.min(1, Math.max(0, (parseISO(e.date) - first) / total)),
    })),
  }
})()

/**
 * Gap in pixels between two consecutive timeline rows, scaled by the days
 * between them but clamped: real calendars are lumpy (a 56-day summer gap
 * next to a 7-day one), and unclamped spacing makes the long gaps dominate
 * while the clustered milestones pile up illegibly.
 */
const GAP_MIN = 10
const GAP_MAX = 84
const GAP_DAYS_AT_MAX = 60

export function gapFor(prev, next) {
  const a = parseISO(prev?.date)
  const b = parseISO(next?.date)
  if (!a || !b) return GAP_MIN
  const days = Math.max(0, (b - a) / DAY_MS)
  const t = Math.min(1, days / GAP_DAYS_AT_MAX)
  return Math.round(GAP_MIN + (GAP_MAX - GAP_MIN) * t)
}

/**
 * Chronological order for the timeline. Undated rows keep their file order
 * and sit at the end, since there is nowhere honest to place them.
 */
export function byDate(events) {
  return [...events].sort((a, b) => {
    const da = parseISO(a.date)
    const db = parseISO(b.date)
    if (da && db) return da - db
    if (da) return -1
    if (db) return 1
    return 0
  })
}

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

export const CREDITS = [
  {
    role: 'BUILD BY',
    name: 'Akshath Kumar',
    detail: "CSE'29",
    linkedin: 'https://www.linkedin.com/in/akshath-kumar-23a245298/',
    instagram: 'https://www.instagram.com/akshath_2119/',
  },
]

export const INSPIRED_BY = {
  role: 'INSPIRED BY',
  name: 'PEC MANAGE',
  url: 'https://pecmanage.netlify.app/',
}
