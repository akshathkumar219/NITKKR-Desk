import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  CheckCheck,
  ChefHat,
  Clock,
  Coffee,
  LayoutGrid,
  List,
  MoonStar,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Utensils,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import Shell from '../components/Shell'
import { Field, Modal, Panel } from '../ui'
import { HOSTELS, hostelName } from '../data/campus'
import { MEALS, isLiveMeal, menuFor } from '../data/mess'
import { useMessOverrides, usePantry, useProfile } from '../lib/storage'
import { DAYS_7, dayCode, minutesNow } from '../lib/time'

/* ------------------------------------------------------------- Haptics ---------------- */

function triggerHaptic(duration = 12) {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate(duration)
    }
  } catch {}
}

const STASH_PRESETS = ['EGGS', 'COFFEE', 'MILK', 'DAHI', 'APPLES', 'POHA', 'MAGGI', 'PEANUT BUTTER']

// Keywords that mark a meal's "special extra" as a highlighted treat day
// (thicker amber outline on the extra strip in MealCard). General rule: any
// sweet/dessert in the extra column should light this up, not just the
// handful that happened to show up in the first few hostels' menus.
const SPECIAL_EXTRA_KEYWORDS = [
  'SWEET', 'DESSERT', 'MITHAI', 'RASGULLA', 'RASMALAI', 'JAMUN', 'KHEER',
  'HALWA', 'BARFI', 'LADDU', 'LADOO', 'JALEBI', 'PEDA', 'RABRI', 'BASUNDI',
  'SHRIKHAND', 'MALPUA', 'FIRNI', 'PAYASAM', 'KALAKAND', 'SANDESH', 'GUJIYA',
  'SEVAI', 'SEVIYAN', 'SEVYA', 'ICE', 'CREAM', 'CAKE',
]

/* ----------------------------------------------------------- Meal Icon Helper ---------- */

function MealIcon({ mealKey, size = 20, color = 'var(--color-ink)' }) {
  if (mealKey === 'breakfast') {
    return <Coffee size={size} strokeWidth={2.5} color={color} />
  }
  if (mealKey === 'lunch') {
    return <Utensils size={size} strokeWidth={2.5} color={color} />
  }
  return <MoonStar size={size} strokeWidth={2.5} color={color} />
}

/* ----------------------------------------------------------- Helper Calculations ------ */

