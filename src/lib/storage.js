import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_BRANCH, DEFAULT_HOSTEL, DEFAULT_YEAR } from '../data/campus.js'

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
  todos: 'kkr.todos',
  events: 'kkr.events',
  eventCategories: 'kkr.eventCategories',
  customStatus: 'kkr.customStatus',
  pantry: 'kkr.pantry',
  messOverrides: 'kkr.mess.overrides',
  subjectData: 'kkr.subjects.data',
}

// Per-tab state. Deliberately outside KEYS: sessionStorage dies with the tab,
// and none of it belongs in a backup.
export const SESSION_KEYS = {
  // Entry animation plays a few times per tab, then retires. See Intro.jsx.
  introPlays: 'kkr.intro.plays',
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

// sessionStorage twins of read/write. No emit(): nothing observes session
// state reactively, and it is scoped to one tab by definition.
export function readSession(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage blocked — see write() */
  }
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
  rollNo: '',
  branch: DEFAULT_BRANCH,
  hostel: DEFAULT_HOSTEL,
  avatarEmoji: '', // custom emoji or empty for initials
  avatarColor: 'var(--color-amber)', // custom color theme
  yearByBranch: {},
  groupByBranch: {},
  branchPicked: false,
  hostelPicked: false,
}

export function avatarOf(profile) {
  if (profile?.avatarEmoji) return profile.avatarEmoji
  return initialsOf(profile?.name)
}

export function useProfile() {
  const [profile, setProfile] = useStored(KEYS.profile, EMPTY_PROFILE)
  const merged = { ...EMPTY_PROFILE, ...profile }
  const year = merged.yearByBranch[merged.branch] ?? DEFAULT_YEAR
  const groupKey = `${merged.branch}-${year}`
  const group = merged.groupByBranch?.[groupKey] ?? ''

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

  const setGroup = useCallback(
    (nextGroup) =>
      setProfile((p) => {
        const base = { ...EMPTY_PROFILE, ...p }
        const currentYear = base.yearByBranch[base.branch] ?? DEFAULT_YEAR
        const key = `${base.branch}-${currentYear}`
        return {
          ...base,
          groupByBranch: { ...(base.groupByBranch || {}), [key]: nextGroup },
        }
      }),
    [setProfile],
  )

  const setBranch = useCallback(
    (branch, nextYear, nextGroup) =>
      setProfile((p) => {
        const base = { ...EMPTY_PROFILE, ...p }
        const yearByBranch = { ...base.yearByBranch }
        const groupByBranch = { ...(base.groupByBranch || {}) }
        const effectiveYear = nextYear != null ? String(nextYear) : (yearByBranch[branch] ?? DEFAULT_YEAR)
        if (nextYear != null) yearByBranch[branch] = effectiveYear
        if (nextGroup != null) {
          groupByBranch[`${branch}-${effectiveYear}`] = nextGroup
        }
        return { ...base, branch, branchPicked: true, yearByBranch, groupByBranch }
      }),
    [setProfile],
  )

  return {
    profile: merged,
    year,
    group,
    initials: initialsOf(merged.name),
    avatar: avatarOf(merged),
    onboarded: merged.branchPicked,
    update,
    setYear,
    setGroup,
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

  const transitionTheme = useCallback(
    (resolveNext) => {
      if (typeof window === 'undefined') {
        setThemeRaw(resolveNext)
        return
      }

      const reducedMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

      const currentTheme = read(KEYS.theme, theme)
      const nextTheme =
        typeof resolveNext === 'function' ? resolveNext(currentTheme) : resolveNext

      if (reducedMotion) {
        setThemeRaw(nextTheme)
        return
      }

      // Fire Spider-Punk full-screen Zine Tear & Xerox Flash transition
      window.dispatchEvent(
        new CustomEvent('nitkkr:theme-burst', {
          detail: { nextTheme },
        }),
      )

      if (typeof document.startViewTransition === 'function') {
        document.startViewTransition(() => {
          setThemeRaw(nextTheme)
        })
      } else {
        setThemeRaw(nextTheme)
      }
    },
    [setThemeRaw, theme],
  )

  const toggle = useCallback(
    (event) => {
      transitionTheme((t) => (t === 'dark' ? 'light' : 'dark'), event)
    },
    [transitionTheme],
  )

  const setTheme = useCallback(
    (next, event) => {
      transitionTheme(next, event)
    },
    [transitionTheme],
  )

  return { theme, toggle, setTheme }
}

// ---------------------------------------------------------------------------
// Roll call settings
// ---------------------------------------------------------------------------

export const DEFAULT_ROLLCALL_SETTINGS = {
  required: 75,
  trackingSince: '',
  baseAttendance: { present: 0, held: 0 },
}

export function useRollcallSettings() {
  const [settings, setSettings] = useStored(KEYS.rollcallSettings, DEFAULT_ROLLCALL_SETTINGS)
  const merged = {
    ...DEFAULT_ROLLCALL_SETTINGS,
    ...settings,
    baseAttendance: {
      ...DEFAULT_ROLLCALL_SETTINGS.baseAttendance,
      ...(settings?.baseAttendance || {}),
    },
  }
  return [merged, setSettings]
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
    app: 'NITKKR DESK',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export function importSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.data) {
    throw new Error('Not a NITKKR DESK backup file.')
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

// ---------------------------------------------------------------------------
// Student To-Dos
// ---------------------------------------------------------------------------

const DEFAULT_TODOS = []

export function useTodos() {
  const [todos, setTodos] = useStored(KEYS.todos, DEFAULT_TODOS)

  const addTodo = useCallback(
    (text) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const newItem = { id: String(Date.now()), text: trimmed, done: false }
      setTodos((prev) => [newItem, ...prev])
    },
    [setTodos],
  )

  const toggleTodo = useCallback(
    (id) => {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      )
    },
    [setTodos],
  )

  const deleteTodo = useCallback(
    (id) => {
      setTodos((prev) => prev.filter((t) => t.id !== id))
    },
    [setTodos],
  )

  return { todos, addTodo, toggleTodo, deleteTodo }
}

