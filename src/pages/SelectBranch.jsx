import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import PlainShell from '../components/PlainShell'
import { Segmented } from '../ui'
import { BRANCHES, SORTED_BRANCHES, YEARS } from '../data/campus'
import { useProfile } from '../lib/storage'
import { baseTimetable, groupsFor } from '../data/timetables'

export default function SelectBranch() {
  const { profile, year, group, setBranch } = useProfile()
  const [pickedYear, setPickedYear] = useState(year)
  const [pickedBranch, setPickedBranch] = useState(profile.branch)

  const availableSubsections = useMemo(() => {
    const raw = groupsFor(pickedBranch, pickedYear)
    return raw.length > 0 ? raw : ['G1', 'G2']
  }, [pickedBranch, pickedYear])

  const [pickedGroup, setPickedGroup] = useState(() => {
    const key = `${profile.branch}-${year}`
    const existing = profile.groupByBranch?.[key] || (profile.branch === pickedBranch ? group : '')
    const valid = groupsFor(profile.branch, year)
    return valid.includes(existing) ? existing : (valid[0] || '1')
  })

  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const onboarding = location.state?.onboarding === true
  function handleBranchChange(newBranch) {
    setPickedBranch(newBranch)
    const valid = groupsFor(newBranch, pickedYear)
    const key = `${newBranch}-${pickedYear}`
    const saved = profile.groupByBranch?.[key]
    if (saved && valid.includes(saved)) {
      setPickedGroup(saved)
    } else if (pickedGroup && valid.includes(pickedGroup)) {
      setPickedGroup(pickedGroup)
    } else {
      setPickedGroup(valid[0] || '1')
    }
  }

  function handleYearChange(newYear) {
    setPickedYear(newYear)
    const valid = groupsFor(pickedBranch, newYear)
    const key = `${pickedBranch}-${newYear}`
    const saved = profile.groupByBranch?.[key]
    if (saved && valid.includes(saved)) {
      setPickedGroup(saved)
    } else if (pickedGroup && valid.includes(pickedGroup)) {
      setPickedGroup(pickedGroup)
    } else {
      setPickedGroup(valid[0] || '1')
    }
  }

  function save() {
    setBranch(pickedBranch, pickedYear, pickedGroup)
    // Mid-setup this is step 2, so hand off to the hostel step rather than the
    // board. Reached any other way (e.g. /profile) it still returns where it came from.
    if (onboarding) navigate('/select/hostel', { replace: true, state: { onboarding: true } })
    else navigate(from || '/home')
  }

  const backAction =
    from || (onboarding ? () => navigate('/welcome', { replace: true }) : '/welcome')

  return (
    <PlainShell back={backAction}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-4xl sm:text-5xl">SELECT YOUR YEAR &amp; BRANCH</h1>
          <p className="label muted mt-3 max-w-md">
            CHOOSE YOUR YEAR AND DEPARTMENT TO LOAD THE RIGHT BOARD.
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

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Segmented label="YEAR" options={YEARS} value={pickedYear} onChange={handleYearChange} />
        <Segmented
          label="SUBSECTION"
          options={availableSubsections}
          value={pickedGroup}
          onChange={setPickedGroup}
        />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SORTED_BRANCHES.map((b) => {
          const has = baseTimetable(b.code, pickedYear).length > 0
          const active = b.code === pickedBranch
          return (
            <button
              key={b.code}
              type="button"
              aria-pressed={active}
              onClick={() => handleBranchChange(b.code)}
              className="board board-hard p-3.5 sm:p-4 text-left transition-transform hover:-translate-y-0.5"
              style={
                active
                  ? { borderColor: 'var(--color-brand)', borderWidth: 3 }
                  : undefined
              }
            >
              <p className="heading text-2xl">{b.code}</p>
              <p className="label muted mt-1.5">{b.name}</p>
              <hr className="my-3 border-t-2 border-black/10 dark:border-white/10" />
              <span
                className="chip"
                style={
                  has
                    ? { background: 'var(--color-acid)', color: 'var(--on-accent)' }
                    : undefined
                }
              >
                {has ? 'BOARD READY' : 'ADD YOUR OWN'}
              </span>
            </button>
          )
        })}
      </div>

      <p className="label muted mt-10">
        BUILD YOUR TIMETABLE IN EDIT MODE, OR ADD OFFICIAL DEPARTMENT SCHEDULES IN CONTENT/TIMETABLES/
      </p>
    </PlainShell>
  )
}

