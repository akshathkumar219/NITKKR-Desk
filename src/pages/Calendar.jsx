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

  const totalWeeks = Math.ceil((firstDayIndex + daysInMonth) / 7)
  const totalCells = totalWeeks * 7

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
    while (days.length < totalCells) {
      days.push(null)
    }
    return days
  }, [year, month, daysInMonth, firstDayIndex, totalCells])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach((evt) => {
      if (!map[evt.date]) map[evt.date] = []
      map[evt.date].push(evt)
    })
    return map
  }, [events])

  // Upcoming events from today onwards
  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => (e.endDate || e.date) >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events, todayStr])

  // Filter events for the right-hand feed (or below calendar on mobile)
  const filteredEvents = useMemo(() => {
    return [...events]
      .filter((e) => {
        const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory
        const matchesDate = selectedDate ? e.date === selectedDate : (e.endDate || e.date) >= todayStr
        return matchesCategory && matchesDate
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events, selectedCategory, selectedDate, todayStr])

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

        {/* MAIN BODY: 2-COLUMN FULL-HEIGHT VIEWPORT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 flex-1 min-h-0 items-start lg:items-stretch">
          {/* LEFT: CALENDAR + FILTERS STRIP */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col gap-2.5 sm:gap-3 min-h-0">
            {/* MAIN CALENDAR (simpler, shorter, dashboard style) */}
            <section className="board board-hard bg-[var(--surface)] p-3 sm:p-4 flex flex-col border-l-4 border-l-[var(--color-acid)] shrink-0 shadow-xs">
              {/* MONTH TITLE & SWITCHER */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarIcon size={16} className="text-[var(--color-acid)] shrink-0" />
                  <h2 className="heading text-sm sm:text-base font-black text-[var(--color-acid)] truncate">
                    {monthName} {year}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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

              {/* WEEKDAY LABELS (M T W T F S S) */}
              <div className="grid grid-cols-7 text-center label text-xs font-bold py-1 border-b border-[var(--border)] mb-1.5 shrink-0">
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span className="text-[var(--color-acid)]">S</span>
                <span className="text-[var(--color-acid)]">S</span>
              </div>

              {/* MONTH DAY CELLS GRID */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {daysArray.map((item, idx) => {
                  if (!item) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="min-h-[28px] sm:min-h-[32px] rounded bg-transparent"
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
                  const hasEvent = visibleEvts.length > 0
                  const primaryCat = hasEvent ? getCatStyle(visibleEvts[0].category) : null

                  return (
                    <button
                      key={item.iso}
                      type="button"
                      onClick={() => setSelectedDate(isSelected ? null : item.iso)}
                      style={
                        isToday
                          ? {
                              backgroundColor: 'var(--color-acid)',
                              borderColor: 'var(--color-acid)',
                              color: 'var(--on-accent)',
                            }
                          : isSelected
                            ? {
                                borderColor: 'var(--color-acid)',
                                backgroundColor: 'var(--color-acid)/15',
                              }
                            : hasEvent && primaryCat
                              ? {
                                  borderColor: primaryCat.bg,
                                  backgroundColor: `color-mix(in srgb, ${primaryCat.bg} 18%, var(--surface))`,
                                  color: 'var(--text)',
                                }
                              : undefined
                      }
                      className={`min-h-[28px] sm:min-h-[32px] text-xs sm:text-[0.8125rem] font-bold rounded border transition-all grid place-items-center relative cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-[var(--color-acid)] shadow-hard-sm font-black'
                          : isToday
                            ? 'shadow-sm font-black'
                            : hasEvent
                              ? 'shadow-2xs font-extrabold hover:opacity-90'
                              : 'border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] text-[var(--text)]'
                      }`}
                      title={
                        hasEvent
                          ? visibleEvts.map((e) => e.title).join(' · ')
                          : `${item.dayNumber}`
                      }
                    >
                      <span className="leading-none">{item.dayNumber}</span>
                      {hasEvent && (
                        <span className="absolute bottom-0.5 sm:bottom-1 flex items-center justify-center gap-0.5 pointer-events-none">
                          {visibleEvts.slice(0, 3).map((ev) => {
                            const catStyle = getCatStyle(ev.category)
                            return (
                              <span
                                key={ev.id}
                                className="size-1 sm:size-1.5 rounded-full border border-black/30"
                                style={{ background: isToday ? 'var(--on-accent)' : catStyle.bg }}
                              />
                            )
                          })}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* FILTERS PART (visible directly below calendar) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
              <span className="label text-xs font-bold muted mr-0.5 flex items-center gap-1 shrink-0">
                <Tag size={13} className="text-[var(--color-acid)]" /> FILTERS:
              </span>

              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`btn !py-1 !px-2.5 !text-xs font-bold transition-all cursor-pointer shrink-0 ${
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
                UPCOMING ({upcomingEvents.length})
              </button>

              {categories.map((cat) => {
                const active = selectedCategory === cat.id
                const count = upcomingEvents.filter((e) => e.category === cat.id).length
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`btn !py-1 !px-2.5 !text-xs font-bold transition-all cursor-pointer shrink-0 ${
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
                  className="chip !py-1 !px-2 text-xs font-bold bg-[var(--color-coral)] text-black border-2 border-black/20 flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto"
                >
                  <span>FILTER: {fmtDateDDMMYYYY(selectedDate)}</span>
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: AGENDA FEED & EVENTS LIST */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col flex-1 h-full min-h-0">
            <section className="board board-hard bg-[var(--surface)] p-3.5 sm:p-4 flex flex-col min-h-[350px] lg:min-h-0 flex-1 lg:h-full border-l-4 border-l-[var(--color-acid)] justify-between space-y-3">
              <div className="flex h-7 items-center justify-between border-b border-[var(--border)] pb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="t-card-title text-[var(--color-acid)]">
                    {selectedDate ? `AGENDA · ${fmtDateDDMMYYYY(selectedDate)}` : 'UPCOMING EVENTS'}
                  </h3>
                </div>
                <span className="chip !py-0.5 !px-2 text-xs font-bold">
                  {filteredEvents.length} {selectedDate ? 'ITEMS' : 'UPCOMING'}
                </span>
              </div>

              {/* SCROLLABLE EVENT FEED CONTAINER */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar min-h-0">
                {filteredEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center rounded bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                    <CalendarIcon size={24} className="text-[var(--muted)]" />
                    <p className="label muted text-xs sm:text-sm">
                      {selectedDate ? 'NO EVENTS ON THIS DATE' : 'NO UPCOMING EVENTS'}
                    </p>
                    <button
                      type="button"
                      className="btn btn-go !py-1.5 !px-3 text-xs sm:text-sm font-bold cursor-pointer"
                      onClick={() => {
                        setDateStr(selectedDate || todayISO())
                        setModalOpen(true)
                      }}
                    >
                      + ADD EVENT
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
                        className="board board-hard bg-[var(--surface-2)] p-2.5 sm:p-3 flex items-center justify-between gap-3 border-l-4 transition-all cursor-pointer hover:bg-[var(--surface)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                        style={{ borderLeftColor: catStyle.bg }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className="size-2 rounded-full shrink-0 border border-black/30"
                            style={{ background: catStyle.bg }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="t-body truncate font-bold text-xs sm:text-sm" title={evt.title}>
                                {evt.title}
                              </h4>
                              {isEvtToday && (
                                <span
                                  className="px-1.5 py-0.5 text-[0.6rem] font-black rounded uppercase tracking-wider shadow-xs shrink-0"
                                  style={{ background: 'var(--color-acid)', color: 'var(--on-accent)' }}
                                >
                                  TODAY
                                </span>
                              )}
                            </div>
                          </div>

                          {!evt.isOfficial && (
                            <button
                              type="button"
                              className="btn !py-0.5 !px-1.5 !text-[0.65rem] text-[var(--color-absent)] hover:bg-[var(--color-absent)] hover:text-white cursor-pointer shrink-0 flex items-center gap-1"
                              title="Delete event"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteEvent(evt.id)
                              }}
                            >
                              <Trash2 size={11} strokeWidth={2} />
                            </button>
                          )}
                        </div>

                        {/* DATE BADGE */}
                        <div
                          className={`shrink-0 flex flex-col items-center justify-center rounded border px-2 py-1 shadow-xs leading-none ${
                            isEvtToday
                              ? 'border-[var(--color-acid)] bg-[var(--color-acid)]/10 text-[var(--color-acid)]'
                              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-black">{dayNum}</span>
                          <span className="text-[0.6rem] sm:text-[0.65rem] font-bold muted tracking-wide mt-0.5">
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
                <span className="label text-xs font-bold text-[var(--color-acid)]">
                  {selectedCategory === 'ALL' ? 'ALL CATEGORIES' : selectedCategory}
                </span>
              </div>
            </section>
          </div>
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
