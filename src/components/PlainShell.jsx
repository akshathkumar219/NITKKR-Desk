import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/** Full-bleed layout for pre-onboarding and standalone pages (no sidebar). */
export default function PlainShell({ children, back = -1, backLabel = 'BACK' }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        {back !== null ? (
          <button
            type="button"
            className="btn mb-8"
            onClick={() => (typeof back === 'number' ? navigate(back) : navigate(back))}
          >
            <ArrowLeft size={15} strokeWidth={2.5} aria-hidden />
            {backLabel}
          </button>
        ) : null}
        {children}
      </div>
    </div>
  )
}