// ---------------------------------------------------------------------------
// Student & Academic Events
// ---------------------------------------------------------------------------

const DEFAULT_EVENTS = []

export function useEvents() {
  const [events, setEvents] = useStored(KEYS.events, DEFAULT_EVENTS)

  const addEvent = useCallback(
    (eventData) => {
      const trimmed = eventData.title ? eventData.title.trim() : ''
      if (!trimmed || !eventData.date) return
      const newEvt = {
        id: String(Date.now()),
        title: trimmed,
        date: eventData.date,
        category: eventData.category || 'PERSONAL',
        isOfficial: false,
      }
      setEvents((prev) => [...prev, newEvt])
    },
    [setEvents],
  )

  const deleteEvent = useCallback(
    (id) => {
      setEvents((prev) => prev.filter((e) => e.id !== id))
    },
    [setEvents],
  )

  return { events, addEvent, deleteEvent }
}

// ---------------------------------------------------------------------------
// Customizable Event Categories
// ---------------------------------------------------------------------------

export const DEFAULT_EVENT_CATEGORIES = [
  { id: 'EXAMS', label: 'EXAM', bg: 'var(--color-coral)', ink: '#111111' },
  { id: 'CLASSES', label: 'CLASS', bg: 'var(--color-sky)', ink: '#111111' },
  { id: 'DEADLINE', label: 'DEADLINE', bg: 'var(--color-amber)', ink: '#111111' },
  { id: 'PERSONAL', label: 'PERSONAL', bg: 'var(--color-violet)', ink: '#111111' },
  { id: 'BREAKS', label: 'BREAK', bg: 'var(--color-acid)', ink: '#111111' },
]

export function useEventCategories() {
  const [categories, setCategories] = useStored(KEYS.eventCategories, DEFAULT_EVENT_CATEGORIES)

  const addCategory = useCallback(
    (label, bg = 'var(--color-amber)', ink = '#111111') => {
      const trimmed = label.trim().toUpperCase()
      if (!trimmed) return
      const id = trimmed.replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4)
      const newCat = { id, label: trimmed, bg, ink }
      setCategories((prev) => [...prev, newCat])
      return id
    },
    [setCategories],
  )

  const updateCategory = useCallback(
    (id, nextData) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...nextData } : c)),
      )
    },
    [setCategories],
  )

  const deleteCategory = useCallback(
    (id) => {
      setCategories((prev) => prev.filter((c) => c.id !== id))
    },
    [setCategories],
  )

  return { categories, addCategory, updateCategory, deleteCategory }
}

export function useCustomStatus() {
  return useStored(KEYS.customStatus, '')
}

// ---------------------------------------------------------------------------
// Hostel Kitchen & Room Stash / Pantry Hook
// ---------------------------------------------------------------------------

export const DEFAULT_PANTRY = {
  items: [],
  memo: '',
}

export function usePantry() {
  const [pantry, setPantry] = useStored(KEYS.pantry, DEFAULT_PANTRY)

  const addItem = useCallback(
    (name) => {
      const trimmed = name.trim().toUpperCase()
      if (!trimmed) return
      const newItem = { id: Date.now().toString(), name: trimmed, checked: false }
      setPantry((prev) => ({
        ...prev,
        items: [...(prev?.items || []), newItem],
      }))
    },
    [setPantry],
  )

  const toggleItem = useCallback(
    (id) => {
      setPantry((prev) => ({
        ...prev,
        items: (prev?.items || []).map((it) =>
          it.id === id ? { ...it, checked: !it.checked } : it,
        ),
      }))
    },
    [setPantry],
  )

  const deleteItem = useCallback(
    (id) => {
      setPantry((prev) => ({
        ...prev,
        items: (prev?.items || []).filter((it) => it.id !== id),
      }))
    },
    [setPantry],
  )

  const setMemo = useCallback(
    (memo) => {
      setPantry((prev) => ({
        ...prev,
        memo,
      }))
    },
    [setPantry],
  )

  return { pantry, addItem, toggleItem, deleteItem, setMemo }
}

