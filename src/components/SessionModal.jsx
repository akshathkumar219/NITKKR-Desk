import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, Sparkles } from 'lucide-react'
import { Field, Modal, Select } from '../ui'
import { DAYS, fmtRange, fmtTime, parseTime } from '../lib/time'
import { useAllSubjectsData, useProfile } from '../lib/storage'
import { coursesOf, useBoard } from '../lib/board'
import { baseTimetable } from '../data/timetables'

// Body text in this modal is fixed at 14px (everything except the title).
const TXT = { fontSize: 14 }

const NITKKR_PERIOD_PRESETS = [
  { id: 'p1', label: 'Period 1 · 08:30 – 09:25 AM', start: 510, end: 565, type: 'lecture' },
  { id: 'p2', label: 'Period 2 · 09:25 – 10:20 AM', start: 565, end: 620, type: 'lecture' },
  { id: 'p3', label: 'Period 3 · 10:40 – 11:35 AM', start: 640, end: 695, type: 'lecture' },
  { id: 'p4', label: 'Period 4 · 11:35 – 12:30 PM', start: 695, end: 750, type: 'lecture' },
  { id: 'p5', label: 'Period 5 · 12:30 – 01:25 PM', start: 750, end: 805, type: 'lecture' },
  { id: 'p6', label: 'Period 6 · 01:45 – 02:40 PM', start: 825, end: 880, type: 'lecture' },
  { id: 'p7', label: 'Period 7 · 02:40 – 03:35 PM', start: 880, end: 935, type: 'lecture' },
  { id: 'p8', label: 'Period 8 · 03:35 – 04:30 PM', start: 935, end: 990, type: 'lecture' },
  { id: 'p9', label: 'Period 9 · 04:30 – 05:25 PM', start: 990, end: 1045, type: 'lecture' },
  // Labs / Double Periods
  { id: 'lab1', label: 'Lab · 08:30 – 10:20 AM (P1 + P2)', start: 510, end: 620, type: 'lab' },
  { id: 'lab2', label: 'Lab · 10:40 AM – 12:30 PM (P3 + P4)', start: 640, end: 750, type: 'lab' },
  { id: 'lab3', label: 'Lab · 01:45 – 03:35 PM (P6 + P7)', start: 825, end: 935, type: 'lab' },
  { id: 'lab4', label: 'Lab · 02:40 – 04:30 PM (P7 + P8)', start: 880, end: 990, type: 'lab' },
  { id: 'lab5', label: 'Lab · 04:30 – 06:20 PM (P9 + P10)', start: 990, end: 1100, type: 'lab' },
  // Workshop / 3-Period
  { id: 'ws1', label: 'Workshop · 08:30 – 11:35 AM (3 Periods)', start: 510, end: 695, type: 'workshop' },
  { id: 'ws2', label: 'Workshop · 01:45 – 04:30 PM (3 Periods)', start: 825, end: 990, type: 'workshop' },
  { id: 'custom', label: '⚙️ Custom Slot / Time...', start: null, end: null, type: 'custom' },
]

const START_TIME_OPTIONS = [
  { value: '510', label: '08:30 AM (Period 1 / Lab)' },
  { value: '565', label: '09:25 AM (Period 2)' },
  { value: '640', label: '10:40 AM (Period 3 / Lab)' },
  { value: '695', label: '11:35 AM (Period 4)' },
  { value: '750', label: '12:30 PM (Period 5)' },
  { value: '825', label: '01:45 PM (Period 6 / Lab)' },
  { value: '880', label: '02:40 PM (Period 7 / Lab)' },
  { value: '935', label: '03:35 PM (Period 8)' },
  { value: '990', label: '04:30 PM (Period 9 / Lab)' },
  { value: '1045', label: '05:25 PM (Period 10)' },
  { value: '__CUSTOM__', label: 'Custom Start Time...' },
]

const END_TIME_OPTIONS = [
  { value: '565', label: '09:25 AM (1 Period End)' },
  { value: '620', label: '10:20 AM (2 Periods / Lab End)' },
  { value: '695', label: '11:35 AM (Period 3 / Workshop End)' },
  { value: '750', label: '12:30 PM (Period 4 / Lab End)' },
  { value: '805', label: '01:25 PM (Period 5 End)' },
  { value: '880', label: '02:40 PM (Period 6 End)' },
  { value: '935', label: '03:35 PM (Period 7 / Lab End)' },
  { value: '990', label: '04:30 PM (Period 8 / Lab End)' },
  { value: '1045', label: '05:25 PM (Period 9 End)' },
  { value: '1100', label: '06:20 PM (Period 10 / Late Lab End)' },
  { value: '__CUSTOM__', label: 'Custom End Time...' },
]

