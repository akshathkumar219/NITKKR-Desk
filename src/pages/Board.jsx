import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, GripVertical, LayoutGrid, List, Plus, Search } from 'lucide-react'
import Shell from '../components/Shell'
import SessionModal from '../components/SessionModal'
import { Chip, EmptyState, PageHeader, Panel, Segmented, Select } from '../ui'
import { BRANCHES, TYPE_STYLE, YEARS, branchName } from '../data/campus'
import { useProfile } from '../lib/storage'
import { gridBounds, sessionsForDay, useBoard } from '../lib/board'
import { DAYS, dayCode, fmtRange } from '../lib/time'
import { MARKS, useRollcall } from '../lib/rollcall'
import { todayISO } from '../lib/time'

const MARK_TONE = {
  present: 'var(--color-present)',
  absent: 'var(--color-absent)',
  cancelled: 'var(--color-cancelled)',
}


/* --------------------------------------------------------------- Day card -- */

function SessionCard({ session, mark, onEdit, onMark, editing, isToday }) {
  const style = TYPE_STYLE[session.type] ?? TYPE_STYLE.other
  const isBreak = session.type === 'break'

  return (
    <Panel className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="var(--color-amber)">{fmtRange(session.start, session.end)}</Chip>
          <Chip tone={isBreak ? undefined : style.bg}>{style.label}</Chip>
        </div>
        {!isBreak ? (
          <span
            className="grid size-8 shrink-0 place-items-center border-2 border-[var(--border)] text-[0.6rem] font-bold"
            style={{
              borderRadius: 99,
              background: mark ? MARK_TONE[mark] : 'transparent',
              color: mark ? '#fff' : 'inherit',
            }}
            title={mark ? `Marked ${mark}` : 'Not marked'}
          >
            {mark ? mark[0].toUpperCase() : '—'}
          </span>
        ) : null}
      </div>

      <h3 className="heading mt-3 text-xl">{session.name}</h3>

      {session.code ? (
        <p className="label muted mt-1">{session.code}</p>
      ) : null}

      {session.room || session.group ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {session.room ? <Chip>{session.room}</Chip> : null}
          {session.group ? <Chip>{session.group}</Chip> : null}
        </div>
      ) : null}

      {!isBreak ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t-2 border-black/10 pt-3 dark:border-white/10">
          {editing ? (
            <button type="button" className="btn !py-1.5" onClick={() => onEdit(session)}>
              EDIT
            </button>
          ) : isToday ? (
            /* Marking straight from the board is the whole point of the board.
               Only offered on today's tab — marking a Friday class while
               looking at Monday would silently write the wrong date. Past days
               are what Roll Call's BACKFILL tab is for. */
            <div className="flex w-full gap-1.5">
              {MARKS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="btn flex-1 !px-1 !py-1.5 !text-[0.6rem]"
                  aria-pressed={mark === m}
                  style={
                    mark === m
                      ? { background: MARK_TONE[m], borderColor: MARK_TONE[m], color: '#fff' }
                      : undefined
                  }
                  onClick={() => onMark(session.id, m)}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <>
              <span className="label muted">LOG IT IN ROLL CALL</span>
              <Link to="/rollcall" className="btn !py-1.5">
                ROLL CALL
              </Link>
            </>
          )}
        </div>
      ) : editing ? (
        <div className="mt-4 border-t-2 border-black/10 pt-3 dark:border-white/10">
          <button type="button" className="btn !py-1.5" onClick={() => onEdit(session)}>
            EDIT
          </button>
        </div>
      ) : null}
    </Panel>
  )
}

/* -------------------------------------------------------------- Week grid -- */