function formatDuration(mins) {
  if (mins < 60) return `${mins}M`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}H ${m}M` : `${h}H`
}

function generateShareText(hostel, dayName, dayMenu) {
  const lines = [
    `🍽️ NITKKR MESS MENU · ${hostelName(hostel).toUpperCase()}`,
    `📅 ${dayName} SCHEDULE`,
    '────────────────────────',
  ]

  MEALS.forEach((m) => {
    const mData = dayMenu[m.key]
    const items = Array.isArray(mData) ? mData : mData?.items ?? []
    const extra = !Array.isArray(mData) ? mData?.extra : null
    const icon = m.key === 'breakfast' ? '☕' : m.key === 'lunch' ? '🍛' : '🌙'
    lines.push(`\n${icon} ${m.label} (${m.time}):`)
    if (items.length > 0) {
      lines.push(`   ${items.join(' · ')}`)
    } else {
      lines.push('   No dishes listed')
    }
    if (extra) {
      lines.push(`   ✨ EXTRA: ${extra}`)
    }
  })

  lines.push('\n────────────────────────')
  lines.push('📱 Shared from NITKKR Desk')
  return lines.join('\n')
}

/* ----------------------------------------------------------- Edit Meal Modal ----------- */

function EditMealModal({ open, day, meal, data, onClose, onSave }) {
  const [itemsText, setItemsText] = useState('')
  const [extraText, setExtraText] = useState('')

  useEffect(() => {
    if (open) {
      const items = Array.isArray(data) ? data : data?.items ?? []
      const extra = !Array.isArray(data) ? data?.extra ?? '' : ''
      setItemsText(items.join('\n'))
      setExtraText(extra)
    }
  }, [open, data])

  function handleSubmit(e) {
    e.preventDefault()
    const cleanItems = itemsText
      .split(/[\n,]/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)

    if (cleanItems.length === 0) return

    onSave({
      items: cleanItems,
      extra: extraText.trim().toUpperCase() || null,
    })
    onClose()
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`EDIT ${meal?.label || 'MEAL'} (${day})`}
      sub="CUSTOMIZE FOOD DISHES & DAILY EXTRA FOR THIS MEAL"
      footer={
        <>
          <button
            type="button"
            className="btn cursor-pointer font-semibold text-xs sm:text-sm !py-1.5 !px-3"
            onClick={() => {
              triggerHaptic()
              onClose()
            }}
          >
            CANCEL
          </button>
          <button
            type="submit"
            form="edit-meal-form"
            className="btn cursor-pointer font-bold text-xs sm:text-sm !py-1.5 !px-3.5 !bg-[var(--color-present)] !text-black !border-[var(--color-present)] shadow-sm"
          >
            SAVE DISHES
          </button>
        </>
      }
    >
      <form id="edit-meal-form" className="space-y-4" onSubmit={handleSubmit}>
        <Field label="FOOD ITEMS (ONE DISH PER LINE OR COMMA-SEPARATED)" id="m-items">
          <textarea
            id="m-items"
            rows={6}
            className="field uppercase text-xs sm:text-sm font-normal resize-none leading-relaxed"
            placeholder="AALOO PYAZ PARATHA&#10;GREEN CHATNI&#10;TEA&#10;DAHI"
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value.toUpperCase())}
            autoFocus
          />
        </Field>

        <Field label="SPECIAL EXTRA / SWEET (OPTIONAL)" id="m-extra">
          <input
            id="m-extra"
            className="field uppercase text-xs sm:text-sm font-normal"
            placeholder="E.G. HOT MILK / RASMALAI / ICE-CREAM / GULAB JAMUN"
            value={extraText}
            onChange={(e) => setExtraText(e.target.value.toUpperCase())}
          />
        </Field>
      </form>
    </Modal>
  )
}

/* ----------------------------------------------------------- Hero Meal Card ------------ */

function MealCard({ meal, data, isLive, currentMins, isToday, editing, onEdit, searchQuery }) {
  const items = Array.isArray(data) ? data : data?.items ?? []
  const extra = !Array.isArray(data) ? data?.extra : null
  const isSpecialExtra = extra
    ? SPECIAL_EXTRA_KEYWORDS.some((kw) => extra.toUpperCase().includes(kw))
    : false

  const minsRemaining = isLive ? Math.max(0, meal.endMins - currentMins) : 0
  const isUpcoming = isToday && currentMins < meal.startMins
  const minsUntil = isUpcoming ? meal.startMins - currentMins : 0
  const isDone = isToday && !isLive && currentMins >= meal.endMins

  const queryUpper = searchQuery ? searchQuery.trim().toUpperCase() : ''
  const hasMatchingItems = queryUpper
    ? items.some((it) => it.toUpperCase().includes(queryUpper)) ||
      (extra && extra.toUpperCase().includes(queryUpper))
    : false

  return (
    <Panel
      className={`board board-hard bg-[var(--surface)] p-4 sm:p-5 flex flex-col justify-between transition-all border-l-4 sm:border-l-[6px] ${
        isLive
          ? '!border-[var(--color-present)] shadow-[0_0_18px_rgba(34,197,94,0.3)] ring-1 ring-[var(--color-present)]/60'
          : hasMatchingItems
            ? '!border-[var(--color-acid)] shadow-[0_0_12px_rgba(163,230,53,0.25)]'
            : ''
      }`}
      style={{
        borderLeftColor: isLive ? 'var(--color-present)' : hasMatchingItems ? 'var(--color-acid)' : meal.accent,
      }}
    >
      <div>
        {/* Meal Card Top Header */}
        <div className="flex items-start flex-wrap justify-between gap-x-3 gap-y-2 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="grid size-10 sm:size-11 shrink-0 place-items-center border-2 border-[var(--border)] shadow-2xs"
              style={{ background: meal.accent, borderRadius: 'var(--radius-board)' }}
              aria-hidden
            >
              <MealIcon mealKey={meal.key} size={20} color="var(--on-accent)" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="t-card-title text-[var(--text)]" style={{ fontSize: 20 }}>
                  {meal.label}
                </h3>
                {hasMatchingItems && queryUpper ? (
                  <span className="chip !py-0.5 !px-1.5 text-[0.625rem] font-bold bg-[var(--color-acid)] text-black border-none">
                    MATCH
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)] font-normal flex items-center gap-1.5">
                <Clock size={12} strokeWidth={2} />
                <span>{meal.time}</span>
              </p>
            </div>
          </div>

          {/* Right Status Badge or Edit Action */}
          <div className="shrink-0 pt-0.5 ml-auto">
            {editing ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic()
                  onEdit()
                }}
                className="btn !py-1.5 !px-2.5 sm:!px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                style={{ background: meal.accent, color: 'var(--on-accent)' }}
              >
                <Pencil size={12} strokeWidth={2.2} />
                <span>EDIT</span>
              </button>
            ) : isLive ? (
              <span className="chip !py-1 !px-2.5 text-xs font-bold text-black flex items-center gap-1.5 border-none bg-[var(--color-present)] animate-pulse shadow-2xs">
                <span className="size-1.5 rounded-full bg-black" />
                <span>LIVE · {formatDuration(minsRemaining)} LEFT</span>
              </span>
            ) : isUpcoming ? (
              <span className="chip !py-1.5 !px-3 text-xs sm:text-sm font-bold text-[var(--muted)] flex items-center gap-1.5 border border-[var(--border)] bg-[var(--surface-2)]">
                <span>IN {formatDuration(minsUntil)}</span>
              </span>
            ) : isDone ? (
              <span className="chip !py-1.5 !px-3 text-xs sm:text-sm font-bold text-[var(--muted)] flex items-center gap-1.5 border border-[var(--border)] bg-[var(--surface-2)]">
                <span>DONE</span>
              </span>
            ) : (
              <span className="text-xs font-semibold text-[var(--muted)] tracking-wider">
                {items.length} ITEMS
              </span>
            )}
          </div>
        </div>

        {/* Menu Items List */}
        {items.length === 0 ? (
          <p className="text-xs sm:text-sm text-[var(--muted)] font-normal py-6 text-center italic">
            No dishes scheduled for this meal.
          </p>
        ) : (
          <ol className="divide-y divide-[var(--border)] mt-1">
            {items.map((item, i) => {
              const isMatch = queryUpper && item.toUpperCase().includes(queryUpper)
              return (
                <li
                  key={`${meal.key}-${i}`}
                  className={`flex items-center gap-3 px-1 py-2 sm:py-2.5 transition-colors rounded-xs ${
                    isMatch ? 'bg-[var(--color-acid)]/15 font-semibold' : 'hover:bg-[var(--surface-2)]/70'
                  }`}
                >
                  <span
                    className="text-[0.6875rem] sm:text-xs font-bold font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] shrink-0"
                    style={{ color: meal.accent === 'var(--color-amber)' ? 'var(--warn-ink)' : 'inherit' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-xs sm:text-sm text-[var(--text)] leading-snug tracking-tight uppercase ${
                      isMatch ? 'font-bold' : 'font-normal'
                    }`}
                  >
                    {item}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* Special Extras / Sweets Vault Strip */}
      {extra ? (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div
            className={`px-2.5 sm:px-3 py-2 rounded-lg flex items-center justify-between gap-3 bg-[var(--surface-2)] ${
              isSpecialExtra ? 'border-2' : 'border'
            }`}
            style={{
              borderColor: isSpecialExtra ? 'var(--color-amber)' : 'var(--border)',
            }}
          >
            <p className="text-xs sm:text-sm font-semibold text-[var(--text)] uppercase truncate min-w-0">
              {extra}
            </p>
            <span className="chip !py-0.5 !px-2 text-[0.625rem] font-bold shrink-0 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]">
              EXTRA
            </span>
          </div>
        </div>
      ) : null}
    </Panel>
  )
}

