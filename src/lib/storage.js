import { useCallback, useEffect, useState } from 'react'
import { todayISO } from './time'
import { DEFAULT_BRANCH, DEFAULT_HOSTEL, DEFAULT_YEAR } from '../data/campus'

// Everything lives in this browser. No account, no server, no sync.
// Keys are namespaced so a future export/import stays legible.
export const KEYS = {
  profile: 'kkr.profile',
  theme: 'kkr.theme',
  board: 'kkr.board', // user timetable overrides, per branch-year
  rollcall: 'kkr.rollcall', // attendance marks
  rollcallSettings: 'kkr.rollcall.settings',
  grades: 'kkr.grades',
  welcomed: 'kkr.welcomed',
  introPlays: 'kkr.intro.plays', // entry animation is shown a few times, then retired
}

const listeners = new Set()

function emit(key) {
  listeners.forEach((fn) => fn(key))
}

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage blocked — the app keeps working in-memory
    // for this session. Nothing here is load-bearing enough to throw over.
  }
  emit(key)
}

export function remove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  emit(key)
}

/**
 * Reactive localStorage value. Updates propagate to every hook instance in
 * this tab, and to other tabs via the storage event.
 */
export function useStored(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback))

  useEffect(() => {
    const onLocal = (changed) => {
      if (changed === key) setValue(read(key, fallback))
    }
    const onStorage = (e) => {
      if (e.key === key) setValue(read(key, fallback))
    }
    listeners.add(onLocal)
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(onLocal)
      window.removeEventListener('storage', onStorage)
    }
    // fallback is intentionally not a dep — it is a literal at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const set = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(read(key, fallback)) : next
      write(key, resolved)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  return [value, set]
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const EMPTY_PROFILE = {
  name: '',
  branch: DEFAULT_BRANCH,
  hostel: DEFAULT_HOSTEL,
  // Year is remembered per branch, so switching branch to peek at another
  // timetable does not clobber your own year.
  yearByBranch: {},
  branchPicked: false,
  hostelPicked: false,
}

export function useProfile() {
  const [profile, setProfile] = useStored(KEYS.profile, EMPTY_PROFILE)
  const merged = { ...EMPTY_PROFILE, ...profile }
  const year = merged.yearByBranch[merged.branch] ?? DEFAULT_YEAR

  const update = useCallback(
    (patch) => setProfile((p) => ({ ...EMPTY_PROFILE, ...p, ...patch })),
    [setProfile],
  )

  const setYear = useCallback(
    (nextYear) =>
      setProfile((p) => {
        const base = { ...EMPTY_PROFILE, ...p }
        return {
          ...base,
          yearByBranch: { ...base.yearByBranch, [base.branch]: String(nextYear) },
        }
      }),
    [setProfile],
  )

  const setBranch = useCallback(
    (branch, nextYear) =>
      setProfile((p) => {
        const base = { ...EMPTY_PROFILE, ...p }
        const yearByBranch = { ...base.yearByBranch }
        if (nextYear != null) yearByBranch[branch] = String(nextYear)
        return { ...base, branch, branchPicked: true, yearByBranch }
      }),
    [setProfile],
  )

  return {
    profile: merged,
    year,
    initials: initialsOf(merged.name),
    onboarded: merged.branchPicked,
    update,
    setYear,
    setBranch,
  }
}

export function initialsOf(name) {
  const clean = (name ?? '').trim()
  if (!clean) return '··'
  const parts = clean.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export function useTheme() {
  const [theme, setThemeRaw] = useStored(
    KEYS.theme,
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#080D18' : '#F4F1E8')
  }, [theme])

  const toggle = useCallback(
    () => setThemeRaw((t) => (t === 'dark' ? 'light' : 'dark')),
    [setThemeRaw],
  )

  return { theme, toggle, setTheme: setThemeRaw }
}

// ---------------------------------------------------------------------------
// Roll call settings
// ---------------------------------------------------------------------------

export const DEFAULT_ROLLCALL_SETTINGS = {
  required: 75,
  trackingSince: todayISO(),
}

export function useRollcallSettings() {
  return useStored(KEYS.rollcallSettings, DEFAULT_ROLLCALL_SETTINGS)
}

// ---------------------------------------------------------------------------
// Backup — the only recovery path in a local-only app, so it exports
// everything under the kkr.* namespace rather than a hand-picked list.
// ---------------------------------------------------------------------------

export function exportSnapshot() {
  const data = {}
  for (const key of Object.values(KEYS)) {
    const raw = localStorage.getItem(key)
    if (raw !== null) data[key] = JSON.parse(raw)
  }
  return {
    app: 'NITKKR BOARD',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export function importSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.data) {
    throw new Error('Not a NITKKR BOARD backup file.')
  }
  const known = new Set(Object.values(KEYS))
  let restored = 0
  for (const [key, value] of Object.entries(snapshot.data)) {
    if (!known.has(key)) continue
    localStorage.setItem(key, JSON.stringify(value))
    restored += 1
  }
  Object.values(KEYS).forEach(emit)
  return restored
}
