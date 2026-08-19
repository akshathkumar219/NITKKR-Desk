import { useState } from 'react'
import { ExternalLink, Info, Phone } from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, PageHeader, Panel, Segmented, StatTile } from '../ui'
import {
  CALENDAR,
  CALENDAR_CATEGORIES,
  HELPLINE,
  INSTITUTE,
  QUICK_LINKS,
} from '../data/info'

export default function CampusInfo() {
  const [cat, setCat] = useState('ALL')
  const events =
    cat === 'ALL' ? CALENDAR.events : CALENDAR.events.filter((e) => e.category === cat)

  return (
    <Shell>
      <PageHeader
        icon={Info}
        accent="var(--color-amber)"
        eyebrow="CAMPUS INFORMATION"
        title="NITKKR INFO"
        sub={INSTITUTE.address}
        actions={
          <a
            href={INSTITUTE.website}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            OFFICIAL SITE <ExternalLink size={13} strokeWidth={2.5} />
          </a>
        }
      />

      <Panel className="p-4 sm:p-5">
        <p className="label muted">ABOUT</p>
        <p className="heading mt-1 text-xl">{INSTITUTE.name}</p>
        <p className="mt-2 text-sm font-medium">{INSTITUTE.blurb}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatTile label="ESTABLISHED" value={INSTITUTE.established} accent="var(--color-sky)" />
          <StatTile label="CAMPUS" value={INSTITUTE.campus} accent="var(--color-acid)" />
          <StatTile label="LOCATION" value={INSTITUTE.location} accent="var(--color-coral)" />
        </div>
      </Panel>

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label muted">ACADEMIC CALENDAR</p>
            <p className="heading mt-1 text-xl">{CALENDAR.title}</p>
            <p className="label muted mt-1.5 normal-case">{CALENDAR.audience}</p>
          </div>
          <Chip tone="var(--color-amber)">PLACEHOLDER</Chip>
        </div>

        <div className="mt-4">
          <Segmented options={CALENDAR_CATEGORIES} value={cat} onChange={setCat} size="sm" />
        </div>

        <dl className="mt-4">
          {events.map((e) => (
            <div
              key={e.label}
              className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-black/10 py-3 dark:border-white/10"
            >
              <dt className="label">{e.label}</dt>
              <dd className="text-sm font-bold tabular-nums">{e.value}</dd>
            </div>
          ))}
        </dl>

        <p className="label muted mt-3">{CALENDAR.note}</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Phone size={15} strokeWidth={2.5} aria-hidden />
            <p className="label muted">HELPLINE</p>
          </div>
          <p className="heading mt-1 text-xl">EMERGENCY CONTACTS</p>
          <dl className="mt-3">
            {HELPLINE.map((h) => (
              <div
                key={h.label}
                className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-black/10 py-3 dark:border-white/10"
              >
                <dt className="label">{h.label}</dt>
                <dd className="text-sm font-bold tabular-nums">{h.value}</dd>
              </div>
            ))}
          </dl>
          <p
            className="label mt-3 border-2 p-2"
            style={{ borderColor: 'var(--color-absent)' }}
          >
            VERIFY EVERY NUMBER AGAINST OFFICIAL SOURCES BEFORE PUBLISHING.
          </p>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <p className="label muted">RESOURCES</p>
          <p className="heading mt-1 text-xl">QUICK LINKS</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
              >
                {l.label} <ExternalLink size={12} strokeWidth={2.5} />
              </a>
            ))}
          </div>
        </Panel>
      </div>
    </Shell>
  )
}
