import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import PlainShell from '../components/PlainShell'
import { HOSTELS } from '../data/campus'
import { useProfile } from '../lib/storage'
import { MESS } from '../data/mess'

// The boys' hostels are numbered (H1..H10) — sort those numerically so H10
// does not land between H1 and H2 the way a plain string sort would put it.
// The girls' hostels are named, not numbered; they sort alphabetically by
// name after the numbered ones.
const SORTED_HOSTELS = [...HOSTELS].sort((a, b) => {
  const digits = (c) => c.replace(/\D/g, '')
  const aNumbered = digits(a.code).length > 0
  const bNumbered = digits(b.code).length > 0
  if (aNumbered && bNumbered) return Number(digits(a.code)) - Number(digits(b.code))
  if (aNumbered !== bNumbered) return aNumbered ? -1 : 1
  return a.name.localeCompare(b.name)
})

export default function SelectHostel() {
  const { profile, update } = useProfile()
  const [picked, setPicked] = useState(profile.hostel)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const onboarding = location.state?.onboarding === true

  function save() {
    update({ hostel: picked, hostelPicked: true })
    // Last step of setup — finish on the board, not the mess menu.
    if (onboarding) navigate('/home')
    else navigate(from || '/mess')
  }

  return (
    <PlainShell back={from || '/select/branch'}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-4xl sm:text-5xl">SELECT YOUR HOSTEL</h1>
          <p className="label muted mt-3 max-w-md">
            CHOOSE YOUR HOSTEL TO SEE THE RIGHT MESS MENU.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          className="btn btn-go shrink-0 !py-2 !px-5 text-sm font-bold shadow-hard-sm cursor-pointer"
        >
          <Check size={15} strokeWidth={2.75} /> SAVE
        </button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SORTED_HOSTELS.map((h) => {
          const active = h.code === picked
          const custom = Boolean(MESS[h.code])
          return (
            <button
              key={h.code}
              type="button"
              aria-pressed={active}
              onClick={() => setPicked(h.code)}
              className="board board-hard p-3.5 sm:p-4 text-left transition-transform hover:-translate-y-0.5"
              style={active ? { borderColor: 'var(--color-brand)', borderWidth: 3 } : undefined}
            >
              <p className="heading text-2xl">{h.name}</p>
              <hr className="my-3 border-t-2 border-black/10 dark:border-white/10" />
              <span
                className="chip"
                style={custom ? { background: 'var(--color-acid)', color: 'var(--on-accent)' } : undefined}
              >
                {custom ? 'MENU READY' : 'ADD MENU'}
              </span>
            </button>
          )
        })}
      </div>

      <p className="label muted mt-10">
        HOSTELS WITHOUT THEIR OWN MENU FALL BACK TO A SHARED PLACEHOLDER WEEK.
      </p>
    </PlainShell>
  )
}
