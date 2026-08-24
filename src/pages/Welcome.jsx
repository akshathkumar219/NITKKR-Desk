import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import PlainShell from '../components/PlainShell'
import { KEYS, useProfile, write } from '../lib/storage'

export default function Welcome() {
  const [name, setName] = useState('')
  const { update } = useProfile()
  const navigate = useNavigate()

  function save(e) {
    if (e) e.preventDefault()
    if (name.trim()) {
      update({ name: name.trim() })
    }
    write(KEYS.welcomed, true)
    navigate('/select/branch', { replace: true, state: { onboarding: true } })
  }

  return (
    <PlainShell back={null} preserveBackSpace>
      <form onSubmit={save}>
        <div className="min-w-0">
          <h1 className="display text-4xl sm:text-5xl">ENTER YOUR NAME</h1>
          <p className="label muted mt-3 max-w-md">
            WHAT SHOULD WE CALL YOU
          </p>
        </div>

        <div className="board board-hard mt-8 min-h-[140px] p-4 sm:p-5 flex flex-col justify-between">
          <input
            type="text"
            className="field w-full text-[24px] font-bold uppercase tracking-wide placeholder:opacity-50"
            placeholder="ENTER HERE"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <div className="flex justify-end mt-3">
            <button
              type="submit"
              className="btn btn-go shrink-0 !py-2 !px-5 text-sm font-bold shadow-hard-sm cursor-pointer"
            >
              <Check size={15} strokeWidth={2.75} /> SAVE
            </button>
          </div>
        </div>

        <p className="label muted mt-10">
          ALL YOUR DATA STAYS IN YOUR BROWSER LOCALLY. EXPORT A BACKUP BEFORE CLEARING BROWSER DATA.
        </p>
      </form>
    </PlainShell>
  )
}