// ---------------------------------------------------------------------------
// Hostel Mess Menu Overrides Hook
// ---------------------------------------------------------------------------

export function useMessOverrides(hostelCode) {
  const [allOverrides, setAllOverrides] = useStored(KEYS.messOverrides, {})

  const hostelOverrides = allOverrides[hostelCode] || null

  const updateMeal = useCallback(
    (day, mealKey, data) => {
      setAllOverrides((prev) => {
        const next = { ...prev }
        const hObj = { ...(next[hostelCode] || {}) }
        const dObj = { ...(hObj[day] || {}) }
        dObj[mealKey] = data
        hObj[day] = dObj
        next[hostelCode] = hObj
        return next
      })
    },
    [hostelCode, setAllOverrides],
  )

  const resetHostel = useCallback(() => {
    setAllOverrides((prev) => {
      const next = { ...prev }
      delete next[hostelCode]
      return next
    })
  }, [hostelCode, setAllOverrides])

  const isCustomised = Boolean(
    hostelOverrides && Object.keys(hostelOverrides).length > 0,
  )

  return {
    overrides: hostelOverrides,
    updateMeal,
    resetHostel,
    isCustomised,
  }
}

// ---------------------------------------------------------------------------
// Subjects Extended Workspace Hook (Syllabus, Marks, Notes, Tasks, Resources)
// ---------------------------------------------------------------------------

export const DEFAULT_SUBJECT_DATA = {
  credits: '4',
  targetCutoff: '75',
  instructor: '',
  cabin: '',
  email: '',
  hours: '',
  guidelines: '',
  accent: '',
  notes: '',
  tasks: [],
  resources: [],
  marks: {
    mid1: '',
    mid1Max: 15,
    mid2: '',
    mid2Max: 15,
    internal: '',
    internalMax: 20,
    endSem: '',
    endSemMax: 50,
    targetGrade: 'A+',
  },
  units: [],
}

export function useAllSubjectsData() {
  return useStored(KEYS.subjectData, {})
}

