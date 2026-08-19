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
    <div className="world-grain relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div
        className="world world-halftone"
        style={{
          color: 'var(--primary)',
          maskImage: 'radial-gradient(circle at 50% 40%, #000, transparent 65%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 40%, #000, transparent 65%)',
        }}
        aria-hidden
      />
      <Panel className="animate-flip relative z-10 w-full max-w-lg p-6 sm:p-8">
        <span className="sticker">NEW HERE</span>

        <h1 className="display mt-5 text-4xl sm:text-5xl">
          what should
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
