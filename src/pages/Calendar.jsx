import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  CalendarDays,
  Calendar as CalendarIcon,
  Tag,
  X,
} from 'lucide-react'
import Shell from '../components/Shell'
import { useEvents, useEventCategories } from '../lib/storage'
import { todayISO, fmtDateDDMMYYYY, isoToDate } from '../lib/time'
import { ACCENTS } from '../lib/palette'

const COLOR_PALETTE = [
  ...ACCENTS.map((a) => ({ label: a.label, value: a.value, bg: a.value, ink: a.ink })),
  { label: 'Red', value: 'var(--disruption)', bg: 'var(--disruption)', ink: 'var(--on-accent)' },
]

export default function CalendarPage() {
  const { events, addEvent, deleteEvent } = useEvents()
  const { categories, addCategory, updateCategory, deleteCategory } = useEventCategories()

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedDate, setSelectedDate] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [dateStr, setDateStr] = useState(() => todayISO())
  const [category, setCategory] = useState(() => categories[0]?.id || 'EXAMS')

  // Category inline edit / add state inside modal
  const [editingCatId, setEditingCatId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editBg, setEditBg] = useState('var(--color-amber)')
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatBg, setNewCatBg] = useState('var(--color-amber)')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' }).toUpperCase()
  const todayStr = useMemo(() => todayISO(), [])

  // Map categories by ID for quick lookup
  const categoryMap = useMemo(() => {
    const map = {}
    categories.forEach((c) => {
      map[c.id] = c
    })
    return map
  }, [categories])

  const getCatStyle = (catId) => {
    if (categoryMap[catId]) {
      return {
        bg: categoryMap[catId].bg,
        ink: categoryMap[catId].ink || '#111111',
        label: categoryMap[catId].label,
      }
    }
    return { bg: 'var(--surface-2)', ink: 'var(--text)', label: catId || 'EVENT' }
  }

  // Generate calendar matrix for month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7 // MON = 0

  const daysArray = useMemo(() => {
    const days = []
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const formattedMonth = String(month + 1).padStart(2, '0')
      const formattedDay = String(d).padStart(2, '0')
      const iso = `${year}-${formattedMonth}-${formattedDay}`
      days.push({ dayNumber: d, iso })
    }
    // Always pad to a full 6-row grid (42 cells) so cell size stays constant
    // across every month, regardless of how many weeks that month actually spans.
    while (days.length < 42) {
      days.push(null)
    }
    return days
  }, [year, month, daysInMonth, firstDayIndex])

  const totalWeeks = 6

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach((evt) => {
      if (!map[evt.date]) map[evt.date] = []
      map[evt.date].push(evt)
    })
    return map
  }, [events])

  // Filter events for the right-hand feed
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory
      const matchesDate = !selectedDate || e.date === selectedDate
      return matchesCategory && matchesDate
    })
  }, [events, selectedCategory, selectedDate])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!title.trim() || !dateStr) return
    addEvent({
      title: title.trim().toUpperCase(),
      date: dateStr,
      category: category || categories[0]?.id || 'EXAMS',
    })
    setTitle('')
    setModalOpen(false)
  }

  const startEditCategory = (cat, e) => {
    e.stopPropagation()
    setEditingCatId(cat.id)
    setEditLabel(cat.label)
    setEditBg(cat.bg)
    setShowAddCat(false)
  }

  const saveEditCategory = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editLabel.trim() || !editingCatId) return
    updateCategory(editingCatId, {
      label: editLabel.trim().toUpperCase(),
      bg: editBg,
      ink: editBg === 'var(--disruption)' ? '#ffffff' : '#111111',
    })
    setEditingCatId(null)
  }

  const handleDeleteCategory = (catId, e) => {
    e.stopPropagation()
    if (categories.length <= 1) return
    deleteCategory(catId)
    if (category === catId) {
      const remaining = categories.filter((c) => c.id !== catId)
      if (remaining.length > 0) setCategory(remaining[0].id)
    }
  }

  const handleAddNewCategory = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!newCatLabel.trim()) return
    const newId = addCategory(
      newCatLabel.trim().toUpperCase(),
      newCatBg,
      newCatBg === 'var(--disruption)' ? '#ffffff' : '#111111',
    )
    if (newId) setCategory(newId)
    setNewCatLabel('')
    setShowAddCat(false)
  }

  return (
    <Shell>
      <div className="flex flex-col gap-4 lg:h-[calc(100dvh-3.75rem)] lg:max-h-[calc(100dvh-3.75rem)] lg:overflow-hidden">
        {/* TOP HEADER BAR */}
        <header className="board board-hard bg-[var(--surface)] pad-page flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="icon-tile shrink-0"
              style={{ background: 'var(--color-acid)', color: 'var(--on-accent)' }}
              aria-hidden
            >
              <CalendarDays className="icon-lg" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="t-masthead">
                CALENDAR
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-go flex items-center gap-1.5 shadow-hard-sm cursor-pointer !py-2 !px-3 sm:!px-4 font-black uppercase tracking-wider"
              onClick={() => {
                if (categories.length > 0 && !categories.some((c) => c.id === category)) {
                  setCategory(categories[0].id)
                }
                setDateStr(selectedDate || todayISO())
                setModalOpen(true)
              }}
            >
              <Plus className="icon-micro shrink-0" strokeWidth={3} />
              <span className="t-micro">ADD EVENT</span>
            </button>
          </div>
        </header>

        {/* CATEGORY FILTER STRIP */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="label text-xs font-bold muted mr-1 flex items-center gap-1.5">
            <Tag size={13} className="text-[var(--color-acid)]" /> FILTERS:
          </span>

          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`btn !py-1 !px-2.5 !text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'ring-2 ring-black dark:ring-white scale-105 shadow-hard-sm'
                : 'opacity-80 hover:opacity-100'
            }`}
            style={
              selectedCategory === 'ALL'
                ? { background: 'var(--text)', color: 'var(--bg)' }
                : undefined
            }
          >
            ALL EVENTS ({events.length})
          </button>

          {categories.map((cat) => {
            const active = selectedCategory === cat.id
            const count = events.filter((e) => e.category === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`btn !py-1 !px-2.5 !text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'ring-2 ring-black dark:ring-white scale-105 shadow-hard-sm'
                    : 'opacity-80 hover:opacity-100'
                }`}
                style={
                  active
                    ? { background: cat.bg, color: 'var(--on-accent)', borderColor: cat.bg }
                    : undefined
                }
              >
                {cat.label} ({count})
              </button>
            )
          })}

          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="chip !py-1 !px-2 text-xs font-bold bg-[var(--color-coral)] text-black border-2 border-black/20 flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <span>FILTERED DATE: {fmtDateDDMMYYYY(selectedDate)}</span>
              <X size={12} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* MAIN BODY: 2-COLUMN FULL-HEIGHT VIEWPORT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 items-stretch">
          {/* LEFT: INTERACTIVE MONTH CALENDAR MATRIX (col-span-7) */}
          <section className="lg:col-span-7 board board-hard bg-[var(--surface)] p-3.5 sm:p-4 flex flex-col justify-between h-full min-h-0 border-l-4 border-l-[var(--color-acid)]">
            {/* MONTH TITLE & SWITCHER */}
            <div className="flex h-7 items-center justify-between border-b border-[var(--border)] pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="t-card-title text-[var(--color-acid)]">
                  {monthName} {year}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="btn !px-2 !py-1 text-xs cursor-pointer hover:scale-105"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="btn !px-2.5 !py-1 text-xs font-bold cursor-pointer hover:scale-105"
                  style={{ background: 'var(--color-acid)', color: 'var(--on-accent)' }}
                  onClick={() => {
                    const now = new Date()
                    setCurrentDate(now)
                    setSelectedDate(todayISO(now))
                  }}
                >
                  TODAY
                </button>
                <button
                  type="button"
                  className="btn !px-2 !py-1 text-xs cursor-pointer hover:scale-105"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* WEEKDAY LABELS */}
            <div className="grid grid-cols-7 text-center label text-xs font-bold py-1 border-b border-[var(--border)] shrink-0">
              <span className="text-[var(--text)]">MON</span>
              <span className="text-[var(--text)]">TUE</span>
              <span className="text-[var(--text)]">WED</span>
              <span className="text-[var(--text)]">THU</span>
              <span className="text-[var(--text)]">FRI</span>
              <span className="text-[var(--color-acid)]">SAT</span>
              <span className="text-[var(--color-acid)]">SUN</span>
            </div>

            {/* MONTH DAY CELLS GRID */}
            <div
              className="grid grid-cols-7 gap-1.5 sm:gap-1.5 flex-1 min-h-0 pt-1"
              style={{
                gridTemplateRows: `repeat(${totalWeeks}, minmax(0, 1fr))`,
              }}
            >
              {daysArray.map((item, idx) => {
                if (!item) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="h-full rounded border border-dashed border-[var(--border)] opacity-20 bg-[var(--surface-2)]"
                    />
                  )
                }

                const isSelected = item.iso === selectedDate
                const isToday = item.iso === todayStr
                const dayEvts = eventsByDate[item.iso] || []
                const visibleEvts =
                  selectedCategory === 'ALL'
                    ? dayEvts
                    : dayEvts.filter((e) => e.category === selectedCategory)

                return (
                  <div
                    key={item.iso}
                    onClick={() => setSelectedDate(isSelected ? null : item.iso)}
                    className={`h-full pad-tight rounded border-2 flex flex-col justify-between transition-all cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'border-[var(--color-acid)] bg-[var(--color-acid)]/15 shadow-hard-sm ring-2 ring-[var(--color-acid)]'
                        : isToday
                          ? 'border-2 border-[var(--color-acid)] bg-[var(--color-acid)]/10 shadow-sm ring-1 ring-[var(--color-acid)]/50 hover:bg-[var(--color-acid)]/15'
                          : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--color-acid)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold size-5 grid place-items-center rounded transition-colors ${
                          isToday
                            ? 'bg-[var(--color-acid)] text-[var(--on-accent)] font-black shadow-xs'
                            : isSelected
                              ? 'bg-[var(--color-acid)] text-[var(--on-accent)]'
                              : 'text-[var(--text)]'
                        }`}
                      >
                        {item.dayNumber}
                      </span>
                      {visibleEvts.length > 0 && (
                        <span className="flex gap-1.5">
                          {visibleEvts.slice(0, 3).map((ev) => {
                            const catStyle = getCatStyle(ev.category)
                            return (
                              <span
                                key={ev.id}
                                className="size-1.5 rounded-full border border-black/40"
                                style={{ background: catStyle.bg }}
                              />
                            )
                          })}
                        </span>
                      )}
                    </div>

                    {/* MICRO EVENT CHIPS */}
                    <div className="space-y-1.5 overflow-hidden">
                      {visibleEvts.slice(0, 1).map((ev) => {
                        const catStyle = getCatStyle(ev.category)
                        return (
                          <div
                            key={ev.id}
                            className="text-[0.65rem] font-bold px-1 py-0.5 rounded truncate border border-black/20 shadow-xs"
                            style={{ background: catStyle.bg, color: 'var(--on-accent)' }}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        )
                      })}
                      {visibleEvts.length > 1 && (
                        <span className="text-[0.6rem] font-bold text-[var(--color-sky)] block text-right leading-none">
                          +{visibleEvts.length - 1} MORE
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* RIGHT: AGENDA FEED & REMINDERS (col-span-5) */}
          <section className="lg:col-span-5 board board-hard bg-[var(--surface)] p-3.5 sm:p-4 flex flex-col h-full min-h-0 border-l-4 border-l-[var(--color-acid)] justify-between space-y-3">
            <div className="flex h-7 items-center justify-between border-b border-[var(--border)] pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="t-card-title text-[var(--color-acid)]">
                  {selectedDate ? `AGENDA · ${fmtDateDDMMYYYY(selectedDate)}` : 'ALL EVENTS'}
                </h3>
              </div>
              <span className="chip !py-0.5 !px-2 text-xs font-bold">
                {filteredEvents.length} ITEMS
              </span>
            </div>

            {/* SCROLLABLE EVENT FEED CONTAINER */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar min-h-0">
              {filteredEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center rounded bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                  <CalendarIcon size={24} className="text-[var(--muted)]" />
                  <p className="label muted text-xs sm:text-sm">NO EVENTS FOUND</p>
                  <button
                    type="button"
                    className="btn btn-go !py-1.5 !px-3 text-xs sm:text-sm font-bold cursor-pointer"
                    onClick={() => {
                      setDateStr(selectedDate || todayISO())
                      setModalOpen(true)
                    }}
                  >
                    + ADD FIRST EVENT
                  </button>
                </div>
              ) : (
                filteredEvents.map((evt) => {
                  const catStyle = getCatStyle(evt.category)
                  const evtDate = isoToDate(evt.date)
                  const isEvtToday = evt.date === todayStr
                  const dayNum = evtDate.getDate()
                  const monthShort = evtDate
                    .toLocaleDateString('en-GB', { month: 'short' })
                    .toUpperCase()
                  return (
                    <div
                      key={evt.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setCurrentDate(evtDate)
                        setSelectedDate(evt.date)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setCurrentDate(evtDate)
                          setSelectedDate(evt.date)
                        }
                      }}
                      className="board board-hard bg-[var(--surface-2)] p-2.5 sm:p-3 flex items-start justify-between gap-3 border-l-4 transition-all cursor-pointer hover:bg-[var(--surface)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                      style={{ borderLeftColor: catStyle.bg }}
                    >
                      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="px-1.5 py-0.5 text-xs font-bold rounded border border-black/20 uppercase"
                            style={{ background: catStyle.bg, color: 'var(--on-accent)' }}
                          >
                            {catStyle.label}
                          </span>
                          {isEvtToday && (
                            <span
                              className="px-1.5 py-0.5 text-xs font-black rounded uppercase tracking-wider shadow-xs"
                              style={{ background: 'var(--color-acid)', color: 'var(--on-accent)' }}
                            >
                              TODAY
                            </span>
                          )}
                        </div>
                        <h4 className="t-body truncate">{evt.title}</h4>

                        {!evt.isOfficial && (
                          <button
                            type="button"
                            className="btn !py-1 !px-1.5 !text-[0.65rem] text-[var(--color-absent)] hover:bg-[var(--color-absent)] hover:text-white cursor-pointer self-start flex items-center gap-1"
                            title="Delete event"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteEvent(evt.id)
                            }}
                          >
                            <Trash2 size={12} strokeWidth={2} /> DELETE
                          </button>
                        )}
                      </div>

                      {/* DATE BADGE */}
                      <div
                        className={`shrink-0 flex flex-col items-center justify-center rounded border-2 px-2.5 py-1.5 shadow-hard-sm leading-none ${
                          isEvtToday
                            ? 'border-[var(--color-acid)] bg-[var(--color-acid)]/10 text-[var(--color-acid)]'
                            : 'border-[var(--border-strong)] bg-[var(--surface)]'
                        }`}
                      >
                        <span className="text-lg font-black">{dayNum}</span>
                        <span className="text-[0.55rem] font-bold uppercase tracking-wide muted mt-1">
                          {monthShort}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* FOOTER METADATA */}
            <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between shrink-0">
              <span className="label text-xs font-medium muted">
                100% PRIVATE · SYNCED WITH DASHBOARD
              </span>
              <span className="label text-xs font-medium muted">
                {events.length} TOTAL SAVED
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* EVENT CREATION & CATEGORY MANAGER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto">
          <div className="board board-hard w-full max-w-lg p-4 sm:p-5 space-y-4 animate-flip bg-[var(--surface)] my-auto max-h-[95vh] overflow-y-auto no-scrollbar">
            <div className="border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <h3 className="t-section text-[var(--text)]">ADD EVENT</h3>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label text-sm muted block mb-1.5">
                  EVENT TITLE (AUTOCAPITALISED)
                </label>
                <input
                  type="text"
                  required
                  className="field text-sm uppercase tracking-wider"
                  placeholder="E.G. MID-TERM QUIZ OR LAB SUBMISSION"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="label text-sm muted block mb-1.5">
                  EVENT DATE
                </label>
                <input
                  type="date"
                  required
                  className="field text-sm"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>

              {/* CATEGORIES SECTION WITH EDIT & ADD CONTROLS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label text-sm muted flex items-center gap-1.5">
                    <Tag size={13} className="text-[var(--color-acid)]" />
                    CATEGORY & BADGE COLOR
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCat(!showAddCat)
                      setEditingCatId(null)
                    }}
                    className="btn !py-1 !px-2 text-sm text-[var(--color-present)] hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={12} strokeWidth={2.5} /> ADD CATEGORY
                  </button>
                </div>

                {/* INLINE ADD CATEGORY FORM */}
                {showAddCat && (
                  <div className="p-3 mb-3 rounded bg-[var(--surface-2)] border-2 border-[var(--color-present)] space-y-2 animate-flip">
                    <div className="flex items-center justify-between">
                      <span className="label text-sm text-[var(--color-present)]">
                        CREATE NEW CATEGORY
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddCat(false)}
                        className="text-sm muted hover:text-[var(--text)] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="CATEGORY NAME..."
                        className="field text-sm uppercase flex-1 !py-1.5"
                        value={newCatLabel}
                        onChange={(e) => setNewCatLabel(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <span className="label text-sm muted block mb-1">PICK COLOR:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_PALETTE.map((c) => (
                          <button
                            key={c.label}
                            type="button"
                            onClick={() => setNewCatBg(c.value)}
                            className={`size-6 rounded border cursor-pointer transition-transform ${
                              newCatBg === c.value
                                ? 'scale-110 ring-2 ring-black dark:ring-white border-white'
                                : 'border-black/30'
                            }`}
                            style={{ background: c.bg }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        className="btn btn-go !py-1 !px-3 text-sm cursor-pointer shadow-hard-sm"
                      >
                        + SAVE CATEGORY
                      </button>
                    </div>
                  </div>
                )}

                {/* INLINE EDIT CATEGORY FORM */}
                {editingCatId && (
                  <div className="p-3 mb-3 rounded bg-[var(--surface-2)] border-2 border-[var(--color-acid)] space-y-2 animate-flip">
                    <div className="flex items-center justify-between">
                      <span className="label text-sm muted">
                        EDIT CATEGORY: {categoryMap[editingCatId]?.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="text-sm muted hover:text-[var(--text)] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      className="field text-sm uppercase w-full !py-1.5"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value.toUpperCase())}
                    />
                    <div>
                      <span className="label text-sm muted block mb-1">PICK COLOR:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_PALETTE.map((c) => (
                          <button
                            key={c.label}
                            type="button"
                            onClick={() => setEditBg(c.value)}
                            className={`size-6 rounded border cursor-pointer transition-transform ${
                              editBg === c.value
                                ? 'scale-110 ring-2 ring-black dark:ring-white border-white'
                                : 'border-black/30'
                            }`}
                            style={{ background: c.bg }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={saveEditCategory}
                        className="btn btn-go !py-1 !px-3 text-sm cursor-pointer shadow-hard-sm flex items-center gap-1.5"
                      >
                        <Check size={12} strokeWidth={2.5} /> SAVE CHANGES
                      </button>
                    </div>
                  </div>
                )}

                {/* CATEGORIES GRID */}
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const active = category === cat.id
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`rounded border-2 p-2 flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                          active
                            ? 'ring-2 ring-black dark:ring-white scale-[1.02] shadow-hard-sm border-white'
                            : 'border-black/20 opacity-80 hover:opacity-100 hover:scale-[1.01]'
                        }`}
                        style={{ background: cat.bg, color: cat.ink || '#111111' }}
                      >
                        {/* LEFT: COLOR DOT & LABEL */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="size-2.5 rounded-full bg-black/40 shrink-0" />
                          <span className="text-sm font-bold truncate uppercase tracking-wider text-[var(--on-accent)]">
                            {cat.label}
                          </span>
                        </div>

                        {/* RIGHT: EDIT & DELETE BUTTONS */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => startEditCategory(cat, e)}
                            className="p-1 rounded bg-black/20 hover:bg-black/40 text-[var(--on-accent)] cursor-pointer transition-colors"
                            title={`Edit ${cat.label} category`}
                          >
                            <Pencil size={11} strokeWidth={2} />
                          </button>
                          {categories.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCategory(cat.id, e)}
                              className="p-1 rounded bg-black/20 hover:bg-red-600 hover:text-white text-[var(--on-accent)] cursor-pointer transition-colors"
                              title={`Delete ${cat.label} category`}
                            >
                              <Trash2 size={11} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  className="btn text-sm"
                  onClick={() => setModalOpen(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="btn btn-go text-sm px-5 shadow-hard-sm cursor-pointer"
                >
                  SAVE EVENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}
