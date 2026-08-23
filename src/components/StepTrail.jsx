import { Check } from 'lucide-react'

/**
 * First-run progress trail.
 *
 * Setup is three screens — name, then year & branch, then hostel — and none of
 * them used to say so: every step looked like a standalone page you had landed
 * on by accident. This is the thread between them.
 *
 * Rendered only while the chain is actually running (the onboarding flag rides
 * along in router state), so opening /select/branch later from /profile to
 * change your branch does not claim to be "step 2 of 3".
 *
 * Styling is lifted from the YEAR <Segmented> on /select/branch rather than
 * invented: same .btn shell, same var(--text)/var(--bg) invert for the active
 * step that every selected toggle in the app uses. Steps already behind you
 * drop the cutout shadow and go muted — done, not clickable.
 */
export const ONBOARDING_STEPS = [
  { n: 1, label: 'NAME' },
  { n: 2, label: 'YEAR & BRANCH' },
  { n: 3, label: 'HOSTEL' },
]

export default function StepTrail({ current }) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={`Setup step ${current} of ${ONBOARDING_STEPS.length}`}
    >
      <span className="label muted mr-1">SETUP</span>
      {ONBOARDING_STEPS.map((s) => {
        const done = s.n < current
        const active = s.n === current
        return (
          <span
            key={s.n}
            aria-current={active ? 'step' : undefined}
            className="btn cursor-default"
            style={{
              padding: '0.35rem 0.65rem',
              ...(active ? { background: 'var(--text)', color: 'var(--bg)' } : null),
              ...(done ? { color: 'var(--muted)', boxShadow: 'none' } : null),
            }}
          >
            {done ? (
              <Check className="icon-micro" strokeWidth={3} aria-hidden />
            ) : (
              <span aria-hidden>{s.n}</span>
            )}
            {s.label}
          </span>
        )
      })}
    </div>
  )
}
