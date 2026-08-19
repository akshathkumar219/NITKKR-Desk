import { useCallback, useMemo } from 'react'
import { KEYS, useStored } from './storage'
import { baseTimetable } from '../data/timetables'
import { DAYS, dayCode, minutesNow } from './time'

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

/** Sessions for one weekday, chronological. */
export function sessionsForDay(sessions, day) {
  return sessions.filter((s) => s.day === day).sort((a, b) => a.start - b.start)
}

/** Distinct courses (excludes breaks) — the roll-call subject list. */
export function coursesOf(sessions) {
  const map = new Map()
  for (const s of sessions) {
    if (s.type === 'break') continue
    const key = s.code || s.name
    if (!map.has(key)) {
      map.set(key, { key, name: s.name, code: s.code, type: s.type, sessions: [] })
    }
    map.get(key).sessions.push(s)
  }
  return [...map.values()]
}

/** Grid bounds for the week view, snapped to whole hours with padding. */
export function gridBounds(sessions) {
  if (!sessions.length) return { from: 8 * 60, to: 18 * 60 }
  const from = Math.min(...sessions.map((s) => s.start))
  const to = Math.max(...sessions.map((s) => s.end))
  return {
    from: Math.floor(from / 60) * 60,
    to: Math.ceil(to / 60) * 60,
  }
}

/** The next session today after `mins`, or null. */
export function nextSession(sessions, day = dayCode(), mins = minutesNow()) {
  return (
    sessionsForDay(sessions, day)
      .filter((s) => s.type !== 'break' && s.start >= mins)
      .sort((a, b) => a.start - b.start)[0] ?? null
  )
}

/** The session happening right now, or null. */
export function currentSession(sessions, day = dayCode(), mins = minutesNow()) {
  return (
    sessionsForDay(sessions, day).find(
      (s) => s.type !== 'break' && s.start <= mins && mins < s.end,
    ) ?? null
  )
}

/** The next weekday that has any sessions — used by empty states. */
export function nextClassDay(sessions, from = dayCode()) {
  const start = DAYS.indexOf(from)
  for (let i = 1; i <= DAYS.length; i += 1) {
    const day = DAYS[(Math.max(start, 0) + i) % DAYS.length]
    if (sessions.some((s) => s.day === day && s.type !== 'break')) return day
  }
  return null
}