function WeekGrid({ sessions, editing, onEdit, onDrop, onAddDay }) {
  const { from, to } = gridBounds(sessions)
  const hours = []
  for (let h = from; h <= to; h += 60) hours.push(h)
  const span = Math.max(to - from, 60)
  const pxPerMin = 1.1

  return (
    <Panel className="overflow-hidden">
      <div className="label muted border-b-2 border-[var(--border)] px-4 py-2.5">
        WEEK GRID · {sessions.length} BLOCKS ·{' '}
        {editing ? 'DRAG A BLOCK TO ANOTHER DAY' : 'BATCHES GROUPED'}
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[56px_repeat(5,1fr)] border-b-2 border-[var(--border)]">
            <div />
            {DAYS.map((d) => (
              <div
                key={d}
                className="label flex items-center justify-center gap-2 border-l-2 border-[var(--border)] py-2"
              >
                {d}
                {editing ? (
                  <button
                    type="button"
                    onClick={() => onAddDay(d)}
                    className="grid size-5 place-items-center border-2 border-[var(--border)]"
                    style={{ background: 'var(--color-acid)', borderRadius: 2, color: 'var(--color-ink)' }}
                    aria-label={`Add session on ${d}`}
                  >
                    <Plus size={11} strokeWidth={3} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div
            className="relative grid grid-cols-[56px_repeat(5,1fr)] pt-2.5"
            style={{ height: span * pxPerMin + 10 }}
          >
            {/* Hour rail */}
            <div className="relative">
              {hours.map((h) => (
                <div
                  key={h}
                  className="label muted absolute right-2"
                  style={{ top: (h - from) * pxPerMin - 6 }}
                >
                  {((Math.floor(h / 60) % 12) || 12)}
                  {Math.floor(h / 60) < 12 ? 'A' : 'P'}
                </div>
              ))}
            </div>

            {DAYS.map((day) => (
              <div
                key={day}
                className="relative border-l-2 border-[var(--border)]"
                onDragOver={editing ? (e) => e.preventDefault() : undefined}
                onDrop={
                  editing
                    ? (e) => {
                        e.preventDefault()
                        const id = e.dataTransfer.getData('text/plain')
                        const rect = e.currentTarget.getBoundingClientRect()
                        const offset = e.clientY - rect.top
                        const snapped =
                          from + Math.round(offset / pxPerMin / 30) * 30
                        onDrop(id, day, Math.max(from, snapped))
                      }
                    : undefined
                }
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-black/8 dark:border-white/8"
                    style={{ top: (h - from) * pxPerMin }}
                    aria-hidden
                  />
                ))}

                {sessionsForDay(sessions, day).map((s) => {
                  const style = TYPE_STYLE[s.type] ?? TYPE_STYLE.other
                  const isBreak = s.type === 'break'
                  return (
                    <button
                      key={s.id}
                      type="button"
                      draggable={editing}
                      onDragStart={
                        editing
                          ? (e) => e.dataTransfer.setData('text/plain', s.id)
                          : undefined
                      }
                      onClick={editing ? () => onEdit(s) : undefined}
                      className="absolute inset-x-1 overflow-hidden border-2 border-[var(--border)] p-1.5 text-left"
                      style={{
                        top: (s.start - from) * pxPerMin + 2,
                        height: Math.max((s.end - s.start) * pxPerMin - 4, 26),
                        background: isBreak ? 'transparent' : style.bg,
                        borderRadius: 2,
                        color: 'var(--color-ink)',
                        cursor: editing ? 'grab' : 'default',
                        ...(isBreak
                          ? { borderStyle: 'dashed', color: 'inherit' }
                          : null),
                      }}
                    >
                      <span className="label flex items-start gap-1 !text-[0.55rem] leading-tight">
                        {editing ? <GripVertical size={10} className="mt-0.5 shrink-0" /> : null}
                        <span className="line-clamp-2 font-bold">{s.name}</span>
                      </span>
                      {s.room ? (
                        // Not .muted: that grey is tuned for --surface, and
                        // these blocks sit on a bright accent fill, where it
                        // drops to ~2:1. Dimming the inherited ink instead
                        // keeps the secondary weight and stays readable.
                        <span
                          className="label mt-0.5 block !text-[0.5rem]"
                          style={{ opacity: 0.72 }}
                        >
                          {s.room}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ Page -- */

export default function Board() {
  const { profile, year, setBranch, setYear } = useProfile()
  const { sessions, addSession, removeSession, moveSession, resetBoard, isCustomised } =
    useBoard(profile.branch, year)
  const { getMark, setMark } = useRollcall()

  const today = dayCode()
  const [day, setDay] = useState(DAYS.includes(today) ? today : 'MON')
  const [view, setView] = useState('day')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [modal, setModal] = useState({ open: false, session: null, day: null })

  const iso = todayISO()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) =>
      [s.name, s.code, s.room, s.group].filter(Boolean).join(' ').toLowerCase().includes(q),
    )
  }, [sessions, query])

  const dayList = sessionsForDay(filtered, day)
  const teaching = dayList.filter((s) => s.type !== 'break')

  return (
    <Shell>
      <PageHeader
        icon={CalendarDays}
        accent="var(--color-sky)"
        eyebrow="YOUR WEEK"
        title="TIMETABLE"
        sub={`${branchName(profile.branch)} · YEAR ${year}`}
        actions={
          <>
            <div className="w-52">
              <Select
                aria-label="Branch"
                options={BRANCHES.map((b) => ({ value: b.code, label: b.name }))}
                value={profile.branch}
                onChange={(v) => setBranch(v)}
              />
            </div>
            <div className="w-28">
              <Select
                aria-label="Year"
                options={YEARS.map((y) => ({ value: y, label: `Year ${y}` }))}
                value={year}
                onChange={setYear}
              />
            </div>
          </>
        }
      />

      <Panel className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented options={DAYS} value={day} onChange={setDay} />
          <div className="flex gap-1.5">
            <button
              type="button"
              className="btn !px-2.5"
              aria-pressed={view === 'day'}
              style={view === 'day' ? { background: 'var(--text)', color: 'var(--bg)' } : undefined}
              onClick={() => setView('day')}
              aria-label="Day view"
            >
              <List size={15} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              className="btn !px-2.5"
              aria-pressed={view === 'week'}
              style={view === 'week' ? { background: 'var(--text)', color: 'var(--bg)' } : undefined}
              onClick={() => setView('week')}
              aria-label="Week view"
            >
              <LayoutGrid size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search
            size={15}
            strokeWidth={2.5}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50"
            aria-hidden
          />
          <input
            className="field !pl-9"
            placeholder="SEARCH COURSE / ROOM / CODE"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search sessions"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button type="button" className="btn btn-go" onClick={() => setEditing(false)}>
                DONE EDITING
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--color-sky)', color: 'var(--color-ink)' }}
                onClick={() => setModal({ open: true, session: null, day })}
              >
                <Plus size={14} strokeWidth={3} /> ADD SESSION
              </button>
              <button
                type="button"
                className="btn"
                disabled={!isCustomised}
                onClick={() => {
                  if (confirm('Reset this board to the published timetable? Your edits for this branch and year will be lost.')) {
                    resetBoard()
                  }
                }}
              >
                RESET BOARD
              </button>
            </>
          ) : (
            <button type="button" className="btn" onClick={() => setEditing(true)}>
              EDIT BOARD
            </button>
          )}
          {isCustomised ? <span className="chip self-center">EDITED</span> : null}
        </div>
      </Panel>

      {sessions.length === 0 ? (
        <EmptyState
          title="nothing pinned yet"
          hint={`No published timetable for ${branchName(profile.branch)} Year ${year}. Add your sessions in edit mode — they save to this device.`}
          action={
            <button
              type="button"
              className="btn btn-go"
              onClick={() => {
                setEditing(true)
                setModal({ open: true, session: null, day })
              }}
            >
              <Plus size={14} strokeWidth={3} /> ADD FIRST SESSION
            </button>
          }
        />
      ) : view === 'week' ? (
        <WeekGrid
          sessions={filtered}
          editing={editing}
          onEdit={(s) => setModal({ open: true, session: s, day: s.day })}
          onAddDay={(d) => setModal({ open: true, session: null, day: d })}
          onDrop={(id, newDay, newStart) => {
            const s = sessions.find((x) => x.id === id)
            if (!s) return
            moveSession(id, { day: newDay, start: newStart, end: newStart + (s.end - s.start) })
          }}
        />
      ) : (
        <>
          <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="label muted">DAY VIEW · YEAR {year}</p>
              <p className="heading mt-1 text-3xl">{day}</p>
            </div>
            <span className="label muted">
              {teaching.length} SESSION{teaching.length === 1 ? '' : 'S'}
            </span>
          </Panel>

          {dayList.length === 0 ? (
            <EmptyState
              title={query ? 'no matches' : 'clear day'}
              hint={query ? `Nothing matches "${query}" on ${day}.` : `Nothing scheduled on ${day}.`}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dayList.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  editing={editing}
                  mark={getMark(iso, s.id)}
                  isToday={day === today}
                  onMark={(id, m) => setMark(iso, id, m)}
                  onEdit={(sess) => setModal({ open: true, session: sess, day: sess.day })}
                />
              ))}
            </div>
          )}
        </>
      )}

      <SessionModal
        open={modal.open}
        session={modal.session}
        defaultDay={modal.day}
        onClose={() => setModal({ open: false, session: null, day: null })}
        onDelete={removeSession}
        onSave={(data) => {
          if (modal.session) moveSession(modal.session.id, data)
          else addSession(data)
        }}
      />
    </Shell>
  )
}
