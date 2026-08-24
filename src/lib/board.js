import { useCallback, useMemo } from 'react'
import { KEYS, useStored } from './storage.js'
import { baseTimetable } from '../data/timetables.js'
import { DAYS, dayCode, minutesNow } from './time.js'

// The "board" is the user's effective timetable: the published one for their
// branch/year, plus their own edits layered on top.
//
// Overrides are stored per branch-year key:
//   { [`${branch}-${year}`]: { added: Session[], removed: string[], moved: {id: {day,start,end}} } }

const emptyOverride = { added: [], removed: [], moved: {} }

function keyFor(branch, year) {
  return `${branch}-${year}`
}

let seq = 0
function newId() {
  seq += 1
  return `u${Date.now().toString(36)}${seq.toString(36)}`
}

export function useBoard(branch, year) {
  const [all, setAll] = useStored(KEYS.board, {})
  const k = keyFor(branch, year)
  const override = { ...emptyOverride, ...(all[k] ?? {}) }

  const sessions = useMemo(() => {
    const published = baseTimetable(branch, year)
    const removed = new Set(override.removed)
    const out = []
    for (const s of published) {
      if (removed.has(s.id)) continue
      const mv = override.moved[s.id]
      out.push(mv ? { ...s, ...mv } : s)
    }
    for (const s of override.added) {
      if (removed.has(s.id)) continue
      const mv = override.moved[s.id]
      out.push(mv ? { ...s, ...mv } : s)
    }
    return out.sort((a, b) => a.start - b.start || a.day.localeCompare(b.day))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, year, JSON.stringify(override)])

  const mutate = useCallback(
    (fn) =>
      setAll((prev) => {
        const cur = { ...emptyOverride, ...(prev[k] ?? {}) }
        return { ...prev, [k]: fn(cur) }
      }),
    [setAll, k],
  )

  const addSession = useCallback(
    (session) =>
      mutate((cur) => ({
        ...cur,
        added: [...cur.added, { ...session, id: newId() }],
      })),
    [mutate],
  )

  const removeSession = useCallback(
    (id) =>
      mutate((cur) => ({
        ...cur,
        removed: [...new Set([...cur.removed, id])],
        added: cur.added.filter((s) => s.id !== id),
      })),
    [mutate],
  )

  const moveSession = useCallback(
    (id, patch) =>
      mutate((cur) => ({
        ...cur,
        moved: { ...cur.moved, [id]: { ...(cur.moved[id] ?? {}), ...patch } },
      })),
    [mutate],
  )

  const resetBoard = useCallback(() => mutate(() => ({ ...emptyOverride })), [mutate])

  const isCustomised =
    override.added.length > 0 ||
    override.removed.length > 0 ||
    Object.keys(override.moved).length > 0

  return { sessions, addSession, removeSession, moveSession, resetBoard, isCustomised }
}

/** Filter sessions by group/batch (e.g. G1, G2). Sessions without a group apply to all. */
export function filterSessionsByGroup(sessions, group) {
  if (!group || group === 'ALL') return sessions
  const target = group.toUpperCase()
  return sessions.filter((s) => {
    if (!s.group) return true
    const parts = s.group.split('+').map((g) => g.trim().toUpperCase())
    return parts.includes(target) || s.group.toUpperCase().includes(target)
  })
}

/** Automatically insert break sessions if the gap between two consecutive classes on a day is > 50 minutes. */
export function insertAutoBreaks(daySessions) {
  if (!daySessions || daySessions.length < 2) return daySessions || []
  const sorted = [...daySessions].sort((a, b) => a.start - b.start)
  const out = []

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]
    if (out.length > 0) {
      const prev = out[out.length - 1]
      const gap = cur.start - prev.end
      // If the time difference in 2 classes is more than 50 minutes
      if (cur.start > prev.end && gap > 50) {
        out.push({
          id: `break-auto-${cur.day}-${prev.end}-${cur.start}`,
          day: cur.day,
          start: prev.end,
          end: cur.start,
          name: 'Break',
          code: '',
          room: '',
          group: '',
          type: 'break',
        })
      }
    }
    out.push(cur)
  }
  return out
}

/** Sessions for one weekday, chronological. */
export function sessionsForDay(sessions, day, group, includeAutoBreaks = false) {
  const list = group ? filterSessionsByGroup(sessions, group) : sessions
  const dayList = list.filter((s) => s.day === day).sort((a, b) => a.start - b.start)
  return includeAutoBreaks ? insertAutoBreaks(dayList) : dayList
}

/** Distinct courses (excludes breaks) — the roll-call subject list. */
export function coursesOf(sessions) {
  const map = new Map()
  for (const s of sessions) {
    if (s.type === 'break') continue
    const isLab = s.type === 'lab' || (s.name || '').toUpperCase().includes('LAB')
    const baseCode = s.code || s.name || ''
    const key = isLab
      ? (baseCode.toUpperCase().includes('LAB') || baseCode.includes('(P)') ? baseCode : `${baseCode} (Lab)`)
      : baseCode
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: s.name,
        code: s.code || '',
        type: isLab ? 'lab' : (s.type || 'lecture'),
        category: isLab ? 'LAB' : 'THEORY',
        sessions: [],
      })
    }
    map.get(key).sessions.push(s)
  }
  return [...map.values()]
}

/** Grid bounds for the week view, snapped to whole hours with padding (up to 7 PM / 19:00 minimum). */
export function gridBounds(sessions) {
  const minFrom = 8 * 60
  const minTo = 19 * 60 // 7:00 PM
  if (!sessions.length) return { from: minFrom, to: minTo }
  const from = Math.min(...sessions.map((s) => s.start))
  const to = Math.max(...sessions.map((s) => s.end))
  return {
    from: Math.min(minFrom, Math.floor(from / 60) * 60),
    to: Math.max(minTo, Math.ceil(to / 60) * 60),
  }
}

/** Check if a specific session is currently in progress. */
export function isLiveSession(session, day = dayCode(), mins = minutesNow()) {
  return (
    session.day === day &&
    session.type !== 'break' &&
    session.start <= mins &&
    mins < session.end
  )
}

/** The next session today after `mins`, or null. */
export function nextSession(sessions, day = dayCode(), mins = minutesNow(), group = null) {
  return (
    sessionsForDay(sessions, day, group)
      .filter((s) => s.type !== 'break' && s.start >= mins)
      .sort((a, b) => a.start - b.start)[0] ?? null
  )
}

/** The session happening right now, or null. */
export function currentSession(sessions, day = dayCode(), mins = minutesNow(), group = null) {
  return (
    sessionsForDay(sessions, day, group).find(
      (s) => s.type !== 'break' && s.start <= mins && mins < s.end,
    ) ?? null
  )
}

/** The next weekday that has any sessions — used by empty states. */
export function nextClassDay(sessions, from = dayCode()) {
  // `start` is -1 on a weekend (from not in DAYS, which only lists Mon–Fri).
  // Don't clamp that to 0 — it would skip Monday and start the search at
  // Tuesday. Leaving it at -1 makes `start + 1` land on Monday, as intended.
  const start = DAYS.indexOf(from)
  for (let i = 1; i <= DAYS.length; i += 1) {
    const day = DAYS[(start + i) % DAYS.length]
    if (sessions.some((s) => s.day === day && s.type !== 'break')) return day
  }
  return null
}
