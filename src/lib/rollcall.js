import { useCallback } from 'react'
import { KEYS, useStored } from './storage.js'
import { DAYS, isoToDate, todayISO } from './time.js'
import { getSessionById } from '../data/timetables.js'
import { isNoClassDay } from '../data/info.js'

// Attendance ("roll call") marks are keyed by `${isoDate}|${sessionId}` so a
// session can be marked independently on each date it occurs.

export const MARKS = ['present', 'absent', 'cancelled']

export function markKey(iso, sessionId) {
  return `${iso}|${sessionId}`
}

export function useRollcall() {
  const [marks, setMarks] = useStored(KEYS.rollcall, {})
  const [adjustments, setAdjustments] = useStored(KEYS.rollcallAdjustments, {})

  const setMark = useCallback(
    (iso, sessionId, mark) =>
      setMarks((prev) => {
        const key = markKey(iso, sessionId)
        const next = { ...prev }
        // Setting null or clicking the active mark again clears it.
        if (!mark || next[key] === mark) delete next[key]
        else next[key] = mark
        return next
      }),
    [setMarks],
  )

  const markBatch = useCallback(
    (entries, mark) => {
      setMarks((prev) => {
        const next = { ...prev }
        for (const item of entries) {
          const key = markKey(item.iso, item.sessionId || item.id)
          if (!mark) delete next[key]
          else next[key] = mark
        }
        return next
      })
    },
    [setMarks],
  )

  const unmarkBatch = useCallback(
    (entries) => {
      setMarks((prev) => {
        const next = { ...prev }
        for (const item of entries) {
          const key = markKey(item.iso, item.sessionId || item.id)
          delete next[key]
        }
        return next
      })
    },
    [setMarks],
  )

  const adjustSubject = useCallback(
    (courseKey, delta) => {
      setAdjustments((prev) => {
        const current = prev[courseKey] || 0
        const nextVal = current + delta
        const next = { ...prev }
        if (nextVal === 0) delete next[courseKey]
        else next[courseKey] = nextVal
        return next
      })
    },
    [setAdjustments],
  )

  const getMark = useCallback(
    (iso, sessionId) => marks[markKey(iso, sessionId)] ?? null,
    [marks],
  )

  const clearAll = useCallback(() => {
    setMarks({})
    setAdjustments({})
  }, [setMarks, setAdjustments])

  return { marks, adjustments, setMark, markBatch, unmarkBatch, adjustSubject, getMark, clearAll }
}

/** Marks are ignored before the tracking-since date. */
function inWindow(iso, since) {
  if (!since) return true
  return isoToDate(iso) >= isoToDate(since)
}

/**
 * Tally marks for a set of session ids with optional manual adjustments.
 *
 *   held    = present + absent      (cancelled classes never count)
 *   percent = attended / held
 */
export function tally(
  marks,
  sessionIds,
  since,
  manualAdjustment = 0,
  baseAttendance = { present: 0, held: 0 },
  sessionWeights = {},
) {
  const ids = new Set()
  const weights = { ...(sessionWeights || {}) }

  if (Array.isArray(sessionIds) || sessionIds instanceof Set) {
    for (const item of sessionIds) {
      if (item && typeof item === 'object') {
        ids.add(item.id)
        if (weights[item.id] == null) {
          weights[item.id] =
            item.attendanceCredits != null
              ? Number(item.attendanceCredits)
              : item.type === 'lab'
                ? 2
                : 1
        }
      } else if (item != null) {
        ids.add(item)
        if (weights[item] == null) {
          const sess = getSessionById(item)
          if (sess) {
            weights[item] = sess.attendanceCredits || 1
          }
        }
      }
    }
  }

  let present = 0
  let absent = 0
  let cancelled = 0

  for (const [key, mark] of Object.entries(marks || {})) {
    const sep = key.indexOf('|')
    const iso = key.slice(0, sep)
    const sid = key.slice(sep + 1)
    if (!ids.has(sid)) continue
    if (!inWindow(iso, since)) continue
    let weight = weights[sid]
    if (weight == null || isNaN(weight)) {
      const sess = getSessionById(sid)
      weight = sess?.attendanceCredits || 1
      weights[sid] = weight
    }
    if (mark === 'present') present += weight
    else if (mark === 'absent') absent += weight
    else if (mark === 'cancelled') cancelled += weight
  }

  const baseP = Number(baseAttendance?.present) || 0
  const baseH = Math.max(baseP, Number(baseAttendance?.held) || 0)

  const adj = Number(manualAdjustment) || 0
  const rawPresent = present + baseP
  const rawHeld = present + absent + baseH

  const totalHeld = rawHeld
  const totalPresent = totalHeld === 0 ? 0 : Math.max(0, Math.min(totalHeld, rawPresent + adj))
  const totalAbsent = totalHeld - totalPresent

  return {
    present: totalPresent,
    absent: totalAbsent,
    cancelled,
    held: totalHeld,
    loggedPresent: present,
    loggedHeld: present + absent,
    basePresent: baseP,
    baseHeld: baseH,
    manualAdjustment: adj,
    percent: totalHeld === 0 ? null : (totalPresent / totalHeld) * 100,
  }
}

