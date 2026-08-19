import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, PageHeader, Panel, Segmented, Select } from '../ui'
import { HOSTELS, hostelName } from '../data/campus'
import { MEALS, MESS, menuFor } from '../data/mess'
import { useProfile } from '../lib/storage'
import { DAYS_7, dayCode } from '../lib/time'

export default function Mess() {
  const { profile, update } = useProfile()
  const today = dayCode()
  const [day, setDay] = useState(today)

  const menu = menuFor(profile.hostel, day)
  const isPlaceholder = !MESS[profile.hostel]

  return (
    <Shell>
      <PageHeader
        icon={UtensilsCrossed}
        accent="var(--color-coral)"
        eyebrow="MESS BOARD"
        title="MESS MENU"
        sub={hostelName(profile.hostel)}
        actions={
          <div className="w-56">
            <Select
              aria-label="Hostel"
              options={HOSTELS.map((h) => ({ value: h.code, label: h.name }))}
              value={profile.hostel}
              onChange={(v) => update({ hostel: v, hostelPicked: true })}
            />
          </div>
        }
      />

      <Panel className="flex flex-wrap items-center gap-3 p-4">
        <Segmented options={DAYS_7} value={day} onChange={setDay} />
        {day === today ? (
          <Chip tone="var(--color-acid)">SHOWING TODAY</Chip>
        ) : (
          <button type="button" className="btn !py-1.5" onClick={() => setDay(today)}>
            BACK TO TODAY
          </button>
        )}
      </Panel>

      {isPlaceholder ? (
        <Panel
          className="p-3"
          style={{ borderLeftWidth: 6, borderLeftColor: 'var(--color-amber)' }}
        >
          <p className="label">
            PLACEHOLDER MENU — {hostelName(profile.hostel)} HAS NO OWN DATA YET.
            ADD IT IN CONTENT/MESS/ — ONE FILE PER HOSTEL
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MEALS.map((meal) => (
          <Panel key={meal.key} className="p-4">
            <div className="flex items-center gap-3">
              <span
                className="grid size-9 shrink-0 place-items-center border-2 border-[var(--border)]"
                style={{ background: meal.accent, borderRadius: 'var(--radius-board)' }}
                aria-hidden
              >
                <UtensilsCrossed size={16} strokeWidth={2.5} color="var(--color-ink)" />
              </span>
              <div>
                <p className="heading text-lg">{meal.label}</p>
                <p className="label muted mt-0.5">{meal.time}</p>
              </div>
            </div>

            <ol className="mt-4 space-y-0">
              {(menu[meal.key] ?? []).map((item, i) => (
                <li
                  key={`${meal.key}-${i}`}
                  className="flex gap-3 border-t-2 border-black/10 py-2.5 dark:border-white/10"
                >
                  <span className="label muted shrink-0 pt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-semibold">{item}</span>
                </li>
              ))}
            </ol>
          </Panel>
        ))}
      </div>
    </Shell>
  )
}
