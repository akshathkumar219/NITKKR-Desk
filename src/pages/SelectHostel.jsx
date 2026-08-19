import { useNavigate } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import PlainShell from '../components/PlainShell'
import { Eyebrow } from '../ui'
import { HOSTELS } from '../data/campus'
import { useProfile } from '../lib/storage'
import { MESS } from '../data/mess'

export default function SelectHostel() {
  const { profile, update } = useProfile()
  const navigate = useNavigate()

  function choose(code) {
    update({ hostel: code, hostelPicked: true })
    navigate('/mess')
  }

  return (
    <PlainShell back="/">
      <Eyebrow icon={UtensilsCrossed}>HOSTEL SELECTION</Eyebrow>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <h1 className="display text-5xl sm:text-6xl">
          Select your
          <br />
          hostel
        </h1>
        <p className="label muted max-w-xs sm:text-right">
          CHOOSE YOUR HOSTEL TO SEE THE RIGHT MESS MENU.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HOSTELS.map((h) => {
          const active = h.code === profile.hostel
          const custom = Boolean(MESS[h.code])
          return (
            <button
              key={h.code}
              type="button"
              onClick={() => choose(h.code)}
              className="board board-hard p-4 text-left transition-transform hover:-translate-y-0.5"
              style={active ? { borderColor: 'var(--color-brand)', borderWidth: 3 } : undefined}
            >
              <p className="display text-2xl">{h.code}</p>
              <p className="label muted mt-1.5">{h.name}</p>
              <hr className="my-3 border-t-2 border-black/10 dark:border-white/10" />
              <span
                className="chip"
                style={custom ? { background: 'var(--color-coral)', color: '#12121A' } : undefined}
              >
                {custom ? 'OWN MENU' : 'SHARED MENU'}
              </span>
            </button>
          )
        })}
      </div>

      <p className="label muted mt-10">
        HOSTELS WITHOUT THEIR OWN MENU FALL BACK TO A SHARED PLACEHOLDER WEEK.
        ADD REAL MENUS IN SRC/DATA/MESS.JS
      </p>
    </PlainShell>
  )
}
