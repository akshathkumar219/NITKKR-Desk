import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Full-bleed layout for pre-onboarding and standalone pages (no sidebar).
 *
 * `aside` is optional and renders opposite BACK on the same top row — used by
 * the setup flow for its step trail. Default null, so every existing caller
 * renders exactly as before.
 */
export default function PlainShell({ children, back = -1, backLabel = 'BACK', aside = null, preserveBackSpace = false }) {
  const navigate = useNavigate()
  const hasTopRow = back !== null || aside !== null || preserveBackSpace
  return (
    <div className="world-grain relative min-h-dvh overflow-hidden px-4 py-6 sm:px-8 sm:py-10">
      {/* WORLD (§3.1) — printed-paper atmosphere, behind everything. */}
      <div
        className="world world-halftone"
        style={{
          color: 'var(--primary)',
          maskImage: 'linear-gradient(180deg, #000, transparent 45%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 45%)',
        }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-5xl">
        {hasTopRow ? (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            {back !== null ? (
              <button
                type="button"
                className="btn"
                onClick={() => (typeof back === 'function' ? back() : navigate(back))}
              >
                <ArrowLeft size={15} strokeWidth={2.5} aria-hidden />
                {backLabel}
              </button>
            ) : preserveBackSpace ? (
              <div className="btn invisible pointer-events-none select-none" aria-hidden="true">
                <ArrowLeft size={15} strokeWidth={2.5} />
                {backLabel}
              </div>
            ) : null}
            {aside}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}