/* ----------------------------------------------------------- 7-Day Matrix Component ---- */

function MessWeekMatrix({ hostelCode, overrides, searchQuery }) {
  const queryUpper = searchQuery ? searchQuery.trim().toUpperCase() : ''
  const today = dayCode()

  return (
    <Panel className="board board-hard bg-[var(--surface)] overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Table Header Strip */}
      <div className="border-b border-[var(--border)] px-4 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-[var(--surface-2)]">
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} strokeWidth={2.2} className="text-[var(--muted)]" />
          <h2 className="t-card-title text-[var(--text)]">
            7-DAY MESS SCHEDULE · {hostelName(hostelCode).toUpperCase()}
          </h2>
        </div>
        {queryUpper ? (
          <span className="chip !py-0.5 !px-2 text-xs font-semibold bg-[var(--color-acid)] text-black border-none">
            FILTERING: &quot;{queryUpper}&quot;
          </span>
        ) : null}
      </div>

      {/* Scrollable Matrix Rows */}
      <div className="overflow-auto no-scrollbar flex-1 p-3 sm:p-4">
        <div className="min-w-[720px] space-y-3">
          {DAYS_7.map((d) => {
            const dayMenu = menuFor(hostelCode, d, overrides)
            const isToday = d === today

            // Check if any meal on this day matches the search query
            const dayMatchesQuery = queryUpper
              ? MEALS.some((m) => {
                  const mData = dayMenu[m.key]
                  const itList = Array.isArray(mData) ? mData : mData?.items ?? []
                  const ext = !Array.isArray(mData) ? mData?.extra : null
                  return (
                    itList.some((it) => it.toUpperCase().includes(queryUpper)) ||
                    (ext && ext.toUpperCase().includes(queryUpper))
                  )
                })
              : false

            return (
              <div
                key={d}
                className={`board board-hard bg-[var(--surface)] p-3.5 sm:p-4 rounded-lg border-2 transition-all ${
                  isToday
                    ? 'border-l-6 border-l-[var(--color-acid)] border-[var(--border)] shadow-xs'
                    : dayMatchesQuery
                      ? 'border-[var(--color-acid)]'
                      : 'border-[var(--border)]'
                }`}
              >
                {/* Day Header Row */}
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <span className="t-card-title text-[var(--text)]">{d}</span>
                    {isToday ? (
                      <span className="chip !py-0.5 !px-2 text-[0.625rem] font-black text-black bg-[var(--color-acid)] border-none">
                        TODAY
                      </span>
                    ) : null}
                    {dayMatchesQuery && queryUpper ? (
                      <span className="chip !py-0.5 !px-2 text-[0.625rem] font-bold bg-[var(--color-acid)]/20 text-[var(--text)] border border-[var(--color-acid)]">
                        MATCHES SEARCH
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* 3 Meals Side-by-Side Columns */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 divide-x divide-[var(--border)]">
                  {MEALS.map((m, idx) => {
                    const mData = dayMenu[m.key]
                    const itList = Array.isArray(mData) ? mData : mData?.items ?? []
                    const ext = !Array.isArray(mData) ? mData?.extra : null

                    const mealMatches = queryUpper
                      ? itList.some((it) => it.toUpperCase().includes(queryUpper)) ||
                        (ext && ext.toUpperCase().includes(queryUpper))
                      : false

                    return (
                      <div key={m.key} className={`space-y-1.5 ${idx > 0 ? 'pl-3 sm:pl-4' : ''}`}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[0.625rem] sm:text-xs font-bold uppercase px-2 py-0.5 rounded inline-block border"
                            style={{
                              background: m.accent,
                              color: 'var(--color-ink)',
                              borderColor: 'rgba(0,0,0,0.12)',
                            }}
                          >
                            {m.label}
                          </span>
                        </div>
                        <p
                          className={`text-xs sm:text-sm leading-relaxed ${
                            mealMatches ? 'text-[var(--text)] font-semibold' : 'text-[var(--muted)] font-normal'
                          }`}
                        >
                          {itList.join(', ')}
                        </p>
                        {ext ? (
                          <p className="text-xs font-semibold text-[var(--warn-ink)] flex items-center gap-1.5 mt-1">
                            <Sparkles size={11} className="text-[var(--color-amber)] shrink-0" />
                            <span>{ext}</span>
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}

/* ----------------------------------------------------------- Room Stash Component ------ */

function RoomStashPanel({
  pantryItems,
  checkedCount,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  customInput,
  onCustomInputChange,
  onCustomInputSubmit,
  pantryMemo,
  onMemoChange,
  onClearMemo,
}) {
  return (
    <Panel className="board board-hard bg-[var(--surface)] p-4 sm:p-5 border-l-4 sm:border-l-[6px] border-l-[var(--color-fuchsia)] shrink-0">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        {/* Left Area: Stash Checklist & Quick Adds */}
        <div className="flex-1 space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <span
                className="grid size-11 shrink-0 place-items-center border border-[var(--border)]"
                style={{ background: 'var(--color-fuchsia)', borderRadius: 'var(--radius-board)' }}
              >
                <ChefHat size={20} strokeWidth={2.5} color="var(--color-fuchsia-ink)" />
              </span>
              <h3 className="t-card-title text-[var(--text)]" style={{ fontSize: 20 }}>
                ROOM CHEF
              </h3>
            </div>
            <span className="chip !py-0.5 !px-2.5 text-xs font-bold bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]">
              {checkedCount}/{pantryItems.length} IN STOCK
            </span>
          </div>

          {/* Quick Add Presets Strip */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[0.625rem] sm:text-xs font-semibold text-[var(--muted)] uppercase mr-1">
              QUICK ADD:
            </span>
            {STASH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  triggerHaptic()
                  onAddItem(preset)
                }}
                className="btn !py-1 !px-2 text-[0.6875rem] sm:text-xs font-semibold cursor-pointer transition-all hover:border-[var(--color-fuchsia)]"
              >
                + {preset}
              </button>
            ))}
          </div>

          {/* Stash Items Interactive Checklist */}
          <div className="flex flex-wrap gap-2 pt-1 min-h-[36px]">
            {pantryItems.length === 0 ? (
              <p className="text-xs sm:text-sm text-[var(--muted)] font-normal italic py-1">
                No room items added yet. Click a quick preset above or type below.
              </p>
            ) : (
              pantryItems.map((item) => (
                <div
                  key={item.id}
                  className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
                    item.checked
                      ? 'bg-[var(--surface-2)] border-[var(--color-present)] text-[var(--text)]'
                      : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)] hover:border-[var(--text)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic()
                      onToggleItem(item.id)
                    }}
                    className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-normal select-none"
                    title={item.checked ? 'Mark as needed' : 'Mark as in stock'}
                  >
                    <span
                      className={`size-4 rounded border grid place-items-center transition-all ${
                        item.checked
                          ? 'bg-[var(--color-present)] border-[var(--color-present)] text-black'
                          : 'border-[var(--border-strong)] bg-[var(--surface)]'
                      }`}
                    >
                      {item.checked ? <Check size={11} strokeWidth={3} /> : null}
                    </span>
                    <span className={item.checked ? 'line-through opacity-70' : 'font-medium'}>
                      {item.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic()
                      onDeleteItem(item.id)
                    }}
                    className="text-[var(--muted)] hover:text-[var(--absent-ink)] p-0.5 rounded cursor-pointer transition-colors"
                    aria-label={`Delete ${item.name}`}
                  >
                    <X size={13} strokeWidth={2.2} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Custom Item Input Bar */}
          <form onSubmit={onCustomInputSubmit} className="flex items-center gap-2 pt-1">
            <input
              className="field uppercase !py-2 text-xs sm:text-sm font-normal flex-1"
              placeholder="ADD ROOM ITEM (E.G. PEANUT BUTTER, FRUITS, CHIPS)..."
              value={customInput}
              onChange={onCustomInputChange}
            />
            <button
              type="submit"
              className="btn btn-go !py-2 !px-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase cursor-pointer shrink-0 flex items-center gap-1.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
            >
              <Plus className="icon-micro shrink-0" strokeWidth={2.5} />
              <span>ADD</span>
            </button>
          </form>
        </div>

        {/* Right Area: Cooking & Canteen Memo Notepad */}
        <div className="lg:w-88 flex flex-col gap-2 border-t lg:border-t-0 lg:border-l border-[var(--border)] pt-3 lg:pt-0 lg:pl-4 self-stretch">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--muted)] uppercase flex items-center gap-1.5">
              <Coffee size={13} className="text-[var(--color-fuchsia)]" />
              <span>COOKING & CANTEEN MEMO</span>
            </label>
            {pantryMemo ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic()
                  onClearMemo()
                }}
                className="text-[0.6875rem] font-semibold text-[var(--absent-ink)] hover:underline cursor-pointer"
              >
                CLEAR
              </button>
            ) : null}
          </div>
          <textarea
            className="field !py-2.5 !px-3 text-xs sm:text-sm font-normal resize-none uppercase flex-1 min-h-[110px] leading-relaxed"
            placeholder="E.G. 2 BOILED EGGS AT 5 PM · BUY MILK PACKET AT MARKET GATE..."
            value={pantryMemo}
            onChange={onMemoChange}
          />
        </div>
      </div>
    </Panel>
  )
}

/* ----------------------------------------------------------- Main Page Component ------- */

export default function Mess() {
  const { profile, update } = useProfile()
  const { pantry, addItem, toggleItem, deleteItem, setMemo } = usePantry()
  const { overrides, updateMeal, resetHostel, isCustomised } = useMessOverrides(profile.hostel)

  const today = dayCode()
  const [day, setDay] = useState(today)
  const [view, setView] = useState('day') // 'day' | 'week'
  const [editing, setEditing] = useState(false)
  const [editModal, setEditModal] = useState({ open: false, meal: null, data: null })
  const [customInput, setCustomInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedToast, setCopiedToast] = useState(false)

  const menu = useMemo(() => {
    return menuFor(profile.hostel, day, overrides)
  }, [profile.hostel, day, overrides])

  const currentMins = minutesNow()

  function handleShare() {
    triggerHaptic()
    const text = generateShareText(profile.hostel, day, menu)
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedToast(true)
        setTimeout(() => setCopiedToast(false), 2400)
      }).catch(() => {})
    }
  }

  function handleAddCustom(e) {
    if (e) e.preventDefault()
    if (!customInput.trim()) return
    triggerHaptic()
    addItem(customInput.trim())
    setCustomInput('')
  }

  const pantryItems = pantry?.items || []
  const pantryMemo = pantry?.memo || ''
  const checkedCount = useMemo(() => {
    return (pantry?.items || []).filter((it) => it.checked).length
  }, [pantry?.items])

  return (
    <Shell>
      <div className="space-y-3 sm:space-y-4">
        {/* MESS MENU HEADER */}
        <Panel className="board board-hard bg-[var(--surface)] p-4 sm:p-5">
          {/* Title & Primary Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            {/* Title & Context */}
            <div className="flex items-center gap-3">
              <span className="icon-tile" style={{ background: 'var(--color-amber)' }} aria-hidden>
                <UtensilsCrossed className="icon-lg" strokeWidth={2.5} color="var(--on-accent)" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="t-masthead text-[var(--text)]">
                    MESS MENU
                  </h1>
                  {isCustomised ? (
                    <span className="chip !py-0.5 !px-2 text-[0.625rem] sm:text-xs font-bold bg-[var(--surface-2)] border-none">
                      EDITED
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Hostel Selector, Share & Edit Actions */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Hostel Selector */}
              <div className="btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3.5 flex items-center gap-1.5 cursor-pointer transition-all border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm">
                <span className="text-[0.625rem] sm:text-xs font-bold tracking-wider text-[var(--muted)] mr-1">
                  HOSTEL
                </span>
                <select
                  aria-label="Hostel"
                  className="bg-transparent text-xs sm:text-sm font-bold tracking-wider uppercase outline-none cursor-pointer text-[var(--text)] max-w-[150px] sm:max-w-none truncate"
                  value={profile.hostel}
                  onChange={(e) => {
                    triggerHaptic()
                    update({ hostel: e.target.value, hostelPicked: true })
                  }}
                >
                  {HOSTELS.map((h) => (
                    <option key={h.code} value={h.code} className="bg-[var(--surface)] text-[var(--text)]">
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Share Menu Button */}
              <button
                type="button"
                onClick={handleShare}
                className="btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                title="Copy formatted menu for WhatsApp"
              >
                {copiedToast ? (
                  <>
                    <CheckCheck className="icon-micro shrink-0 text-[var(--present-ink)]" strokeWidth={2.5} />
                    <span className="text-[var(--present-ink)] font-bold">COPIED!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="icon-micro shrink-0" strokeWidth={2.2} />
                    <span>SHARE</span>
                  </>
                )}
              </button>

              {/* Edit Mode Toggle */}
              {editing ? (
                <>
                  <button
                    type="button"
                    className="btn btn-go !py-1.5 sm:!py-2 !px-3 sm:!px-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                    onClick={() => {
                      triggerHaptic()
                      setEditing(false)
                    }}
                  >
                    DONE
                  </button>
                  <button
                    type="button"
                    className="btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                    disabled={!isCustomised}
                    onClick={() => {
                      triggerHaptic()
                      if (
                        confirm(
                          `Reset ${hostelName(profile.hostel)} menu to published schedule? Your custom food edits will be lost.`,
                        )
                      ) {
                        resetHostel()
                      }
                    }}
                  >
                    <RotateCcw size={13} strokeWidth={2} />
                    <span>RESET</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer transition-all border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                  onClick={() => {
                    triggerHaptic()
                    setEditing(true)
                  }}
                >
                  <Pencil className="icon-micro shrink-0" strokeWidth={2} />
                  <span>EDIT MENU</span>
                </button>
              )}
            </div>
          </div>
        </Panel>

        {/* NATIVE SEGMENTED 7-DAY & VIEW TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 7-Day Switcher Pill Container */}
          <div className="flex flex-wrap items-center gap-1.5">
            {DAYS_7.map((d) => {
              const isActive = day === d
              const isTodayDot = d === today
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    triggerHaptic()
                    setDay(d)
                  }}
                  className={`btn !px-3 !py-1.5 text-xs sm:text-sm font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                    isActive
                      ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                  }`}
                >
                  <span>{d}</span>
                  {isTodayDot ? (
                    <span className="relative flex size-1.5 shrink-0" title="Today">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-present)] opacity-75" />
                      <span className="relative inline-flex rounded-full size-1.5 bg-[var(--color-present)]" />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Quick Dish Search & View Mode Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Dish Search Input */}
            <div className="relative flex-1 sm:w-72">
              <Search
                size={13}
                strokeWidth={2.2}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search dish (paneer, halwa)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field !py-1.5 !pl-7.5 !pr-7 text-xs font-normal uppercase w-full bg-[var(--surface)]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic()
                    setSearchQuery('')
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              ) : null}
            </div>

            {/* View Mode Switcher Pills */}
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic()
                  setView('day')
                }}
                className={`btn !px-2.5 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                  view === 'day'
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                }`}
                title="3 Hero Meal Cards"
              >
                <List size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic()
                  setView('week')
                }}
                className={`btn !px-2.5 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                  view === 'week'
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                }`}
                title="7-Day Schedule Matrix"
              >
                <LayoutGrid size={14} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        {view === 'week' ? (
          <MessWeekMatrix
            hostelCode={profile.hostel}
            overrides={overrides}
            searchQuery={searchQuery}
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* 3 HERO MEAL CARDS (GRID OF 3 COLUMNS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {MEALS.map((meal) => {
                const isLive = day === today && isLiveMeal(meal, currentMins)
                const mealData = menu[meal.key]
                return (
                  <MealCard
                    key={meal.key}
                    meal={meal}
                    data={mealData}
                    isLive={isLive}
                    isToday={day === today}
                    editing={editing}
                    currentMins={currentMins}
                    searchQuery={searchQuery}
                    onEdit={() => setEditModal({ open: true, meal, data: mealData })}
                  />
                )
              })}
            </div>

            {/* ROOM STASH & HOSTEL PANTRY PANEL */}
            <RoomStashPanel
              pantryItems={pantryItems}
              checkedCount={checkedCount}
              onAddItem={addItem}
              onToggleItem={toggleItem}
              onDeleteItem={deleteItem}
              customInput={customInput}
              onCustomInputChange={(e) => setCustomInput(e.target.value.toUpperCase())}
              onCustomInputSubmit={handleAddCustom}
              pantryMemo={pantryMemo}
              onMemoChange={(e) => setMemo(e.target.value.toUpperCase())}
              onClearMemo={() => setMemo('')}
            />
          </div>
        )}

        {/* EDIT MEAL MODAL */}
        <EditMealModal
          open={editModal.open}
          day={day}
          meal={editModal.meal}
          data={editModal.data}
          onClose={() => setEditModal({ open: false, meal: null, data: null })}
          onSave={(updatedData) => {
            if (editModal.meal) {
              updateMeal(day, editModal.meal.key, updatedData)
            }
          }}
        />
      </div>
    </Shell>
  )
}
