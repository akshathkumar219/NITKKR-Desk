// Time is stored as integer minutes-since-midnight, NOT free-text strings.
// This is the main structural fix over the reference app: the week grid,
// "open rooms" and "next class" all become arithmetic instead of parsing.

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
export const DAYS_7 = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

/** Day code -> full weekday name, for prose contexts. */
export const DAY_NAMES = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
}

/** JS Date.getDay() (0=Sun) -> our day code. */
export function dayCode(date = new Date()) {
  return DAYS_7[(date.getDay() + 6) % 7]
}

export function minutesNow(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes()
}

/** 545 -> "9:05 AM" */
export function fmtTime(mins) {
  const h24 = Math.floor(mins / 60) % 24
  const m = mins % 60
  const suffix = h24 < 12 ? 'AM' : 'PM'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`
}

/** Compact label for chips: 540,600 -> "9–10 AM" */
export function fmtRange(start, end) {
  const a = Math.floor(start / 60) % 24
  const b = Math.floor(end / 60) % 24
  const am = (h) => (h < 12 ? 'AM' : 'PM')
  const h12 = (h) => (h % 12 === 0 ? 12 : h % 12)
  const mm = (t) => (t % 60 === 0 ? '' : `:${String(t % 60).padStart(2, '0')}`)
  if (am(a) === am(b)) {
    return `${h12(a)}${mm(start)}–${h12(b)}${mm(end)} ${am(b)}`
  }
  return `${h12(a)}${mm(start)} ${am(a)}–${h12(b)}${mm(end)} ${am(b)}`
}

/**
 * Parse loose human input into minutes. Accepts "9", "9:30", "9:30 am",
 * "14:00". Returns null when it can't be understood.
 */
export function parseTime(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase()
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|noon)?$/)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const mer = m[3]
  if (h > 23 || min > 59) return null
  if (mer === 'pm' && h < 12) h += 12
  if (mer === 'am' && h === 12) h = 0
  if (mer === 'noon' && h < 12) h += 12
  return h * 60 + min
}

/** "10-12 noon" / "9-10 am" -> {start,end} or null. */
export function parseRange(raw) {
  if (typeof raw !== 'string') return null
  const parts = raw.split(/[-–—]|\bto\b/)
  if (parts.length !== 2) return null
  const trailing = raw.trim().toLowerCase().match(/(am|pm|noon)\s*$/)
  let start = parseTime(parts[0])
  const end = parseTime(parts[1])
  if (start === null || end === null) return null
  // "9-10 am": the meridiem on the tail applies to both halves.
  if (trailing && !/(am|pm|noon)/.test(parts[0].toLowerCase())) {
    const withTail = parseTime(`${parts[0].trim()} ${trailing[1]}`)
    if (withTail !== null) start = withTail
  }
  // Assume same-day forward ranges; nudge a 12-hour ambiguity.
  return { start, end: end <= start ? end + 12 * 60 : end }
}

export function todayISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isoToDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function fmtDateShort(iso) {
  const d = isoToDate(iso)
  return d
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase()
}

/** "2026-08-01" -> "01-08-2026" */
export function fmtDateDDMMYYYY(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const parts = iso.split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d}-${m}-${y}`
  }
  return iso
}

