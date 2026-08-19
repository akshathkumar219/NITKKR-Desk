import { useCallback } from 'react'
import { KEYS, useStored } from './storage'
import { DAYS, isoToDate, todayISO } from './time'

// Attendance ("roll call") marks are keyed by `${isoDate}|${sessionId}` so a
// session can be marked independently on each date it occurs.

export const MARKS = ['present', 'absent', 'cancelled']

export function markKey(iso, sessionId) {
  return `${iso}|${sessionId}`
}

export function useRollcall() {
  const [marks, setMarks] = useStored(KEYS.rollcall, {})

  const setMark = useCallback(
    (iso, sessionId, mark) =>
      setMarks((prev) => {
        const key = markKey(iso, sessionId)
        const next = { ...prev }
        // Clicking the active mark again clears it.
        if (next[key] === mark) delete next[key]
        else next[key] = mark
        return next
      }),
    [setMarks],
  )

  const getMark = useCallback(
    (iso, sessionId) => marks[markKey(iso, sessionId)] ?? null,
    [marks],
  )

  const clearAll = useCallback(() => setMarks({}), [setMarks])

  return { marks, setMark, getMark, clearAll }
}

/** Marks are ignored before the tracking-since date. */
function inWindow(iso, since) {
  if (!since) return true
  return isoToDate(iso) >= isoToDate(since)
}

/**
 * Tally marks for a set of session ids.
 *
 *   held    = present + absent      (cancelled classes never count)
 *   percent = attended / held
 */
export function tally(marks, sessionIds, since) {
  const ids = new Set(sessionIds)
  let present = 0
  let absent = 0
  let cancelled = 0

  for (const [key, mark] of Object.entries(marks)) {
    const sep = key.indexOf('|')
    const iso = key.slice(0, sep)
    const sid = key.slice(sep + 1)
    if (!ids.has(sid)) continue
    if (!inWindow(iso, since)) continue
    if (mark === 'present') present += 1
    else if (mark === 'absent') absent += 1
    else if (mark === 'cancelled') cancelled += 1
  }

  const held = present + absent
  return {
    present,
    absent,
    cancelled,
    held,
    percent: held === 0 ? null : (present / held) * 100,
  }
}

/**
 * How many more classes you can miss and still sit at or above `required`.
 * Solves: present / (held + x) >= required  =>  x <= present/required - held
 */
export function canSkip(present, held, required) {
  const r = required / 100
  if (r <= 0) return Infinity
  return Math.max(0, Math.floor(present / r - held))
}

/**
 * How many consecutive classes you must attend to climb back to `required`.
 * Solves: (present + x) / (held + x) >= required
 */
export function mustAttend(present, held, required) {
  const r = required / 100
  if (r >= 1) return Infinity
  if (held === 0) return 0
  const need = Math.ceil((r * held - present) / (1 - r))
  return Math.max(0, need)
}

/** Verdict for a subject or the overall figure. */
export function status(percent, required) {
  if (percent === null) return 'untracked'
  if (percent >= required) return 'safe'
  if (percent >= required - 10) return 'edge'
  return 'short'
}

export const STATUS_COLOR = {
  safe: 'var(--color-present)',
  edge: 'var(--color-amber)',
  short: 'var(--color-absent)',
  untracked: 'var(--color-cancelled)',
}

/**
 * Every (date, session) pair in the tracking window that is still unmarked,
 * up to and including today. Powers the "backfill" nudge.
 */
export function unmarkedSince(sessions, marks, since, upto = todayISO()) {
  if (!since) return []
  const out = []
  const end = isoToDate(upto)
  const cursor = isoToDate(since)
  let guard = 0

  while (cursor <= end && guard < 400) {
    guard += 1
    const day = DAYS[(cursor.getDay() + 6) % 7]
    if (DAYS.includes(day)) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      for (const s of sessions) {
        if (s.day !== day || s.type === 'break') continue
        if (!marks[markKey(iso, s.id)]) out.push({ iso, session: s })
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}