/**
 * How many more classes you can miss and still sit at or above `required`.
 * Solves: present / (held + x) >= required / 100
 * => 100 * present >= required * (held + x)
 * => required * x <= 100 * present - required * held
 * => x <= (100 * present - required * held) / required
 */
export function canSkip(present, held, required) {
  const req = Number(required)
  if (!Number.isFinite(req) || req <= 0) return Infinity
  const p = Number(present) || 0
  const h = Number(held) || 0
  if (h === 0) return 0
  const numerator = 100 * p - req * h
  if (numerator < 0) return 0
  return Math.floor(numerator / req)
}

/**
 * How many consecutive classes you must attend to climb back to `required`.
 * Solves: (present + x) / (held + x) >= required / 100
 * => 100 * (present + x) >= required * (held + x)
 * => 100 * present + 100 * x >= required * held + required * x
 * => x * (100 - required) >= required * held - 100 * present
 * => x >= (required * held - 100 * present) / (100 - required)
 */
export function mustAttend(present, held, required) {
  const req = Number(required)
  if (!Number.isFinite(req) || req <= 0) return 0
  const p = Number(present) || 0
  const h = Number(held) || 0
  if (h === 0) return 0
  if (req >= 100) return p >= h ? 0 : Infinity
  const numerator = req * h - 100 * p
  if (numerator <= 0) return 0
  return Math.ceil(numerator / (100 - req))
}

export const classDeficit = mustAttend

/**
 * Simulate the resulting percentage if user skips next N classes.
 */
export function simulateSkip(present, held, skipCount, required = 65) {
  const nextHeld = held + skipCount
  if (nextHeld <= 0) return { percent: null, status: 'untracked', delta: 0 }
  const nextPercent = (present / nextHeld) * 100
  const currentPercent = held > 0 ? (present / held) * 100 : null
  return {
    percent: nextPercent,
    status: status(nextPercent, required),
    delta: currentPercent !== null ? nextPercent - currentPercent : 0,
  }
}

/**
 * Simulate the resulting percentage if user attends next N classes.
 */
export function simulateAttend(present, held, attendCount, required = 65) {
  const nextHeld = held + attendCount
  if (nextHeld <= 0) return { percent: null, status: 'untracked', delta: 0 }
  const nextPresent = present + attendCount
  const nextPercent = (nextPresent / nextHeld) * 100
  const currentPercent = held > 0 ? (present / held) * 100 : null
  return {
    percent: nextPercent,
    status: status(nextPercent, required),
    delta: currentPercent !== null ? nextPercent - currentPercent : 0,
  }
}

/** Verdict for a subject or the overall figure. */
export function status(percent, required) {
  if (percent === null) return 'untracked'
  if (percent > required) return 'safe'
  if (percent >= required - 10) return 'edge'
  return 'short'
}

/** Fills and graphical objects — rings, bars, chips. */
export const STATUS_COLOR = {
  safe: 'var(--color-present)',
  edge: 'var(--color-amber)',
  short: 'var(--color-absent)',
  untracked: 'var(--color-cancelled)',
}

/**
 * The same states as TEXT. The fills above are tuned to carry ink on top of
 * them, which makes them far too light to read as a foreground colour on a
 * surface — `--color-amber` on white is 1.75:1. These clear 4.5:1 in both
 * themes. Never use STATUS_COLOR for text.
 */
export const STATUS_INK = {
  safe: 'var(--present-ink)',
  edge: 'var(--warn-ink)',
  short: 'var(--absent-ink)',
  untracked: 'var(--muted)',
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
      if (!isNoClassDay(iso)) {
        for (const s of sessions) {
          if (s.day !== day || s.type === 'break') continue
          if (!marks[markKey(iso, s.id)]) out.push({ iso, session: s })
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}
