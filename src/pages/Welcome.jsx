import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel } from '../ui'
import { KEYS, useProfile, write } from '../lib/storage'

export default function Welcome() {
  const [name, setName] = useState('')
  const { update } = useProfile()
  const navigate = useNavigate()

  function finish(withName) {
    if (withName) update({ name: name.trim() })
    write(KEYS.welcomed, true)
    navigate('/', { replace: true })
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <Panel className="animate-flip w-full max-w-lg p-6 sm:p-8">
        <p className="label muted">BOARD · INITIALISING</p>

        <h1 className="heading mt-4 text-4xl sm:text-5xl">
          What should
          <br />
          the board
          <br />
          call you?
        </h1>

        <p className="label muted mt-4">ONE NAME. IT NEVER LEAVES THIS DEVICE.</p>

        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            finish(true)
          }}
        >
          <label className="sr-only" htmlFor="welcome-name">
            First name
          </label>
          <input
            id="welcome-name"
            className="field"
            placeholder="FIRST NAME"
            value={name}
            autoComplete="given-name"
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary w-full" disabled={!name.trim()}>
            CONTINUE
          </button>
          <button
            type="button"
            className="label muted mx-auto block underline underline-offset-4"
            onClick={() => finish(false)}
          >
            SKIP FOR NOW
          </button>
        </form>

        <hr className="my-6 border-t-2 border-[var(--border)]" />
        <p className="label muted">
          NO ACCOUNT. NO PASSWORD. NO SERVER. EXPORT A BACKUP FROM TOOLS TO KEEP IT SAFE.
        </p>
      </Panel>
    </div>
  )
}
