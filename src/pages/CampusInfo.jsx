import { useState } from 'react'
import { CalendarDays, ExternalLink, Info, Phone } from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, PageHeader, Panel, Segmented, StatTile } from '../ui'
import {
  CALENDAR,
  CALENDAR_CATEGORIES,
  CALENDAR_NEXT,
  HELPLINE,
  INSTITUTE,
  QUICK_LINKS,
  byDate,
  eventState,
  gapFor,
  relativeLabel,
} from '../data/info'

/** One accent per calendar category, so the tiles read as groups at a glance. */
const CATEGORY_ACCENT = {
  REGISTRATION: 'var(--color-violet)',
  CLASSES: 'var(--color-acid)',
  EXAMS: 'var(--color-sky)',
  GRADES: 'var(--color-teal)',
  BREAKS: 'var(--color-amber)',
  HOLIDAYS: 'var(--color-coral)',
}

export default function CampusInfo() {
  const [cat, setCat] = useState('ALL')
  const events = byDate(
    cat === 'ALL' ? CALENDAR.events : CALENDAR.events.filter((e) => e.category === cat),
  )
  const nextLabel = CALENDAR_NEXT?.label ?? null

  return (
    <Shell>
      <PageHeader
        icon={Info}
        accent="var(--color-teal)"
        iconInk="var(--on-accent)"
        title="NITKKR INFO"
        sub={`CAMPUS INFORMATION · ${INSTITUTE.address}`}
        actions={
          <a
            href={INSTITUTE.website}
            target="_blank"
            rel="noopener noreferrer"
            className="btn flex items-center gap-1.5"
          >
            <span>OFFICIAL SITE</span> <ExternalLink className="icon-micro shrink-0" strokeWidth={2.5} />
          </a>
        }
      />

      <Panel className="pad-page">
        <p className="t-meta muted">ABOUT</p>
        <p className="t-section mt-1">{INSTITUTE.name}</p>
        <p className="t-body mt-2">{INSTITUTE.blurb}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatTile label="ESTABLISHED" value={INSTITUTE.established} accent="var(--color-sky)" />
          <StatTile label="CAMPUS" value={INSTITUTE.campus} accent="var(--color-acid)" />
          <StatTile label="LOCATION" value={INSTITUTE.location} accent="var(--color-coral)" />
        </div>
      </Panel>

      <Panel className="pad-page">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="icon-tile shrink-0"
              style={{
                background: 'var(--color-sky)',
                color: 'var(--on-accent)',
              }}
              aria-hidden
            >
              <CalendarDays className="icon-lg" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="t-meta muted">ACADEMIC CALENDAR</p>
              <p className="t-section mt-1">{CALENDAR.title}</p>
              <p className="t-meta muted mt-1.5 normal-case">{CALENDAR.audience}</p>
            </div>
          </div>
          <Chip tone={CALENDAR.verified ? 'var(--color-acid)' : 'var(--color-amber)'}>
            {CALENDAR.verified ? 'OFFICIAL' : 'PLACEHOLDER'}
          </Chip>
        </div>

        {/* The countdown only. The spine below carries the elapsed-time and
            progress information the old horizontal rail used to duplicate. */}
        {CALENDAR_NEXT ? (
          <div className="board mt-4 pad-card">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="t-meta muted">NEXT UP</p>
                <p className="t-section mt-1">{CALENDAR_NEXT.label}</p>
                <p className="mt-1.5 t-body font-bold tabular-nums">{CALENDAR_NEXT.value}</p>
              </div>
              {relativeLabel(CALENDAR_NEXT) ? (
                <p className="t-stat tabular-nums shrink-0">
                  {relativeLabel(CALENDAR_NEXT)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <Segmented options={CALENDAR_CATEGORIES} value={cat} onChange={setCat} size="sm" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-black/10 pt-3 dark:border-white/10">
          <p className="t-meta">{cat}</p>
          <p className="t-meta muted">
            {events.length} {events.length === 1 ? 'ITEM' : 'ITEMS'}
          </p>
        </div>

        {/* A vertical spine, not a grid: one column, chronological, with the
            countdown in a fixed gutter and a TODAY rule between rows. Every
            row is the same size — emphasis comes from state, not from area. */}
        {/* One graphic, not two: the spine's gaps scale with real elapsed
            time (clamped so lumpy calendars stay legible) and the line is
            filled above TODAY and hollow below — the old horizontal rail's
            proportional axis and progress fill, rotated vertical. */}
        <ol className="mt-3">
          {events.map((e, i) => {
            const state = eventState(e, nextLabel)
            const done = state === 'done'
            const lead = state === 'next' || state === 'now'
            const accent = done ? 'var(--border)' : CATEGORY_ACCENT[e.category]
            const prevDone = i > 0 && eventState(events[i - 1], nextLabel) === 'done'
            const showToday = prevDone && !done
            const gap = i === 0 ? 0 : gapFor(events[i - 1], e)
            // The spine is "elapsed" up to and including the last past row.
            const spineAbove = done ? 'var(--color-acid)' : 'var(--border)'
            const spineBelow = done && !showToday ? 'var(--color-acid)' : 'var(--border)'

            return (
              <li key={e.label}>
                {/* Spacer whose height is the real gap between milestones. */}
                {gap > 0 ? (
                  <div
                    className="grid grid-cols-[4.25rem_1.5rem_1fr] sm:grid-cols-[6rem_2rem_1fr]"
                    style={{ height: gap }}
                    aria-hidden
                  >
                    <div />
                    <div className="relative">
                      <span
                        className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2"
                        style={{ background: prevDone && !showToday ? 'var(--color-acid)' : 'var(--border)' }}
                      />
                    </div>
                    <div />
                  </div>
                ) : null}

                {showToday ? (
                  <div className="grid grid-cols-[4.25rem_1.5rem_1fr] sm:grid-cols-[6rem_2rem_1fr]">
                    <div />
                    <div className="relative">
                      <span
                        className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2"
                        style={{ background: 'var(--border)' }}
                      />
                      <span className="absolute left-1/2 top-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2 bg-[var(--text)]" />
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <p className="t-meta">TODAY</p>
                      <span className="h-0.5 flex-1 bg-[var(--border)]" />
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-[4.25rem_1.5rem_1fr] sm:grid-cols-[6rem_2rem_1fr]">
                  {/* Countdown gutter — one bold line, always in the same column. */}
                  <div
                    className={`flex items-center justify-end pr-2 text-right ${
                      done ? 'opacity-55' : ''
                    }`}
                  >
                    <p className="t-micro leading-tight">
                      {state === 'now' ? 'NOW' : relativeLabel(e)}
                    </p>
                  </div>

                  {/* Spine — filled above TODAY, hollow below. */}
                  <div className="relative">
                    {i > 0 ? (
                      <span
                        className="absolute left-1/2 top-0 bottom-1/2 w-0.5 -translate-x-1/2"
                        style={{ background: spineAbove }}
                      />
                    ) : null}
                    {i < events.length - 1 ? (
                      <span
                        className="absolute left-1/2 top-1/2 bottom-0 w-0.5 -translate-x-1/2"
                        style={{ background: spineBelow }}
                      />
                    ) : null}
                    <span
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--border)]"
                      style={{
                        background: done ? 'var(--color-acid)' : lead ? accent : 'var(--surface)',
                        width: lead ? 14 : 10,
                        height: lead ? 14 : 10,
                      }}
                      aria-hidden
                    />
                  </div>

                  {/* Row body — same size for every milestone. */}
                  <div
                    className={`board my-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 pad-tight ${
                      done ? 'opacity-55' : ''
                    }`}
                    style={{
                      borderLeftWidth: 5,
                      borderLeftColor: accent,
                      ...(lead ? { borderWidth: 3, borderLeftWidth: 5 } : null),
                    }}
                  >
                    <p className="t-body muted">{e.label}</p>
                    <p className="t-card-title tabular-nums">
                      {e.value}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        {CALENDAR.note ? <p className="t-meta muted mt-4">{CALENDAR.note}</p> : null}
        {/* Only claim a source once the dates actually come from one. */}
        {CALENDAR.verified ? (
          <p className="t-meta muted mt-2">
            SOURCE · OFFICIAL ACADEMIC CALENDAR NOTICE OF NIT KURUKSHETRA
          </p>
        ) : null}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="pad-page">
          <div className="flex items-center gap-2">
            <Phone className="icon-micro shrink-0" strokeWidth={2.5} aria-hidden />
            <p className="t-meta muted">HELPLINE</p>
          </div>
          <p className="t-section mt-1">EMERGENCY CONTACTS</p>
          <dl className="mt-3">
            {HELPLINE.map((h) => (
              <div
                key={h.label}
                className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-black/10 py-3 dark:border-white/10"
              >
                <dt className="t-meta">{h.label}</dt>
                <dd className="t-body font-bold tabular-nums">{h.value}</dd>
              </div>
            ))}
          </dl>
          <p
            className="t-body font-bold mt-3 border-2 p-2"
            style={{ borderColor: 'var(--color-absent)' }}
          >
            VERIFY EVERY NUMBER AGAINST OFFICIAL SOURCES BEFORE PUBLISHING.
          </p>
        </Panel>

        <Panel className="pad-page">
          <p className="t-meta muted">RESOURCES</p>
          <p className="t-section mt-1">QUICK LINKS</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn flex items-center gap-1.5"
              >
                <span>{l.label}</span> <ExternalLink className="icon-micro shrink-0" strokeWidth={2.5} />
              </a>
            ))}
          </div>
        </Panel>
      </div>
    </Shell>
  )
}
