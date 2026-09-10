import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  Clock,
  Coffee,
  GripVertical,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Search,
  X,
  Pencil,
  Trash2,
} from 'lucide-react'
import Shell from '../components/Shell'
import SessionModal from '../components/SessionModal'
import { Panel } from '../ui'
import { SORTED_BRANCHES, YEARS, branchName } from '../data/campus'
import { baseTimetable, groupsFor } from '../data/timetables'
import { getNoClassEvent } from '../data/info'
import { useProfile, useRollcallSettings } from '../lib/storage'
import {
  coursesOf,
  filterSessionsByGroup,
  gridBounds,
  insertAutoBreaks,
  isLiveSession,
  nextSession,
  sessionsForDay,
  useBoard,
} from '../lib/board'
import { DAYS, dayCode, fmtRange, minutesNow, todayISO } from '../lib/time'
import { canSkip, mustAttend, status, tally, useRollcall } from '../lib/rollcall'
import { getSubjectTheme } from '../lib/palette'


/* -------------------------------------------------------------- Break Card -- */

function BreakCard({
  session,
  editing,
  isLive,
  isNext,
  currentMins,
  onEdit,
  onDelete,
}) {
  const duration = Math.max(0, session.end - session.start)
  const minsLeft = isLive ? Math.max(0, session.end - currentMins) : 0
  const elapsedMins = isLive ? Math.max(0, currentMins - session.start) : 0
  const progressPercent = isLive && duration > 0 ? Math.min(100, Math.max(0, Math.round((elapsedMins / duration) * 100))) : 0

  const accentBg = session.accent || 'var(--color-violet)'

  const metaParts = [
    session.room ? `Location: ${session.room}` : null,
    session.note ? `Note: ${session.note}` : null,
  ].filter(Boolean)

  return (
    <Panel
      className={`board board-hard pad-card flex flex-col justify-between transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg relative overflow-hidden group/break !border-2 !border-[var(--border)] ${
        isLive
          ? 'ring-2 ring-[var(--color-present)] shadow-[0_0_24px_rgba(143,254,9,0.35)]'
          : ''
      }`}
      style={{
        backgroundColor: accentBg,
        color: 'var(--on-accent)',
      }}
    >
      {/* Decorative Large Background Watermark Icon */}
      <div
        className="pointer-events-none absolute -right-3 -bottom-3 opacity-20 text-[var(--on-accent)] transition-transform duration-300 group-hover/break:scale-110 select-none"
        aria-hidden
      >
        <Coffee size={170} strokeWidth={2} />
      </div>

      <div className="relative z-10">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Unified Time & Break Pill */}
            <span className="px-2.5 py-1 text-[0.6rem] sm:text-xs rounded border-2 border-[var(--border)] font-bold tracking-wider flex items-center gap-1.5 bg-[var(--surface)] text-[var(--text)] shadow-xs uppercase">
              <Clock className="icon-micro" strokeWidth={2.5} />
              <span>{fmtRange(session.start, session.end)}</span>
              <span className="opacity-40">·</span>
              <span>{session.type === 'break' ? 'BREAK' : session.type.toUpperCase()}</span>
            </span>

            {isLive ? (
              <span className="chip !py-0.5 !px-2 text-[0.6rem] sm:text-xs text-[var(--on-accent)] bg-[var(--color-present)] border-2 border-[var(--border)] font-black tracking-widest flex items-center gap-1.5 uppercase">
                <span className="relative flex size-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--on-accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full size-1.5 bg-[var(--on-accent)]" />
                </span>
                <span>LIVE · {minsLeft}M</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Break Title */}
        <h3 className="t-card-title mt-2.5 text-[var(--on-accent)]">
          {session.name || 'BREAK'}
        </h3>

        {/* Typographic Metadata (only shown when there's a room/note to say) */}
        {metaParts.length > 0 ? (
          <p className="t-meta mt-1 text-[var(--on-accent)]/85">
            {metaParts.join(' · ')}
          </p>
        ) : null}
      </div>

      {/* Bottom Footer Section */}
      <div className="relative z-10">
        {editing ? (
          <div className="mt-3 flex items-center justify-end gap-2 border-t-2 border-[var(--on-accent)]/30 pt-2.5">
            <button
              type="button"
              className="btn !py-1 !px-2.5 !text-xs flex items-center gap-1.5 !bg-[var(--surface)] text-[var(--disruption)] !border-2 !border-[var(--border)] cursor-pointer font-bold uppercase tracking-wider"
              onClick={() => onDelete(session.id)}
            >
              <Trash2 className="icon-micro" /> DELETE
            </button>
            <button
              type="button"
              className="btn !py-1 !px-2.5 !text-xs flex items-center gap-1.5 !bg-[var(--surface)] text-[var(--text)] !border-2 !border-[var(--border)] cursor-pointer font-bold uppercase tracking-wider"
              onClick={() => onEdit(session)}
            >
              <Pencil className="icon-micro" /> EDIT
            </button>
          </div>
        ) : isLive ? (
          <div className="mt-3 pt-2.5 border-t-2 border-[var(--on-accent)]/30">
            <div className="t-card-title mb-1.5 text-[var(--on-accent)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="relative flex size-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--on-accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full size-1.5 bg-[var(--on-accent)]" />
                </span>
                RECESS IN PROGRESS
              </span>
              <span className="font-mono">{minsLeft}M REMAINING</span>
            </div>
            <div className="h-2 w-full bg-[var(--surface)]/40 border-2 border-[var(--border)] rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full bg-[var(--on-accent)] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}

/* --------------------------------------------------------------- Day Card -- */

function SessionCard({
  session,
  mark,
  tallyData,
  defaultRequired = 65,
  onEdit,
  onDelete,
  onMark,
  onResetMark,
  editing,
  isLive,
  isNext,
  currentMins,
}) {
  const [hoverSim, setHoverSim] = useState(null) // 'present' | 'absent' | null
  const theme = getSubjectTheme(session)

  // Per-subject target cutoff override (if customized) or institute default
  const effectiveCutoff = session.targetCutoff != null ? session.targetCutoff : defaultRequired

  const presentCount = tallyData?.present ?? 0
  const heldCount = tallyData?.held ?? 0
  const actualPercent = tallyData?.percent != null ? Math.round(tallyData.percent) : null
  const st = status(tallyData?.percent ?? null, effectiveCutoff)

  // Bunk Simulator Ghost Percentage calculation on button hover
  let displayPercent = actualPercent
  let simDelta = 0
  let isSimulating = false
  let simStatus = st

  const credit = session.attendanceCredits != null
    ? Number(session.attendanceCredits)
    : (session.type === 'lab' || (session.name || '').toUpperCase().includes('LAB') ? 2 : 1)

  if (hoverSim === 'present') {
    isSimulating = true
    const nextPresent = mark === 'present' ? presentCount : presentCount + credit
    const nextHeld = mark === 'present' ? heldCount : mark === 'absent' ? heldCount : heldCount + credit
    displayPercent = nextHeld > 0 ? Math.round((nextPresent / nextHeld) * 100) : 100
    simDelta = actualPercent != null ? displayPercent - actualPercent : 0
    simStatus = status(displayPercent, effectiveCutoff)
  } else if (hoverSim === 'absent') {
    isSimulating = true
    const nextPresent = mark === 'present' ? Math.max(0, presentCount - credit) : presentCount
    const nextHeld = mark === 'absent' ? heldCount : mark === 'present' ? heldCount : heldCount + credit
    displayPercent = nextHeld > 0 ? Math.round((nextPresent / nextHeld) * 100) : 0
    simDelta = actualPercent != null ? displayPercent - actualPercent : 0
    simStatus = status(displayPercent, effectiveCutoff)
  }

  const minsLeft = isLive ? Math.max(0, session.end - currentMins) : 0
  const skipsLeft = canSkip(presentCount, heldCount, effectiveCutoff)
  const recoverNeeded = mustAttend(presentCount, heldCount, effectiveCutoff)

  // Clean typographic metadata line
  const metaParts = [
    session.code,
    session.room ? `Room ${session.room}` : null,
    session.group ? `Grp ${session.group}` : null,
  ].filter(Boolean)

  return (
    <Panel
      className={`board board-hard bg-[var(--surface)] pad-card flex flex-col justify-between transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg border-l-4 sm:border-l-[6px] ${
        isLive
          ? '!border-[var(--color-present)] shadow-[0_0_18px_rgba(143,254,9,0.35)] ring-1 ring-[var(--color-present)]/60'
          : isNext
            ? '!border-[var(--color-amber)]/70 ring-1 ring-[var(--color-amber)]/30'
            : ''
      }`}
      style={{
        borderLeftColor: isLive ? 'var(--color-present)' : isNext ? 'var(--color-amber)' : theme.accent,
        backgroundColor: isNext ? 'color-mix(in srgb, var(--color-amber) 10%, var(--surface))' : undefined,
        minHeight: 200,
      }}
    >
      <div>
        {/* Unified Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Time & Type in a single sleek unified badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="px-2.5 py-1 text-[0.6rem] sm:text-xs font-bold rounded border-2 uppercase tracking-wider flex items-center gap-1.5 shadow-2xs"
              style={{
                background: theme.bgPill,
                color: theme.ink,
                borderColor: 'var(--border)',
              }}
            >
              <Clock className="icon-micro" strokeWidth={2.5} />
              <span>{fmtRange(session.start, session.end)}</span>
              <span className="opacity-40">·</span>
              <span>{theme.label}</span>
            </span>

            {credit >= 2 ? (
              <span className="px-2 py-1 text-[0.6rem] sm:text-xs rounded font-mono font-black tracking-wider border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--color-present)] shadow-2xs uppercase">
                {credit}× CREDITS
              </span>
            ) : null}

            {isLive ? (
              <span className="chip !py-0.5 !px-2 text-[0.6rem] sm:text-xs text-[var(--color-present)] flex items-center gap-1.5 border-2 border-[var(--color-present)] bg-[var(--color-present)]/10 font-black tracking-widest uppercase">
                <span className="relative flex size-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-present)] opacity-75" />
                  <span className="relative inline-flex rounded-full size-1.5 bg-[var(--color-present)]" />
                </span>
                <span>LIVE · {minsLeft}M</span>
              </span>
            ) : null}
          </div>

          {/* Sleek Attendance Gauge Pill / Badge */}
          <div className="relative group/circle shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 text-xs sm:text-sm font-extrabold tracking-tight transition-all shadow-xs ${
                isSimulating ? 'scale-105 ring-2 ring-[var(--border)] animate-pulse' : ''
              }`}
              style={{
                borderColor: 'var(--border-strong)',
                background:
                  displayPercent === null
                    ? 'var(--surface-2)'
                    : effectiveCutoff === 0
                      ? 'var(--color-teal)'
                      : simStatus === 'safe'
                        ? 'var(--color-present)'
                        : simStatus === 'edge'
                          ? 'var(--color-amber)'
                          : 'var(--color-absent)',
                color:
                  displayPercent === null
                    ? 'var(--muted)'
                    : 'var(--on-accent)',
              }}
              title={
                effectiveCutoff === 0
                  ? `Exempt / Optional Attendance (${actualPercent ?? 0}%)`
                  : isSimulating
                    ? `Simulated Preview: ${displayPercent}% (${simDelta >= 0 ? `+${simDelta}%` : `${simDelta}%`}) [Target: ${effectiveCutoff}%]`
                    : actualPercent === null
                      ? `Target Cutoff: ${effectiveCutoff}%`
                      : `${presentCount}/${heldCount} attended (${actualPercent}%) · Target: ${effectiveCutoff}%`
              }
            >
              <span>{displayPercent === null ? '—' : `${displayPercent}%`}</span>
              {isSimulating && simDelta !== 0 ? (
                <span className="text-[0.6rem] opacity-85">
                  ({simDelta > 0 ? `+${simDelta}%` : `${simDelta}%`})
                </span>
              ) : null}
            </span>
          </div>
        </div>

        {/* Course Title */}
        <h3 className="t-card-title mt-2.5 text-[var(--text)]" style={{ fontSize: 20 }}>
          {session.name}
        </h3>

        {/* Clean Typographic Metadata */}
        {metaParts.length > 0 ? (
          <p className="t-meta muted mt-1">
            {metaParts.join(' · ')}
          </p>
        ) : null}

        {/* Professor / Instructor Name */}
        {session.instructor ? (
          <p className="t-meta muted mt-0.5">
            {session.instructor}
          </p>
        ) : null}

        {/* Custom Note Reminder */}
        {session.note ? (
          <p className="t-meta mt-1.5 text-[var(--color-sky)]">
            📌 {session.note}
          </p>
        ) : null}

        {/* Clean 1-Line Status Context Line */}
        <div className="t-meta mt-2">
          {mark === 'present' ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--present-ink)] font-bold">
              <span className="size-1.5 rounded-full bg-[var(--color-present)]" />
              ATTENDED · {effectiveCutoff === 0 ? 'COURSE EXEMPT' : `${skipsLeft} SAFE SKIP${skipsLeft === 1 ? '' : 'S'} LEFT`}
            </span>
          ) : mark === 'absent' ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--absent-ink)] font-bold">
              <span className="size-1.5 rounded-full bg-[var(--color-absent)]" />
              BUNKED ·{' '}
              {effectiveCutoff === 0
                ? 'COURSE EXEMPT'
                : actualPercent != null && actualPercent < effectiveCutoff
                  ? `ATTEND ${recoverNeeded} IN A ROW`
                  : `${skipsLeft} SAFE SKIP${skipsLeft === 1 ? '' : 'S'} LEFT`}
            </span>
          ) : mark === 'cancelled' ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--warn-ink)] font-bold">
              <span className="size-1.5 rounded-full bg-[var(--color-amber)]" />
              CLASS CANCELLED · FREE SLOT
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[var(--muted)] font-semibold">
              <span className="size-1.5 rounded-full bg-[var(--border)]" />
              {effectiveCutoff === 0
                ? 'OPTIONAL COURSE (EXEMPT)'
                : actualPercent === null
                  ? `TARGET CUTOFF: ${effectiveCutoff}%`
                  : actualPercent >= effectiveCutoff
                    ? `${skipsLeft === 0 ? 'ON THE CUTOFF' : `${skipsLeft} SAFE SKIP${skipsLeft === 1 ? '' : 'S'} AVAILABLE`}`
                    : `ATTEND ${recoverNeeded} IN A ROW TO REACH ${effectiveCutoff}%`}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Segmented Action Strip */}
      {editing ? (
        <div className="mt-3 flex items-center justify-end gap-2 border-t-2 border-[var(--border)] pt-2.5">
          <button
            type="button"
            className="btn !py-1 !px-2.5 !text-xs flex items-center gap-1.5 text-[var(--disruption)] cursor-pointer font-bold tracking-wider uppercase"
            onClick={() => onDelete(session.id)}
          >
            <Trash2 className="icon-micro" /> DELETE
          </button>
          <button
            type="button"
            className="btn !py-1 !px-2.5 !text-xs flex items-center gap-1.5 cursor-pointer font-bold tracking-wider uppercase"
            onClick={() => onEdit(session)}
          >
            <Pencil className="icon-micro" /> EDIT
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center rounded border-2 border-[var(--border-strong)] bg-[var(--surface-2)] p-0.5 shadow-xs overflow-hidden">
          <button
            type="button"
            className={`flex-1 py-1.5 text-[0.6875rem] sm:text-xs font-bold tracking-wider uppercase rounded flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              mark === 'present'
                ? '!bg-[var(--color-present)] !text-[var(--on-accent)] shadow-xs font-extrabold border border-transparent'
                : 'text-[var(--present-ink)] bg-[var(--color-present)]/10 border border-[var(--color-present)]/30 hover:bg-[var(--color-present)]/20 hover:border-[var(--color-present)]/50'
            }`}
            onMouseEnter={() => setHoverSim('present')}
            onMouseLeave={() => setHoverSim(null)}
            onClick={(e) => {
              e.stopPropagation()
              setHoverSim(null)
              onMark(session.id, mark === 'present' ? null : 'present')
            }}
            title="Mark Present"
          >
            <Check className="icon-micro shrink-0" strokeWidth={2.5} /> <span className="truncate">PRESENT</span>
          </button>

          <div className="w-[1.5px] h-4 bg-[var(--border)] shrink-0 mx-0.5" />

          <button
            type="button"
            className={`flex-1 py-1.5 text-[0.6875rem] sm:text-xs font-bold tracking-wider uppercase rounded flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              mark === 'absent'
                ? '!bg-[var(--color-absent)] !text-[var(--on-accent)] shadow-xs font-extrabold border border-transparent'
                : 'text-[var(--absent-ink)] bg-[var(--color-absent)]/10 border border-[var(--color-absent)]/30 hover:bg-[var(--color-absent)]/20 hover:border-[var(--color-absent)]/50'
            }`}
            onMouseEnter={() => setHoverSim('absent')}
            onMouseLeave={() => setHoverSim(null)}
            onClick={(e) => {
              e.stopPropagation()
              setHoverSim(null)
              onMark(session.id, mark === 'absent' ? null : 'absent')
            }}
            title="Mark Absent / Bunk"
          >
            <X className="icon-micro shrink-0" strokeWidth={2.5} /> <span className="truncate">ABSENT</span>
          </button>

          <div className="w-[1.5px] h-4 bg-[var(--border)] shrink-0 mx-0.5" />

          <button
            type="button"
            className={`py-1.5 px-2 text-[0.6875rem] sm:text-xs font-bold tracking-wider uppercase rounded flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              mark === 'cancelled'
                ? '!bg-[var(--color-cancelled)] !text-[var(--on-accent)] shadow-xs font-extrabold border border-transparent'
                : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-transparent'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              setHoverSim(null)
              onMark(session.id, mark === 'cancelled' ? null : 'cancelled')
            }}
            title="Mark Class Cancelled"
          >
            <span className="truncate">CANCELLED</span>
          </button>

          <div className="w-[1.5px] h-4 bg-[var(--border)] shrink-0 mx-0.5" />

          <button
            type="button"
            disabled={!mark}
            className={`p-1.5 rounded flex items-center justify-center transition-all ${
              mark
                ? 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] cursor-pointer active:scale-95'
                : 'text-[var(--muted)]/40 opacity-40 cursor-not-allowed'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              setHoverSim(null)
              if (mark) onResetMark(session.id)
            }}
            title={mark ? 'Reset attendance mark' : 'No mark recorded yet'}
            aria-label="Reset attendance mark"
          >
            <RotateCcw className="icon-micro shrink-0" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </Panel>
  )
}

/* -------------------------------------------------------------- Week Grid -- */

function WeekGrid({ sessions, editing, onEdit, onDrop, onAddDay }) {
  const { from, to } = gridBounds(sessions)
  const hours = []
  for (let h = from; h <= to; h += 60) hours.push(h)
  const span = Math.max(to - from, 60)
  const pxPerMin = 1.1

  return (
    <Panel className="board board-hard bg-[var(--surface)] overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="t-meta muted border-b-2 border-[var(--border)] px-4 py-2.5 flex items-center justify-between shrink-0">
        <span>
          WEEK GRID · {sessions.length} BLOCKS ·{' '}
          {editing ? 'DRAG A BLOCK TO ANOTHER DAY' : 'BATCH SCHEDULE VIEW'}
        </span>
      </div>

      <div className="overflow-auto no-scrollbar flex-1">
        <div className="min-w-[720px] p-2">
          <div
            className="grid border-b-2 border-[var(--border)]"
            style={{ gridTemplateColumns: `56px repeat(${DAYS.length}, 1fr)` }}
          >
            <div />
            {DAYS.map((d) => (
              <div
                key={d}
                className="t-meta flex items-center justify-center gap-2 border-l-2 border-[var(--border)] py-2"
              >
                {d}
                {editing ? (
                  <button
                    type="button"
                    onClick={() => onAddDay(d)}
                    className="grid size-5 place-items-center border-2 border-[var(--border)] cursor-pointer"
                    style={{ background: 'var(--color-acid)', borderRadius: 2, color: 'var(--on-accent)' }}
                    aria-label={`Add session on ${d}`}
                  >
                    <Plus className="icon-micro" strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div
            className="relative grid pt-2.5"
            style={{
              gridTemplateColumns: `56px repeat(${DAYS.length}, 1fr)`,
              height: span * pxPerMin + 10,
            }}
          >
            {/* Hour Rail */}
            <div className="relative">
              {hours.map((h) => (
                <div
                  key={h}
                  className="t-meta muted absolute right-2"
                  style={{ top: Math.max(2, (h - from) * pxPerMin - 6) }}
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
                        const snapped = from + Math.round(offset / pxPerMin / 30) * 30
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

                {(editing ? sessionsForDay(sessions, day) : insertAutoBreaks(sessionsForDay(sessions, day))).map((s) => {
                  const theme = getSubjectTheme(s)
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
                      className="absolute inset-x-1 overflow-hidden border-2 border-[var(--border)] p-1.5 text-left transition-all"
                      style={{
                        top: (s.start - from) * pxPerMin + 2,
                        height: Math.max((s.end - s.start) * pxPerMin - 4, 26),
                        background: isBreak ? (s.accent || 'var(--color-violet)') : theme.bgPill,
                        borderRadius: 2,
                        color: isBreak ? 'var(--on-accent)' : theme.ink,
                        borderColor: isBreak ? 'var(--border)' : undefined,
                        cursor: editing ? 'grab' : 'default',
                        fontWeight: isBreak ? 700 : undefined,
                      }}
                    >
                      <span className="t-meta flex items-start gap-1.5 leading-tight">
                        {editing ? (
                          <GripVertical className="icon-micro mt-0.5 shrink-0" />
                        ) : isBreak ? (
                          <Coffee className="icon-micro mt-0.5 shrink-0 text-[var(--on-accent)]" strokeWidth={2.5} />
                        ) : null}
                        <span className="line-clamp-2 font-black">{s.name}</span>
                      </span>
                      {s.room ? (
                        <span
                          className="t-micro mt-0.5 block opacity-85"
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

/* ------------------------------------------------------------- Main Page -- */

export default function Board() {
  const { profile, year, group, setBranch, setYear, setGroup } = useProfile()
  const { sessions, addSession, removeSession, moveSession, resetBoard, clearBoard, isCustomised } =
    useBoard(profile.branch, year)
  const { marks, getMark, setMark } = useRollcall()

  const today = dayCode()
  const [day, setDay] = useState(DAYS.includes(today) ? today : 'MON')
  const [view, setView] = useState('day')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [hideBreaks, setHideBreaks] = useState(false)
  const [modal, setModal] = useState({ open: false, session: null, day: null })
  const [resetModalOpen, setResetModalOpen] = useState(false)

  useEffect(() => {
    if (!resetModalOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setResetModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resetModalOpen])

  const [settings] = useRollcallSettings()
  const required = settings?.required ?? 65
  const since = settings?.trackingSince

  // Computes the ISO calendar date for any weekday in the active week
  const getIsoForWeekday = useCallback((targetDay) => {
    const now = new Date()
    const currentDay = dayCode(now)
    if (targetDay === currentDay) return todayISO(now)

    const currentDayIndex = (now.getDay() + 6) % 7
    const targetDayIndex = DAYS.indexOf(targetDay)
    if (targetDayIndex === -1) return todayISO(now)

    const targetDate = new Date(now)
    let diff = targetDayIndex - currentDayIndex
    // On weekends (Sat=5, Sun=6), viewing Mon-Fri refers to upcoming week
    if (currentDayIndex >= 5 && targetDayIndex < 5) {
      diff = (7 - currentDayIndex) + targetDayIndex
    }
    targetDate.setDate(now.getDate() + diff)
    return todayISO(targetDate)
  }, [])

  // Computes the ISO calendar date for the selected weekday in the current week
  const activeIso = useMemo(() => getIsoForWeekday(day), [day, getIsoForWeekday])

  const noClassEvent = useMemo(() => getNoClassEvent(activeIso), [activeIso])

  const currentMins = minutesNow()

  // Compute live rollcall tally for each subject/course
  const subjectStats = useMemo(() => {
    const map = {}
    const courses = coursesOf(sessions)
    for (const c of courses) {
      const res = tally(marks, c.sessions, since)
      map[c.key] = res
      if (c.code) map[c.code] = res
      if (c.name) map[c.name] = res
    }
    return map
  }, [sessions, marks, since])

  // Available groups for this branch & year
  const availableGroups = useMemo(() => {
    const raw = groupsFor(profile.branch, year)
    return raw.length > 0 ? raw : ['G1', 'G2']
  }, [profile.branch, year])

  // Filter by group first
  const groupFiltered = useMemo(() => {
    return filterSessionsByGroup(sessions, group)
  }, [sessions, group])

  // Filter by search query & hideBreaks
  const filtered = useMemo(() => {
    let list = groupFiltered
    if (hideBreaks) {
      list = list.filter((s) => s.type !== 'break')
    }
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((s) =>
      [s.name, s.code, s.room, s.group, s.instructor, s.note]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [groupFiltered, hideBreaks, query])

  const dayList = useMemo(() => {
    const list = sessionsForDay(filtered, day)
    if (!hideBreaks && !query.trim()) {
      return insertAutoBreaks(list)
    }
    return list
  }, [filtered, day, hideBreaks, query])

  // Next upcoming session today (suppressed on no-class days such as mid-sems or holidays)
  const nextSess = useMemo(() => {
    if (day !== today || noClassEvent) return null
    return nextSession(dayList, today, currentMins)
  }, [day, today, noClassEvent, dayList, currentMins])

  return (
    <Shell>
      <div className="space-y-4">
        {/* TOP COMMAND HEADER */}
        <Panel className="board board-hard bg-[var(--surface)] pad-page">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5">
            <div className="flex items-center gap-3">
              <span
                className="icon-tile"
                style={{ background: 'var(--color-violet)' }}
                aria-hidden
              >
                <Clock className="icon-lg" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <h1 className="t-masthead">
                  TIMETABLE
                </h1>
              </div>
            </div>

            {/* Dropdown Selectors: BRANCH, YEAR, GROUP */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Branch Selector */}
              <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border-strong)] rounded px-2.5 py-1.5 shadow-hard-sm transition-colors">
                <span className="t-meta muted mr-1.5">BRANCH</span>
                <select
                  aria-label="Branch"
                  className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
                  value={profile.branch}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  {SORTED_BRANCHES.map((b) => (
                    <option key={b.code} value={b.code} className="bg-[var(--surface)] text-[var(--text)]">
                      {b.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border-strong)] rounded px-2.5 py-1.5 shadow-hard-sm transition-colors">
                <span className="t-meta muted mr-1.5">YEAR</span>
                <select
                  aria-label="Year"
                  className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-[var(--surface)] text-[var(--text)]">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Selector */}
              <div className="flex items-center bg-[var(--surface-2)] border-2 border-[var(--border-strong)] rounded px-2.5 py-1.5 shadow-hard-sm transition-colors">
                <span className="t-meta muted mr-1.5">GROUP</span>
                <select
                  aria-label="Group"
                  className="bg-transparent text-xs sm:text-sm font-bold uppercase outline-none cursor-pointer text-[var(--text)]"
                  value={group || 'ALL'}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  <option value="ALL" className="bg-[var(--surface)] text-[var(--text)]">
                    ALL
                  </option>
                  {availableGroups.map((g) => (
                    <option key={g} value={g} className="bg-[var(--surface)] text-[var(--text)]">
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Controls Sub-Bar: Day Switcher & View Switcher */}
          <div className="pt-3.5 border-t-2 border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {DAYS.map((d) => {
                const isActive = day === d
                const isTodayDot = d === today
                const dNoClass = getNoClassEvent(getIsoForWeekday(d))
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    title={dNoClass ? `${d}: ${dNoClass.label} (No classes scheduled)` : d}
                    className={`btn !px-3 !py-1.5 text-xs sm:text-sm font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
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
                    ) : dNoClass ? (
                      <span
                        className="size-1.5 rounded-full shrink-0"
                        title={dNoClass.label}
                        style={{
                          background: dNoClass.isExam
                            ? 'var(--color-coral)'
                            : dNoClass.isBreak
                              ? 'var(--color-acid)'
                              : 'var(--color-amber)',
                        }}
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>

            {/* View Switcher: List vs Week Grid (DESKTOP ONLY) */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                className={`btn !px-2.5 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                  view === 'day'
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                }`}
                onClick={() => setView('day')}
                aria-label="Day view"
                title="Day List View"
              >
                <List className="icon-sm" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                className={`btn !px-2.5 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                  view === 'week'
                    ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                }`}
                onClick={() => setView('week')}
                aria-label="Week view"
                title="Week Matrix Grid"
              >
                <LayoutGrid className="icon-sm" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </Panel>

        {/* SEARCH & ACTION CONTROLS BAR */}
        <Panel className="board board-hard bg-[var(--surface)] pad-card shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                className="icon-sm pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50"
                strokeWidth={2}
                aria-hidden
              />
              <input
                className="field !pl-9 uppercase !py-2 text-xs sm:text-sm font-bold"
                placeholder="SEARCH COURSE / ROOM / CODE / PROF..."
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                aria-label="Search sessions"
              />
            </div>

            {/* Edit & Preference Action Buttons + Mobile View Switcher */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Hide Breaks Toggle */}
                <button
                  type="button"
                  className={`btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                    hideBreaks
                      ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                  }`}
                  onClick={() => setHideBreaks(!hideBreaks)}
                  title={hideBreaks ? 'Showing teaching classes only' : 'Showing all sessions'}
                >
                  <Coffee className="icon-micro" />
                  <span>{hideBreaks ? 'NO BREAKS' : 'ALL'}</span>
                </button>

                {editing ? (
                  <>
                    {/* Sequence: tick, +, reset */}
                    {/* 1. Tick for done */}
                    <button
                      type="button"
                      className="btn btn-go !py-1.5 sm:!py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                      onClick={() => setEditing(false)}
                      aria-label="Done editing"
                      title="Done editing"
                    >
                      <Check className="icon-sm" strokeWidth={2.5} />
                      <span className="hidden sm:inline">DONE</span>
                    </button>

                    {/* 2. + for add */}
                    <button
                      type="button"
                      className="btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                      style={{ background: 'var(--color-sky)', color: 'var(--on-accent)' }}
                      onClick={() => setModal({ open: true, session: null, day })}
                      aria-label="Add session"
                      title="Add session"
                    >
                      <Plus className="icon-sm" strokeWidth={2.5} />
                      <span className="hidden sm:inline">ADD</span>
                    </button>

                    {/* 3. Reset icon */}
                    <button
                      type="button"
                      className="btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)]"
                      onClick={() => setResetModalOpen(true)}
                      aria-label="Reset timetable"
                      title="Reset timetable"
                    >
                      <RotateCcw className="icon-sm" strokeWidth={2.5} />
                      <span className="hidden sm:inline">RESET</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn !py-1.5 sm:!py-2 !px-2.5 sm:!px-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm"
                    onClick={() => setEditing(true)}
                  >
                    EDIT TIMETABLE
                  </button>
                )}
              </div>

              {/* View Switcher: List vs Week Grid (MOBILE ONLY - in space on right side of ALL, EDIT TIMETABLE buttons) */}
              <div className="flex sm:hidden items-center gap-1.5">
                <button
                  type="button"
                  className={`btn !px-2.5 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                    view === 'day'
                      ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                  }`}
                  onClick={() => setView('day')}
                  aria-label="Day view"
                  title="Day List View"
                >
                  <List className="icon-sm" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className={`btn !px-2.5 !py-1.5 cursor-pointer transition-all border-2 border-[var(--border)] ${
                    view === 'week'
                      ? '!bg-[var(--text)] !text-[var(--bg)] !border-[var(--text)] shadow-hard-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm'
                  }`}
                  onClick={() => setView('week')}
                  aria-label="Week view"
                  title="Week Matrix Grid"
                >
                  <LayoutGrid className="icon-sm" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </Panel>

        {/* MAIN VIEW CONTAINER */}
        {sessions.length === 0 ? (
          <div className="board board-hard bg-[var(--surface)] pad-page flex flex-col items-center justify-center text-center rounded flex-1 min-h-0">
            <CalendarDays size={36} className="text-[var(--muted)] mb-3" />
            <h3 className="t-section">NOTHING PINNED YET</h3>
            <p className="t-meta muted max-w-md mt-2">
              {baseTimetable(profile.branch, year).length > 0
                ? `Timetable cleared for ${branchName(profile.branch)} Year ${year}. Add your sessions in edit mode, or restore the published timetable.`
                : `No published timetable for ${branchName(profile.branch)} Year ${year}. Add your sessions in edit mode — they save directly to this device.`}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <button
                type="button"
                className="btn btn-go !py-2 !px-4 text-xs font-bold uppercase cursor-pointer"
                onClick={() => {
                  setEditing(true)
                  setModal({ open: true, session: null, day })
                }}
              >
                <Plus className="icon-micro" strokeWidth={2.5} /> ADD FIRST SESSION
              </button>
              {baseTimetable(profile.branch, year).length > 0 && (
                <button
                  type="button"
                  className="btn bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] !py-2 !px-4 text-xs font-bold uppercase cursor-pointer hover:shadow-hard-sm"
                  onClick={() => resetBoard()}
                >
                  <RotateCcw className="icon-micro" strokeWidth={2.5} /> RESTORE PUBLISHED TIMETABLE
                </button>
              )}
            </div>
          </div>
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
          <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar pr-1 pb-2">
            {noClassEvent && (
              <div
                className="board board-hard mb-3 p-2.5 sm:p-3 rounded bg-[var(--surface-2)] border-2 flex flex-wrap items-center justify-between gap-2 shadow-xs"
                style={{
                  borderColor: noClassEvent.isExam
                    ? 'var(--color-coral)'
                    : noClassEvent.isBreak
                      ? 'var(--color-acid)'
                      : 'var(--color-amber)',
                }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="chip !py-0.5 !px-2 text-xs font-black uppercase"
                    style={{
                      background: noClassEvent.isExam
                        ? 'var(--color-coral)'
                        : noClassEvent.isBreak
                          ? 'var(--color-acid)'
                          : 'var(--color-amber)',
                      color: '#111111',
                    }}
                  >
                    {noClassEvent.category} · NO CLASSES SCHEDULED
                  </span>
                  <span className="text-xs sm:text-sm font-black">{noClassEvent.label}</span>
                </div>
                <span className="t-micro muted font-bold uppercase">
                  Showing regular schedule below for reference
                </span>
              </div>
            )}

            {dayList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center rounded bg-[var(--surface-2)] border-2 border-[var(--border)] space-y-2">
                <CalendarDays className="icon-lg text-[var(--muted)]" />
                <h4 className="t-card-title">
                  {query ? 'NO MATCHES FOUND' : 'CLEAR DAY'}
                </h4>
                <p className="t-meta muted max-w-sm">
                  {query
                    ? `No classes matching "${query}" on ${day}.`
                    : `Nothing scheduled on ${day}. Enjoy your time off!`}
                </p>
                <button
                  type="button"
                  className="btn btn-go !py-1.5 !px-3 text-xs cursor-pointer mt-2"
                  onClick={() => setModal({ open: true, session: null, day })}
                >
                  <Plus className="icon-micro" strokeWidth={2.5} /> ADD SESSION
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {dayList.map((s) => {
                  const isLive = isLiveSession(s, today, currentMins)
                  const isNext = today === day && nextSess?.id === s.id && !isLive
                  const courseKey = s.key || s.code || s.name
                  const tallyData = subjectStats[courseKey] || subjectStats[s.code] || subjectStats[s.name]

                  if (s.type === 'break') {
                    return (
                      <BreakCard
                        key={s.id}
                        session={s}
                        editing={editing}
                        isLive={isLive}
                        isNext={isNext}
                        currentMins={currentMins}
                        onDelete={removeSession}
                        onEdit={(sess) => setModal({ open: true, session: sess, day: sess.day })}
                      />
                    )
                  }

                  return (
                    <SessionCard
                      key={s.id}
                      session={s}
                      editing={editing}
                      isLive={isLive}
                      isNext={isNext}
                      currentMins={currentMins}
                      tallyData={tallyData}
                      defaultRequired={required}
                      mark={getMark(activeIso, s.id)}
                      onMark={(id, m) => setMark(activeIso, id, m)}
                      onResetMark={(id) => setMark(activeIso, id, null)}
                      onDelete={removeSession}
                      onEdit={(sess) => setModal({ open: true, session: sess, day: sess.day })}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SESSION ADD / EDIT MODAL */}
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

        {/* RESET TIMETABLE CONFIRMATION MODAL */}
        {resetModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={() => setResetModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            <div
              className="board board-hard bg-[var(--surface)] p-5 sm:p-6 max-w-md w-full rounded shadow-hard-lg space-y-4 animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b-2 border-[var(--border)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="size-9 rounded border-2 border-[var(--border)] flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-absent)', color: 'var(--on-accent)' }}
                  >
                    <RotateCcw className="icon-sm" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 id="reset-modal-title" className="t-section font-black leading-tight uppercase">
                      RESET TIMETABLE
                    </h2>
                    <p className="t-micro muted uppercase font-bold mt-0.5">
                      CONFIRM TIMETABLE ACTION
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="p-1 rounded border-2 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:shadow-hard-sm cursor-pointer"
                  aria-label="Close"
                >
                  <X className="icon-sm" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed">
                  Are you sure you want to reset this timetable? This will remove the classes from your schedule.
                </p>

                <div className="p-3 rounded bg-[var(--color-present)]/10 border-2 border-[var(--color-present)]/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[var(--present-ink)]">
                    <Check className="icon-micro" strokeWidth={2.5} />
                    <span>ATTENDANCE IS PRESERVED</span>
                  </div>
                  <p className="t-meta muted leading-normal">
                    Your attendance records are safely preserved. If you get the timetable back or restore default classes, all past attendance will still be there.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="btn !py-2 !px-4 text-xs font-bold uppercase cursor-pointer bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] hover:shadow-hard-sm"
                >
                  CANCEL
                </button>
                {isCustomised && baseTimetable(profile.branch, year).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      resetBoard()
                      setResetModalOpen(false)
                    }}
                    className="btn !py-2 !px-3 text-xs font-bold uppercase cursor-pointer bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] hover:shadow-hard-sm"
                  >
                    RESTORE DEFAULT
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    clearBoard()
                    setResetModalOpen(false)
                  }}
                  className="btn !py-2 !px-4 text-xs font-bold uppercase cursor-pointer shadow-hard-sm"
                  style={{ background: 'var(--color-absent)', color: 'var(--on-accent)' }}
                >
                  REMOVE TIMETABLE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