const blank = {
  day: 'MON',
  start: 510,
  end: 565,
  name: '',
  code: '',
  room: '',
  group: '',
  type: 'lecture',
  accent: '',
  instructor: '',
  note: '',
  targetCutoff: '65',
  attendanceCredits: 1,
}

export default function SessionModal({ open, onClose, onSave, onDelete, session, defaultDay, prefill, courses: propCourses }) {
  const { profile, year } = useProfile()
  const { sessions } = useBoard(profile.branch, year)
  const allSubjectsStore = useAllSubjectsData()

  // Build comprehensive course list for the student's branch & year + custom subjects
  const availableCourses = useMemo(() => {
    const map = new Map()

    // 1. Official published courses for the student's branch & year
    const publishedSessions = baseTimetable(profile.branch, year)
    for (const c of coursesOf(publishedSessions)) {
      map.set(c.key, {
        ...c,
        isPublished: true,
      })
    }

    // 2. Active courses currently on student's board
    for (const c of coursesOf(sessions)) {
      if (!map.has(c.key)) {
        map.set(c.key, c)
      } else {
        map.get(c.key).sessions = [...(map.get(c.key).sessions || []), ...c.sessions]
      }
    }

    // 3. User customized subjects from allSubjectsStore
    for (const [key, meta] of Object.entries(allSubjectsStore || {})) {
      if (meta && meta.name) {
        if (!map.has(key)) {
          const isLab = meta.category === 'LAB' || (meta.name || '').toUpperCase().includes('LAB')
          map.set(key, {
            key,
            name: meta.name,
            code: meta.code || '',
            type: isLab ? 'lab' : 'lecture',
            category: meta.category || (isLab ? 'LAB' : 'THEORY'),
            instructor: meta.instructor || '',
            room: meta.room || '',
            accent: meta.accent || '',
            targetCutoff: meta.targetCutoff || 65,
            sessions: [],
          })
        } else {
          // Augment with stored metadata if missing in published timetable
          const cur = map.get(key)
          cur.instructor = cur.instructor || meta.instructor || ''
          cur.room = cur.room || meta.room || ''
          cur.accent = cur.accent || meta.accent || ''
          cur.code = cur.code || meta.code || ''
        }
      }
    }

    if (propCourses && propCourses.length > 0) {
      for (const pc of propCourses) {
        if (!map.has(pc.key)) map.set(pc.key, pc)
      }
    }

    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [profile.branch, year, sessions, allSubjectsStore, propCourses])

  const courseOptions = useMemo(() => {
    const list = []
    for (const c of availableCourses) {
      const isLab = c.type === 'lab' || c.category === 'LAB' || (c.name || '').toUpperCase().includes('LAB')
      const codeTag = c.code ? `(${c.code})` : ''
      const typeTag = isLab ? '[LAB]' : ''
      const label = [c.name, codeTag, typeTag].filter(Boolean).join(' ')
      list.push({
        value: c.key,
        label,
      })
    }
    list.push({ value: '__CUSTOM__', label: '✨ + CUSTOM / OTHER SUBJECT' })
    return list
  }, [availableCourses])

  const [form, setForm] = useState(blank)
  const [selectedCourseKey, setSelectedCourseKey] = useState('__CUSTOM__')
  const [selectedPeriodPreset, setSelectedPeriodPreset] = useState('p1')
  const [isCustomTime, setIsCustomTime] = useState(false)
  const [customStartStr, setCustomStartStr] = useState('08:30 AM')
  const [customEndStr, setCustomEndStr] = useState('09:25 AM')
  const [error, setError] = useState('')

  // Sync form on open or when editing a session
  useEffect(() => {
    if (!open) return
    setError('')
    if (session) {
      const matched = availableCourses.find(
        (c) =>
          c.key === (session.code || session.name) ||
          (session.code && c.code === session.code) ||
          c.name?.toUpperCase() === (session.name || '').toUpperCase(),
      )
      setSelectedCourseKey(matched ? matched.key : '__CUSTOM__')

      const start = session.start != null ? session.start : 510
      const end = session.end != null ? session.end : 565
      const isLab = session.type === 'lab' || (session.name || '').toUpperCase().includes('LAB')
      const credits =
        session.attendanceCredits != null && session.attendanceCredits !== 2
          ? Number(session.attendanceCredits)
          : 1

      const matchingPreset = NITKKR_PERIOD_PRESETS.find((p) => p.start === start && p.end === end)
      if (matchingPreset) {
        setSelectedPeriodPreset(matchingPreset.id)
        setIsCustomTime(false)
      } else {
        setSelectedPeriodPreset('custom')
        setIsCustomTime(true)
      }

      setCustomStartStr(fmtTime(start))
      setCustomEndStr(fmtTime(end))

      setForm({
        day: session.day || defaultDay || 'MON',
        start,
        end,
        name: session.name ?? '',
        code: session.code ?? '',
        room: session.room ?? '',
        group: session.group ?? '',
        type: session.type ?? (isLab ? 'lab' : 'lecture'),
        accent: session.accent ?? '',
        instructor: session.instructor ?? '',
        note: session.note ?? '',
        targetCutoff: String(session.targetCutoff ?? '65'),
        attendanceCredits: credits,
      })
    } else {
      const initialPrefill = prefill || {}
      const matched = availableCourses.find(
        (c) =>
          (initialPrefill.code && c.code === initialPrefill.code) ||
          (initialPrefill.name && c.name.toUpperCase() === initialPrefill.name.toUpperCase()),
      )
      const defaultCourse = matched || availableCourses[0]
      const courseKey = defaultCourse ? defaultCourse.key : '__CUSTOM__'
      setSelectedCourseKey(courseKey)

      const isLab = defaultCourse && (
        defaultCourse.type === 'lab' ||
        defaultCourse.category === 'LAB' ||
        (defaultCourse.name || '').toUpperCase().includes('LAB')
      )
      const initialCredits = 1
      const initialPreset = isLab ? 'lab1' : 'p1'
      const presetObj = NITKKR_PERIOD_PRESETS.find((p) => p.id === initialPreset) || NITKKR_PERIOD_PRESETS[0]

      setSelectedPeriodPreset(initialPreset)
      setIsCustomTime(false)
      setCustomStartStr(fmtTime(presetObj.start))
      setCustomEndStr(fmtTime(presetObj.end))

      const s0 = defaultCourse?.sessions?.[0] || {}

      setForm({
        ...blank,
        day: defaultDay ?? 'MON',
        start: presetObj.start,
        end: presetObj.end,
        name: defaultCourse?.name || '',
        code: defaultCourse?.code || '',
        type: isLab ? 'lab' : 'lecture',
        room: defaultCourse?.room || s0.room || '',
        instructor: defaultCourse?.instructor || s0.instructor || '',
        accent: defaultCourse?.accent || s0.accent || '',
        targetCutoff: defaultCourse?.targetCutoff != null ? String(defaultCourse.targetCutoff) : '65',
        attendanceCredits: initialCredits,
        ...initialPrefill,
      })
    }
  }, [open, session, defaultDay, prefill, availableCourses])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // Handle subject selection from dropdown
  function handleSelectCourse(key) {
    setSelectedCourseKey(key)
    if (key === '__CUSTOM__') {
      setForm((prev) => ({
        ...prev,
        name: '',
        code: '',
        type: 'lecture',
        room: '',
        instructor: '',
        attendanceCredits: 1,
      }))
      return
    }

    const target = availableCourses.find((c) => c.key === key)
    if (!target) return

    const isLab =
      target.type === 'lab' ||
      target.category === 'LAB' ||
      (target.name || '').toUpperCase().includes('LAB')

    const s0 = target.sessions?.[0] || {}
    const newCredits = 1

    // If switching to Lab and currently on single period, auto-switch to standard lab period
    let newStart = form.start
    let newEnd = form.end

    if (isLab && !isCustomTime && (form.end - form.start <= 60)) {
      const labPreset = NITKKR_PERIOD_PRESETS.find((p) => p.start === form.start && p.end - p.start >= 100) || NITKKR_PERIOD_PRESETS[9]
      newStart = labPreset.start
      newEnd = labPreset.end
      setSelectedPeriodPreset(labPreset.id)
    } else if (!isLab && !isCustomTime && (form.end - form.start > 60)) {
      const lecPreset = NITKKR_PERIOD_PRESETS.find((p) => p.start === form.start && p.end - p.start <= 60) || NITKKR_PERIOD_PRESETS[0]
      newStart = lecPreset.start
      newEnd = lecPreset.end
      setSelectedPeriodPreset(lecPreset.id)
    }

    setForm((prev) => ({
      ...prev,
      name: target.name,
      code: target.code || '',
      type: isLab ? 'lab' : (target.type || 'lecture'),
      instructor: target.instructor || s0.instructor || prev.instructor || '',
      room: target.room || s0.room || prev.room || '',
      accent: target.accent || s0.accent || prev.accent || '',
      targetCutoff: target.targetCutoff != null ? String(target.targetCutoff) : prev.targetCutoff || '65',
      attendanceCredits: newCredits,
      start: newStart,
      end: newEnd,
    }))
  }

  // Handle period preset change
  function handlePeriodPresetChange(presetId) {
    setSelectedPeriodPreset(presetId)
    if (presetId === 'custom') {
      setIsCustomTime(true)
      return
    }

    setIsCustomTime(false)
    const p = NITKKR_PERIOD_PRESETS.find((x) => x.id === presetId)
    if (p && p.start != null && p.end != null) {
      set({ start: p.start, end: p.end })
      setCustomStartStr(fmtTime(p.start))
      setCustomEndStr(fmtTime(p.end))
    }
  }

  // Handle start time dropdown change
  function handleStartTimeChange(val) {
    if (val === '__CUSTOM__') {
      setIsCustomTime(true)
      setSelectedPeriodPreset('custom')
      return
    }

    const startMins = Number(val)
    const duration = form.type === 'lab' || form.attendanceCredits >= 2 ? 110 : 55
    const suggestedEnd = startMins + duration

    // Find if this aligns with a standard period preset
    const matchingPreset = NITKKR_PERIOD_PRESETS.find((p) => p.start === startMins && p.end === suggestedEnd)

    setSelectedPeriodPreset(matchingPreset ? matchingPreset.id : 'custom')
    set({ start: startMins, end: suggestedEnd })
    setCustomStartStr(fmtTime(startMins))
    setCustomEndStr(fmtTime(suggestedEnd))
  }

  // Handle end time dropdown change
  function handleEndTimeChange(val) {
    if (val === '__CUSTOM__') {
      setIsCustomTime(true)
      setSelectedPeriodPreset('custom')
      return
    }

    const endMins = Number(val)
    const matchingPreset = NITKKR_PERIOD_PRESETS.find((p) => p.start === form.start && p.end === endMins)
    setSelectedPeriodPreset(matchingPreset ? matchingPreset.id : 'custom')
    set({ end: endMins })
    setCustomEndStr(fmtTime(endMins))
  }

  // Handle custom text time parsing
  function handleParseCustomTimes() {
    const parsedStart = parseTime(customStartStr)
    const parsedEnd = parseTime(customEndStr)
    if (parsedStart != null && parsedEnd != null) {
      set({ start: parsedStart, end: parsedEnd })
    }
  }

  function submit(e) {
    e.preventDefault()
    let startMins = form.start
    let endMins = form.end

    if (isCustomTime) {
      const ps = parseTime(customStartStr)
      const pe = parseTime(customEndStr)
      if (ps == null || pe == null) {
        setError('Could not understand custom times. Try "08:30 AM" or "14:30".')
        return
      }
      startMins = ps
      endMins = pe
    }

    if (endMins <= startMins) {
      setError('End time must be after start time.')
      return
    }

    if (selectedCourseKey === '__CUSTOM__' && !form.name.trim()) {
      setError('Please provide a course name.')
      return
    }

    onSave({
      day: form.day,
      start: startMins,
      end: endMins,
      name: form.name.trim() || 'Class',
      code: form.code.trim(),
      room: form.room.trim(),
      group: form.group.trim(),
      type: form.type || 'lecture',
      accent: form.accent || '',
      instructor: form.instructor.trim(),
      note: form.note.trim(),
      targetCutoff: form.targetCutoff ? Number(form.targetCutoff) : 65,
      attendanceCredits: Number(form.attendanceCredits) || 1,
    })
    onClose()
  }

  const rangePreview = form.start != null && form.end != null && form.end > form.start
    ? fmtRange(form.start, form.end)
    : null

  const durationMins = form.start != null && form.end != null && form.end > form.start
    ? form.end - form.start
    : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={session ? 'EDIT SESSION' : 'ADD SESSION'}
      sub="SCHEDULE CLASS TIMINGS, PERIOD & ATTENDANCE CREDITS"
      subStyle={TXT}
      showCloseButton={false}
      closeOnBackdrop={false}
      closeOnEscape={false}
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          {session && onDelete ? (
            <button
              type="button"
              className="btn cursor-pointer font-black uppercase tracking-wider shadow-hard-sm"
              style={{ background: 'var(--color-coral)', color: 'var(--on-accent)', ...TXT }}
              onClick={() => {
                onDelete(session.id)
                onClose()
              }}
            >
              DELETE
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn cursor-pointer font-bold uppercase tracking-wider"
              style={TXT}
              onClick={onClose}
            >
              CANCEL
            </button>
            <button
              type="submit"
              form="session-form"
              className="btn btn-go cursor-pointer font-black uppercase tracking-wider shadow-hard-sm"
              style={TXT}
            >
              SAVE
            </button>
          </div>
        </div>
      }
    >
      <form id="session-form" className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar" onSubmit={submit}>
        
        {/* 1. DAY SELECTION */}
        <Field label="DAY OF THE WEEK" id="s-day" labelStyle={TXT}>
          <Select id="s-day" options={DAYS} value={form.day} onChange={(v) => set({ day: v })} style={TXT} />
        </Field>

        {/* 2. SUBJECT SELECTION (Branch & Year Catalog) */}
        <div className="space-y-2">
          <Field
            label="SUBJECT"
            id="s-course-preset"
            labelStyle={TXT}
            hint={
              selectedCourseKey !== '__CUSTOM__'
                ? 'Teacher, room, and cutoff will sync automatically from the Subjects part.'
                : 'Enter custom subject details below.'
            }
            hintStyle={{ fontSize: 12, textTransform: 'uppercase' }}
          >
            <Select
              id="s-course-preset"
              options={courseOptions}
              value={selectedCourseKey}
              onChange={handleSelectCourse}
              style={TXT}
            />
          </Field>

          {/* If Custom Subject selected, show Course Name input */}
          {selectedCourseKey === '__CUSTOM__' ? (
            <div className="pt-1">
              <Field label="COURSE NAME" id="s-custom-name" labelStyle={TXT}>
                <input
                  id="s-custom-name"
                  className="field uppercase !py-2 text-xs"
                  style={TXT}
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value.toUpperCase() })}
                  placeholder="E.G. DATA STRUCTURES / OPEN ELECTIVE"
                  autoFocus
                />
              </Field>
            </div>
          ) : (
            /* Subtle Sync confirmation chip showing synced metadata */
            (form.code || form.room || form.instructor) ? (
              <div className="flex flex-wrap items-center gap-1.5 text-[0.7rem] bg-[var(--surface-2)] text-[var(--muted)] px-2.5 py-1.5 rounded border border-[var(--border)] uppercase font-mono tracking-wider">
                <span className="font-bold text-[var(--text)]">SYNCED:</span>
                {[
                  form.code ? `CODE: ${form.code}` : null,
                  form.room ? `ROOM: ${form.room}` : null,
                  form.instructor ? `PROF: ${form.instructor}` : null,
                ].filter(Boolean).join(' · ')}
              </div>
            ) : null
          )}
        </div>

        {/* 3. PERIOD & TIMINGS (NIT Kurukshetra Timetable Presets) */}
        <div className="space-y-2.5 rounded border-2 border-[var(--border)] p-3 bg-[var(--surface-2)]/40">
          <div className="flex items-center justify-between">
            <label className="t-meta muted flex items-center gap-1.5" style={TXT}>
              <Clock className="size-4 text-[var(--color-sky)]" />
              TIMINGS & PERIOD SLOTS
            </label>
            {rangePreview ? (
              <span className="text-[0.7rem] font-bold text-[var(--text)] uppercase bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border)]">
                {rangePreview} ({durationMins}M)
              </span>
            ) : null}
          </div>

          {/* Quick Period Selector Dropdown */}
          <Field label="OFFICIAL PERIOD SLOT" id="s-period-preset" labelStyle={{ fontSize: 12 }}>
            <Select
              id="s-period-preset"
              options={NITKKR_PERIOD_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
              value={selectedPeriodPreset}
              onChange={handlePeriodPresetChange}
              style={TXT}
            />
          </Field>

          {/* Linked Start and End Time Dropdowns */}
          {!isCustomTime ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Field label="START TIME" id="s-start-select" labelStyle={{ fontSize: 12 }}>
                <Select
                  id="s-start-select"
                  options={START_TIME_OPTIONS}
                  value={String(form.start)}
                  onChange={handleStartTimeChange}
                  style={TXT}
                />
              </Field>
              <Field label="END TIME" id="s-end-select" labelStyle={{ fontSize: 12 }}>
                <Select
                  id="s-end-select"
                  options={END_TIME_OPTIONS}
                  value={String(form.end)}
                  onChange={handleEndTimeChange}
                  style={TXT}
                />
              </Field>
            </div>
          ) : (
            /* Custom Time Text Inputs (fallback) */
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Field label="CUSTOM START" id="s-custom-start" labelStyle={{ fontSize: 12 }}>
                <input
                  id="s-custom-start"
                  className="field !py-2 text-xs"
                  style={TXT}
                  value={customStartStr}
                  onChange={(e) => {
                    setCustomStartStr(e.target.value)
                    const p = parseTime(e.target.value)
                    if (p != null) set({ start: p })
                  }}
                  onBlur={handleParseCustomTimes}
                  placeholder="08:30 AM"
                />
              </Field>
              <Field label="CUSTOM END" id="s-custom-end" labelStyle={{ fontSize: 12 }}>
                <input
                  id="s-custom-end"
                  className="field !py-2 text-xs"
                  style={TXT}
                  value={customEndStr}
                  onChange={(e) => {
                    setCustomEndStr(e.target.value)
                    const p = parseTime(e.target.value)
                    if (p != null) set({ end: p })
                  }}
                  onBlur={handleParseCustomTimes}
                  placeholder="10:20 AM"
                />
              </Field>
            </div>
          )}
        </div>

        {/* 4. ATTENDANCE CREDITS (1 vs 2 credits) */}
        <div className="space-y-2">
          <label className="t-meta muted flex items-center gap-1.5" style={TXT}>
            <Sparkles className="size-4 text-[var(--color-present)]" />
            ATTENDANCE CREDITS (ROLL CALL WEIGHT)
          </label>

          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 1, label: '1 CREDIT', sub: 'Standard Class / Lab' },
              { val: 2, label: '2 CREDITS', sub: 'Double Slot' },
              { val: 3, label: '3 CREDITS', sub: 'Workshop' },
            ].map((c) => {
              const active = form.attendanceCredits === c.val
              return (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => {
                    set({ attendanceCredits: c.val })
                    // If switching to 2 credits and currently single lecture period, adjust to lab period if matching
                    if (c.val === 2 && form.end - form.start <= 60 && !isCustomTime) {
                      const matchingLab = NITKKR_PERIOD_PRESETS.find((p) => p.start === form.start && p.end - p.start >= 100)
                      if (matchingLab) {
                        set({ end: matchingLab.end })
                        setSelectedPeriodPreset(matchingLab.id)
                      }
                    }
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded border-2 transition-all cursor-pointer text-center ${
                    active
                      ? 'border-[var(--color-present)] bg-[var(--color-present)]/15 shadow-hard-xs scale-[1.02]'
                      : 'border-[var(--border)] bg-[var(--surface-2)] opacity-80 hover:opacity-100'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                    {active ? <Check className="size-3.5 text-[var(--color-present)]" strokeWidth={3} /> : null}
                    {c.label}
                  </span>
                  <span className="text-[0.62rem] text-[var(--muted)] mt-0.5 leading-tight font-medium">
                    {c.sub}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="text-[0.72rem] text-[var(--muted)] uppercase tracking-wider font-mono">
            {form.attendanceCredits === 2
              ? '✓ 2 Attendance credits: Attending marks +2 present and +2 held'
              : form.attendanceCredits === 3
                ? '✓ 3 Attendance credits: Attending marks +3 present and +3 held'
                : '• Standard 1 credit: Attending marks +1 present and +1 held'}
          </p>
        </div>

        {error ? (
          <p
            className="t-body font-bold border-2 p-2"
            style={{ borderColor: 'var(--absent-ink)', color: 'var(--absent-ink)', ...TXT }}
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
