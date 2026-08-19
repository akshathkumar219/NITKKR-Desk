import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/* ---------------------------------------------------------------- Panel -- */

export function Panel({ children, className = '', hard = true, ref, ...rest }) {
  // `ref` is destructured explicitly rather than left to ride along in
  // {...rest}. Under React 19 a ref is an ordinary prop, so spreading it onto
  // the div happened to work — but silently, and only by accident of that
  // version's behaviour. Modal focuses this element on open and depends on it.
  return (
    <div ref={ref} className={`board ${hard ? 'board-hard' : ''} ${className}`} {...rest}>
      {children}
    </div>
  )
}

/* --------------------------------------------------------------- Eyebrow -- */

export function Eyebrow({ icon: Icon, children, className = '' }) {
  return (
    <p className={`label muted flex items-center gap-2 ${className}`}>
      {Icon ? <Icon size={13} strokeWidth={2.5} aria-hidden /> : null}
      {children}
    </p>
  )
}

/* ------------------------------------------------------------- PageTitle -- */

export function PageHeader({ icon: Icon, accent, eyebrow, title, sub, actions }) {
  return (
    <Panel className="p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          {Icon ? (
            <span
              className="grid size-11 shrink-0 place-items-center border-2 border-[var(--border)]"
              style={{ background: accent, borderRadius: 'var(--radius-board)' }}
            >
              <Icon size={20} strokeWidth={2.5} color="var(--color-ink)" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? <Eyebrow className="mb-1">{eyebrow}</Eyebrow> : null}
            <h1 className="heading text-3xl sm:text-4xl">{title}</h1>
            {sub ? <p className="label muted mt-2">{sub}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ Chip -- */

export function Chip({ children, tone, className = '', style, ...rest }) {
  return (
    <span
      className={`chip ${className}`}
      style={tone ? { background: tone, color: 'var(--color-ink)', ...style } : style}
      {...rest}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------- SegmentedControl -- */

export function Segmented({ options, value, onChange, label, size = 'md' }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {label ? <span className="label muted mr-1">{label}</span> : null}
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value
        const text = typeof opt === 'string' ? opt : opt.label
        const active = val === value
        return (
          <button
            key={val}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(val)}
            className="btn"
            style={{
              padding: size === 'sm' ? '0.3rem 0.55rem' : '0.45rem 0.8rem',
              fontSize: size === 'sm' ? '0.625rem' : '0.6875rem',
              ...(active
                ? { background: 'var(--text)', color: 'var(--bg)' }
                : null),
            }}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------ EmptyState -- */

export function EmptyState({ title, hint, action }) {
  return (
    // §10 lists empty states as high-personality territory — one of the few
    // places the display face earns its keep outside the landing page.
    <Panel className="relative overflow-hidden px-6 py-14 text-center" hard={false}>
      <div
        className="world world-halftone"
        style={{
          color: 'var(--primary)',
          maskImage: 'radial-gradient(ellipse at center, #000, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, #000, transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative z-10">
        <p className="display text-3xl sm:text-4xl">{title}</p>
        {hint ? <p className="label muted mx-auto mt-4 max-w-md normal-case">{hint}</p> : null}
        {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
      </div>
    </Panel>
  )
}

/* -------------------------------------------------------------- StatTile -- */

export function StatTile({ label, value, accent }) {
  return (
    <div
      className="board px-3 py-2.5"
      style={accent ? { borderBottomWidth: 5, borderBottomColor: accent } : undefined}
    >
      <p className="label muted">{label}</p>
      <p className="heading mt-1 text-lg">{value}</p>
    </div>
  )
}

/* ----------------------------------------------------------------- Modal -- */

export function Modal({ open, onClose, title, sub, children, footer }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // Without this, Tab walks straight out of the dialog and into the page
      // behind it, which is still visible and still scrolled to wherever the
      // user was — keyboard users end up editing a form they cannot see.
      if (e.key !== 'Tab' || !ref.current) return
      const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    const previouslyFocused = document.activeElement
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      // Send focus back where it came from, so closing a dialog does not
      // dump the user at the top of the document.
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Panel
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-flip my-auto w-full max-w-lg outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--border)] p-4">
          <div>
            <h2 className="heading text-xl">{title}</h2>
            {sub ? <p className="label muted mt-1">{sub}</p> : null}
          </div>
          <button type="button" className="btn !p-2" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t-2 border-[var(--border)] p-4">
            {footer}
          </div>
        ) : null}
      </Panel>
    </div>
  )
}

/* ----------------------------------------------------------------- Field -- */

export function Field({ label, hint, children, id }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="label muted mb-1.5 block">{label}</span>
      {children}
      {hint ? <span className="label muted mt-1.5 block normal-case">{hint}</span> : null}
    </label>
  )
}

export function Select({ options, value, onChange, id, ...rest }) {
  return (
    <select
      id={id}
      className="field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    >
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value
        const text = typeof o === 'string' ? o : o.label
        return (
          <option key={val} value={val}>
            {text}
          </option>
        )
      })}
    </select>
  )
}

/* ------------------------------------------------------------- LiveBadge -- */

export function LiveBadge({ children = 'LIVE' }) {
  return (
    <span className="chip" style={{ gap: '0.4rem' }}>
      <span
        className="animate-live inline-block size-2 rounded-full"
        style={{ background: 'var(--color-present)' }}
        aria-hidden
      />
      {children}
    </span>
  )
}

/* ----------------------------------------------------------------- Meter -- */

export function Meter({ percent, color, required }) {
  const width = percent === null ? 0 : Math.min(100, Math.max(0, percent))
  return (
    <div
      className="relative h-3 w-full border-2 border-[var(--border)]"
      style={{ borderRadius: 2 }}
      role="meter"
      aria-valuenow={percent === null ? undefined : Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full" style={{ width: `${width}%`, background: color }} />
      {required != null ? (
        <span
          className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-[var(--text)]"
          style={{ left: `${required}%` }}
          aria-hidden
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ Ring -- */

export function Ring({ percent, size = 104, color }) {
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const filled = percent === null ? 0 : (Math.min(100, Math.max(0, percent)) / 100) * c

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-[var(--border)]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeDasharray={`${filled} ${c}`}
          strokeLinecap="butt"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="heading text-xl leading-none">
            {percent === null ? '—' : `${Math.round(percent)}%`}
          </p>
        </div>
      </div>
    </div>
  )
}
