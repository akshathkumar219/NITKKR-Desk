import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/** Full-bleed layout for pre-onboarding and standalone pages (no sidebar). */
export default function PlainShell({ children, back = -1, backLabel = 'BACK' }) {
  const navigate = useNavigate()
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
        {back !== null ? (
          <button type="button" className="btn mb-8" onClick={() => navigate(back)}>
            <ArrowLeft size={15} strokeWidth={2.5} aria-hidden />
            {backLabel}
          </button>
        ) : null}
        {children}
      </div>
    </div>
  )
}
