import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, User } from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, Field, PageHeader, Panel } from '../ui'
import { initialsOf, useProfile } from '../lib/storage'
import { branchName, hostelName } from '../data/campus'

export default function Profile() {
  const { profile, year, update } = useProfile()
  const [name, setName] = useState(profile.name)
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  useEffect(() => setName(profile.name), [profile.name])

  function save(e) {
    e.preventDefault()
    update({ name: name.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <Shell>
      <PageHeader
        icon={User}
        accent="var(--color-violet)"
        eyebrow="LOCAL ONLY"
        title="EDIT PROFILE"
        sub="YOUR BOARD, YOUR NAME"
      />

      <Panel className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <span
            className="grid size-14 shrink-0 place-items-center border-2 border-ink font-mono text-base font-bold"
            style={{ background: 'var(--color-acid)', borderRadius: 2, color: '#12121A' }}
            aria-hidden
          >
            {initialsOf(profile.name)}
          </span>
          <div className="min-w-0">
            <p className="label muted">DISPLAY NAME</p>
            <p className="display text-2xl">{profile.name || 'NO NAME SET'}</p>
            <p className="label muted mt-1">
              {branchName(profile.branch)} · Y{year} · {hostelName(profile.hostel)}
            </p>
          </div>
        </div>

        <form className="mt-6 max-w-sm space-y-3" onSubmit={save}>
          <Field label="FIRST NAME" id="p-name">
            <input
              id="p-name"
              className="field"
              value={name}
              maxLength={24}
              autoComplete="given-name"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn btn-go">
              SAVE NAME
            </button>
            {saved ? <Chip tone="var(--color-present)">SAVED</Chip> : null}
          </div>
        </form>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          className="board board-hard flex items-center justify-between gap-3 p-4 text-left"
          onClick={() => navigate('/select/branch')}
        >
          <span>
            <span className="label muted block">CHANGE BRANCH</span>
            <span className="display mt-1 block text-lg">
              {branchName(profile.branch)} · YEAR {year}
            </span>
          </span>
          <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
        </button>

        <button
          type="button"
          className="board board-hard flex items-center justify-between gap-3 p-4 text-left"
          onClick={() => navigate('/select/hostel')}
        >
          <span>
            <span className="label muted block">CHANGE HOSTEL</span>
            <span className="display mt-1 block text-lg">{hostelName(profile.hostel)}</span>
          </span>
          <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      <p className="label muted">
        EVERYTHING HERE LIVES IN THIS BROWSER ONLY — NO CLOUD ACCOUNT. EXPORT A
        BACKUP FROM STUDENT TOOLS SO YOU DON'T LOSE IT.
      </p>
    </Shell>
  )
}
