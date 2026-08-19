import { useMemo, useState } from 'react'
import { CalendarClock, ClipboardCheck, Settings2 } from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, EmptyState, Field, Meter, PageHeader, Panel, Ring, Segmented } from '../ui'
import { useProfile, useRollcallSettings } from '../lib/storage'
import { coursesOf, nextClassDay, sessionsForDay, useBoard } from '../lib/board'
import {
  STATUS_COLOR,
  canSkip,
  mustAttend,
  status,
  tally,
  unmarkedSince,
  useRollcall,
} from '../lib/rollcall'
import { DAYS, dayCode, fmtDateShort, fmtRange, isoToDate, todayISO } from '../lib/time'

const MARK_BUTTONS = [
  { value: 'present', label: 'PRESENT', tone: 'var(--color-present)' },
  { value: 'absent', label: 'ABSENT', tone: 'var(--color-absent)' },
  { value: 'cancelled', label: 'CANCELLED', tone: 'var(--color-cancelled)' },
]

function MarkRow({ session, mark, onMark }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-black/10 py-3 first:border-t-0 dark:border-white/10">
      <div className="min-w-0">
        <p className="text-sm font-bold">{session.name}</p>
        <p className="label muted mt-0.5">
          {fmtRange(session.start, session.end)}
          {session.room ? ` · ${session.room}` : ''}
          {session.code ? ` · ${session.code}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MARK_BUTTONS.map((b) => (
          <button
            key={b.value}
            type="button"
            className="btn !py-1.5"
            aria-pressed={mark === b.value}
            style={mark === b.value ? { background: b.tone, borderColor: b.tone, color: '#fff' } : undefined}
            onClick={() => onMark(b.value)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function RollCall() {
  const { profile, year } = useProfile()
  const { sessions } = useBoard(profile.branch, year)
  const { marks, setMark, getMark } = useRollcall()
  const [settings, setSettings] = useRollcallSettings()

  const [tab, setTab] = useState('TODAY')
  const [showSettings, setShowSettings] = useState(false)
  const [fixDate, setFixDate] = useState(todayISO())
  const [requiredDraft, setRequiredDraft] = useState(String(settings.required))
  const [openCourse, setOpenCourse] = useState(null)

  const required = settings.required
  const since = settings.trackingSince
  const iso = todayISO()
  const today = dayCode()

  const courses = useMemo(() => coursesOf(sessions), [sessions])

  const overall = useMemo(
    () => tally(marks, sessions.filter((s) => s.type !== 'break').map((s) => s.id), since),
    [marks, sessions, since],
  )

  const overallStatus = status(overall.percent, required)
  const todaySessions = sessionsForDay(sessions, today).filter((s) => s.type !== 'break')
  const pending = useMemo(
    () => unmarkedSince(sessions, marks, since, iso),
    [sessions, marks, since, iso],
  )

  const fixDay = DAYS[(isoToDate(fixDate).getDay() + 6) % 7]
  const fixSessions = DAYS.includes(fixDay)
    ? sessionsForDay(sessions, fixDay).filter((s) => s.type !== 'break')
    : []

  return (
    <Shell>
      <PageHeader
        icon={ClipboardCheck}
        accent="var(--color-acid)"
        eyebrow="ROLL CALL"
        title="ATTENDANCE"
        sub={`TARGET ${required}% · SINCE ${fmtDateShort(since)}`}
      />

      {/* ---- Summary ---- */}
      <Panel className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Ring percent={overall.percent} color={STATUS_COLOR[overallStatus]} />
          <div className="min-w-0 flex-1">
            <p className="display text-2xl sm:text-3xl">
              {overall.percent === null
                ? 'NOTHING LOGGED'
                : overallStatus === 'safe'
                  ? 'YOU ARE CLEAR'
                  : overallStatus === 'edge'
                    ? 'CUTTING IT FINE'
                    : 'BELOW TARGET'}
            </p>
            <p className="label muted mt-2">
              {overall.percent === null
                ? 'MARK A CLASS TO START TRACKING'
                : `${overall.present} PRESENT · ${overall.absent} ABSENT · ${overall.cancelled} CANCELLED`}
            </p>

            {overall.percent !== null ? (
              <p className="mt-3 text-sm font-semibold">
                {overall.percent >= required
                  ? canSkip(overall.present, overall.held, required) === 0
                    ? `You are right on the line — skipping even one more class drops you under ${required}%.`
                    : `You can skip ${canSkip(overall.present, overall.held, required)} more class${canSkip(overall.present, overall.held, required) === 1 ? '' : 'es'} and stay at ${required}%.`
                  : `Attend the next ${mustAttend(overall.present, overall.held, required)} class${mustAttend(overall.present, overall.held, required) === 1 ? '' : 'es'} to get back to ${required}%.`}
              </p>
            ) : null}

            {pending.length > 0 ? (
              <button
                type="button"
                className="btn mt-3 !py-1.5"
                style={{ background: 'var(--color-amber)', color: '#12121A' }}
                onClick={() => setTab('BACKFILL')}
              >
                {pending.length} UNMARKED — BACKFILL
              </button>
            ) : null}
          </div>
        </div>
      </Panel>

      {/* ---- Settings ---- */}
      <Panel>
        <button
          type="button"
          className="label flex w-full items-center justify-between gap-3 px-4 py-3"
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
        >
          <span className="flex items-center gap-2">
            <Settings2 size={14} strokeWidth={2.5} aria-hidden /> SETTINGS
          </span>
          <span>{showSettings ? '−' : '+'}</span>
        </button>

        {showSettings ? (
          <div className="grid gap-4 border-t-2 border-ink p-4 sm:grid-cols-2 dark:border-[#33334a]">
            <Field label="REQUIRED ATTENDANCE (%)" id="rc-req">
              <div className="flex gap-2">
                <input
                  id="rc-req"
                  className="field"
                  type="number"
                  min={1}
                  max={100}
                  value={requiredDraft}
                  onChange={(e) => setRequiredDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-go shrink-0"
                  onClick={() => {
                    const n = Number(requiredDraft)
                    if (Number.isFinite(n) && n > 0 && n <= 100) {
                      setSettings({ ...settings, required: Math.round(n) })
                    }
                  }}
                >
                  SAVE
                </button>
              </div>
            </Field>

            <Field
              label="TRACKING SINCE"
              id="rc-since"
              hint="Classes before this date are ignored, so old slots never show as unmarked."
            >
              <input
                id="rc-since"
                className="field"
                type="date"
                value={since}
                onChange={(e) => setSettings({ ...settings, trackingSince: e.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </Panel>

      <Segmented
        options={['TODAY', 'SUBJECTS', 'BACKFILL']}
        value={tab}
        onChange={setTab}
      />

      {/* ---- TODAY ---- */}
      {tab === 'TODAY' ? (
        todaySessions.length === 0 ? (
          <EmptyState
            title="NO CLASSES TODAY"
            hint={
              nextClassDay(sessions)
                ? `Next class day · ${nextClassDay(sessions)}`
                : 'No sessions on this board yet.'
            }
          />
        ) : (
          <Panel className="p-4">
            <p className="label muted mb-2">{fmtDateShort(iso)}</p>
            {todaySessions.map((s) => (
              <MarkRow
                key={s.id}
                session={s}
                mark={getMark(iso, s.id)}
                onMark={(m) => setMark(iso, s.id, m)}
              />
            ))}
            <p className="label muted mt-3">TAP AN ACTIVE MARK AGAIN TO CLEAR IT.</p>
          </Panel>
        )
      ) : null}

      {/* ---- SUBJECTS ---- */}
      {tab === 'SUBJECTS' ? (
        courses.length === 0 ? (
          <EmptyState title="NO SUBJECTS" hint="Add sessions to your board first." />
        ) : (
          <div className="space-y-3">
            {courses.map((c) => {
              const t = tally(marks, c.sessions.map((s) => s.id), since)
              const st = status(t.percent, required)
              const open = openCourse === c.key
              return (
                <Panel key={c.key} className="p-4">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() => setOpenCourse(open ? null : c.key)}
                    aria-expanded={open}
                  >
                    <div className="min-w-0">
                      <p className="display text-lg">{c.name}</p>
                      <p className="label muted mt-1">
                        {c.code || '—'} · {c.type.toUpperCase()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="display text-xl" style={{ color: STATUS_COLOR[st] }}>
                        {t.percent === null ? '—' : `${Math.round(t.percent)}%`}
                      </p>
                      <p className="label muted mt-0.5">{open ? 'HIDE' : 'DETAILS'}</p>
                    </div>
                  </button>

                  <div className="mt-3">
                    <Meter percent={t.percent} color={STATUS_COLOR[st]} required={required} />
                  </div>

                  <p className="label muted mt-2">
                    {t.percent === null
                      ? 'NOT TRACKED YET'
                      : `${t.present}/${t.held} HELD · ${t.cancelled} CANCELLED`}
                  </p>

                  {open ? (
                    <div className="mt-3 space-y-2 border-t-2 border-black/10 pt-3 dark:border-white/10">
                      <div className="flex flex-wrap gap-2">
                        <Chip tone="var(--color-present)">{t.present} PRESENT</Chip>
                        <Chip tone="var(--color-absent)">{t.absent} ABSENT</Chip>
                        <Chip>{t.cancelled} CANCELLED</Chip>
                      </div>
                      <p className="text-sm font-semibold">
                        {t.percent === null
                          ? 'Nothing logged for this subject yet.'
                          : t.percent >= required
                            ? canSkip(t.present, t.held, required) === 0
                              ? 'On the line — do not skip the next one.'
                              : `Safe to skip ${canSkip(t.present, t.held, required)} more.`
                            : `Attend ${mustAttend(t.present, t.held, required)} in a row to recover.`}
                      </p>
                      <p className="label muted">
                        WEEKLY SLOTS ·{' '}
                        {c.sessions.map((s) => `${s.day} ${fmtRange(s.start, s.end)}`).join(' / ')}
                      </p>
                    </div>
                  ) : null}
                </Panel>
              )
            })}
          </div>
        )
      ) : null}

      {/* ---- BACKFILL ---- */}
      {tab === 'BACKFILL' ? (
        <Panel className="p-4">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} strokeWidth={2.5} aria-hidden />
            <p className="display text-lg">FIX A PAST DAY</p>
          </div>
          <p className="label muted mt-1.5">PICK ANY DATE TO ADD OR CORRECT THAT DAY'S MARKS.</p>

          <div className="mt-4 max-w-xs">
            <label className="sr-only" htmlFor="fix-date">
              Date
            </label>
            <input
              id="fix-date"
              className="field"
              type="date"
              value={fixDate}
              max={iso}
              onChange={(e) => setFixDate(e.target.value)}
            />
          </div>

          <div className="mt-4">
            {fixSessions.length === 0 ? (
              <p className="label muted border-2 border-dashed border-black/20 p-6 text-center dark:border-white/20">
                NO CLASSES SCHEDULED ON THIS DATE
              </p>
            ) : (
              fixSessions.map((s) => (
                <MarkRow
                  key={s.id}
                  session={s}
                  mark={getMark(fixDate, s.id)}
                  onMark={(m) => setMark(fixDate, s.id, m)}
                />
              ))
            )}
          </div>

          {pending.length > 0 ? (
            <div className="mt-5 border-t-2 border-black/10 pt-4 dark:border-white/10">
              <p className="label muted mb-2">
                {pending.length} UNMARKED SINCE {fmtDateShort(since)} — JUMP TO A DATE
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(pending.map((p) => p.iso))].slice(0, 14).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="btn !py-1.5"
                    style={fixDate === d ? { background: 'var(--color-ink)', color: 'var(--color-paper)' } : undefined}
                    onClick={() => setFixDate(d)}
                  >
                    {fmtDateShort(d)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      ) : null}
    </Shell>
  )
}