export function useSubjectStore(courseKey, initialMeta = {}) {
  const [allSubjects, setAllSubjects] = useStored(KEYS.subjectData, {})

  const raw = courseKey ? allSubjects[courseKey] : null

  const data = useMemo(() => {
    if (!raw) {
      return {
        ...DEFAULT_SUBJECT_DATA,
        ...initialMeta,
        marks: { ...DEFAULT_SUBJECT_DATA.marks, ...(initialMeta.marks || {}) },
        units: initialMeta.units || DEFAULT_SUBJECT_DATA.units,
        tasks: initialMeta.tasks || DEFAULT_SUBJECT_DATA.tasks,
        resources: initialMeta.resources || DEFAULT_SUBJECT_DATA.resources,
      }
    }
    return {
      ...DEFAULT_SUBJECT_DATA,
      ...raw,
      marks: { ...DEFAULT_SUBJECT_DATA.marks, ...(raw.marks || {}) },
      units: raw.units || DEFAULT_SUBJECT_DATA.units,
      tasks: raw.tasks || DEFAULT_SUBJECT_DATA.tasks,
      resources: raw.resources || DEFAULT_SUBJECT_DATA.resources,
    }
  }, [raw, initialMeta])

  const updateSubjectData = useCallback(
    (patch) => {
      if (!courseKey) return
      setAllSubjects((prev) => {
        const cur = prev[courseKey] || { ...DEFAULT_SUBJECT_DATA, ...initialMeta }
        const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch }
        return { ...prev, [courseKey]: next }
      })
    },
    [courseKey, setAllSubjects, initialMeta],
  )

  const updateNotes = useCallback(
    (notes) => updateSubjectData({ notes }),
    [updateSubjectData],
  )

  const updateMarks = useCallback(
    (marksPatch) => {
      updateSubjectData((prev) => ({
        ...prev,
        marks: { ...(prev.marks || DEFAULT_SUBJECT_DATA.marks), ...marksPatch },
      }))
    },
    [updateSubjectData],
  )

  const toggleTopic = useCallback(
    (unitId, topicId) => {
      updateSubjectData((prev) => {
        const units = (prev.units || DEFAULT_SUBJECT_DATA.units).map((u) => {
          if (u.id !== unitId) return u
          const nextTopics = (u.topics || []).map((t) =>
            t.id === topicId ? { ...t, done: !t.done } : t,
          )
          const allDone = nextTopics.length > 0 && nextTopics.every((t) => t.done)
          return { ...u, topics: nextTopics, completed: allDone }
        })
        return { ...prev, units }
      })
    },
    [updateSubjectData],
  )

  const addTopic = useCallback(
    (unitId, title) => {
      const trimmed = title.trim()
      if (!trimmed) return
      updateSubjectData((prev) => {
        const units = (prev.units || DEFAULT_SUBJECT_DATA.units).map((u) => {
          if (u.id !== unitId) return u
          const newTopic = { id: `t_${Date.now()}`, title: trimmed, done: false }
          return { ...u, topics: [...(u.topics || []), newTopic], completed: false }
        })
        return { ...prev, units }
      })
    },
    [updateSubjectData],
  )

  const deleteTopic = useCallback(
    (unitId, topicId) => {
      updateSubjectData((prev) => {
        const units = (prev.units || DEFAULT_SUBJECT_DATA.units).map((u) => {
          if (u.id !== unitId) return u
          const nextTopics = (u.topics || []).filter((t) => t.id !== topicId)
          const allDone = nextTopics.length > 0 && nextTopics.every((t) => t.done)
          return { ...u, topics: nextTopics, completed: allDone }
        })
        return { ...prev, units }
      })
    },
    [updateSubjectData],
  )

  const updateUnitContent = useCallback(
    (unitId, content) => {
      updateSubjectData((prev) => {
        const units = (prev.units || DEFAULT_SUBJECT_DATA.units).map((u) => {
          if (u.id !== unitId) return u
          const lines = content
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && l !== '•')
          const topics = lines.map((l, i) => {
            const cleanTitle = l.replace(/^[•\-*]\s*/, '').trim()
            const existing = (u.topics || [])[i]
            return {
              id: existing?.id || `t_${unitId}_${i}`,
              title: cleanTitle,
              done: existing?.done || false,
            }
          })
          return { ...u, content, topics }
        })
        return { ...prev, units }
      })
    },
    [updateSubjectData],
  )

  const addUnit = useCallback(
    (title) => {
      const trimmed = title.trim()
      if (!trimmed) return
      updateSubjectData((prev) => {
        const units = prev.units || DEFAULT_SUBJECT_DATA.units
        const unitId = `u_${Date.now()}`
        const newUnit = {
          id: unitId,
          title: trimmed,
          completed: false,
          content: '• ',
          topics: [{ id: `t_${Date.now()}_1`, title: '', done: false }],
        }
        return { ...prev, units: [...units, newUnit] }
      })
    },
    [updateSubjectData],
  )

  const deleteUnit = useCallback(
    (unitId) => {
      updateSubjectData((prev) => {
        const units = (prev.units || DEFAULT_SUBJECT_DATA.units).filter((u) => u.id !== unitId)
        return { ...prev, units }
      })
    },
    [updateSubjectData],
  )

  const addTask = useCallback(
    (title) => {
      const trimmed = title.trim()
      if (!trimmed) return
      const item = { id: String(Date.now()), title: trimmed, done: false }
      updateSubjectData((prev) => ({
        ...prev,
        tasks: [item, ...(prev.tasks || [])],
      }))
    },
    [updateSubjectData],
  )

  const toggleTask = useCallback(
    (id) => {
      updateSubjectData((prev) => ({
        ...prev,
        tasks: (prev.tasks || []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      }))
    },
    [updateSubjectData],
  )

  const deleteTask = useCallback(
    (id) => {
      updateSubjectData((prev) => ({
        ...prev,
        tasks: (prev.tasks || []).filter((t) => t.id !== id),
      }))
    },
    [updateSubjectData],
  )

  const addResource = useCallback(
    (label, url) => {
      const trimmedLabel = label.trim()
      const trimmedUrl = url.trim()
      if (!trimmedLabel) return
      const item = { id: String(Date.now()), label: trimmedLabel, url: trimmedUrl }
      updateSubjectData((prev) => ({
        ...prev,
        resources: [...(prev.resources || []), item],
      }))
    },
    [updateSubjectData],
  )

  const deleteResource = useCallback(
    (id) => {
      updateSubjectData((prev) => ({
        ...prev,
        resources: (prev.resources || []).filter((r) => r.id !== id),
      }))
    },
    [updateSubjectData],
  )

  return {
    data,
    updateSubjectData,
    updateNotes,
    updateMarks,
    toggleTopic,
    addTopic,
    deleteTopic,
    addUnit,
    deleteUnit,
    updateUnitContent,
    addTask,
    toggleTask,
    deleteTask,
    addResource,
    deleteResource,
  }
}

