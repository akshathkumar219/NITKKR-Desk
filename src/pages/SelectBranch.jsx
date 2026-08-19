import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import PlainShell from '../components/PlainShell'
import { Eyebrow, Segmented } from '../ui'
import { BRANCHES, YEARS } from '../data/campus'
import { useProfile } from '../lib/storage'
import { baseTimetable } from '../data/timetables'

export default function SelectBranch() {
  const { profile, year, setBranch } = useProfile()
  const [pickedYear, setPickedYear] = useState(year)
  const navigate = useNavigate()

  const groups = [...new Set(BRANCHES.map((b) => b.group))]

  function choose(code) {
    setBranch(code, pickedYear)
    navigate('/home')
  }

  return (
    <PlainShell back="/">
      <Eyebrow icon={GraduationCap}>DEPARTMENT SELECTION</Eyebrow>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <h1 className="display text-5xl sm:text-6xl">
          Select your
          <br />
          branch
        </h1>
        <p className="label muted max-w-xs sm:text-right">
          CHOOSE YOUR YEAR AND DEPARTMENT TO LOAD THE RIGHT BOARD.
        </p>
      </div>

      <div className="mt-8">
        <Segmented label="YEAR" options={YEARS} value={pickedYear} onChange={setPickedYear} />
      </div>

      {groups.map((group) => (
        <section key={group} className="mt-8">
          <p className="label muted mb-3">{group}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BRANCHES.filter((b) => b.group === group).map((b) => {
              const has = baseTimetable(b.code, pickedYear).length > 0
              const active = b.code === profile.branch
              return (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => choose(b.code)}
                  className="board board-hard p-4 text-left transition-transform hover:-translate-y-0.5"
                  style={
                    active
                      ? { borderColor: 'var(--color-brand)', borderWidth: 3 }
                      : undefined
                  }
                >
                  <p className="display text-2xl">{b.code}</p>
                  <p className="label muted mt-1.5">{b.name}</p>
                  <hr className="my-3 border-t-2 border-black/10 dark:border-white/10" />
                  <span
                    className="chip"
                    style={
                      has
                        ? { background: 'var(--color-acid)', color: '#12121A' }
                        : undefined
                    }
                  >
                    {has ? 'BOARD READY' : 'ADD YOUR OWN'}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <p className="label muted mt-10">
        ONLY CSE YEAR 2 SHIPS WITH A SAMPLE BOARD. EVERY OTHER BRANCH STARTS EMPTY —
        BUILD IT IN EDIT MODE, OR ADD THE REAL DATA IN SRC/DATA/TIMETABLES.JS
      </p>
    </PlainShell>
  )
}
