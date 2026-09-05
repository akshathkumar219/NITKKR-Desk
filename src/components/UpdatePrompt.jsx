import { RefreshCw, Sparkles, X } from 'lucide-react'
import { usePwa } from '../lib/pwa'

export default function UpdatePrompt() {
  const { needRefresh, updateApp, dismissUpdate } = usePwa()

  if (!needRefresh) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-6 right-3 sm:right-6 left-3 sm:left-auto z-50 max-w-sm sm:max-w-md animate-fade-in"
    >
      <div
        className="board p-3.5 sm:p-4 shadow-hard flex flex-col gap-3 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--bg)',
          borderColor: 'var(--border)',
          borderLeftWidth: 6,
          borderLeftColor: 'var(--color-acid, #B7FE3B)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="grid size-7 place-items-center border-2 border-[var(--border)] shrink-0"
              style={{ backgroundColor: 'var(--color-acid, #B7FE3B)' }}
              aria-hidden
            >
              <Sparkles size={14} strokeWidth={2.5} color="var(--on-accent, #111905)" />
            </span>
            <div>
              <p className="t-card-title text-sm uppercase tracking-wide leading-none">
                UPDATE READY
              </p>
              <p className="t-meta muted text-[0.6875rem] mt-1">
                A new version of NITKKR DESK is ready to install.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissUpdate}
            className="btn !p-1.5 cursor-pointer text-muted hover:text-[var(--text)]"
            title="Dismiss for now"
            aria-label="Dismiss update notification"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={dismissUpdate}
            className="btn !py-1 !px-2.5 text-xs font-bold uppercase cursor-pointer"
          >
            LATER
          </button>
          <button
            type="button"
            onClick={updateApp}
            className="btn !py-1 !px-3 text-xs font-black uppercase tracking-wider cursor-pointer transition-all hover:shadow-hard-sm"
            style={{
              backgroundColor: 'var(--color-acid, #B7FE3B)',
              color: 'var(--on-accent, #111905)',
              borderColor: 'var(--border)',
            }}
          >
            <RefreshCw size={13} strokeWidth={2.5} className="shrink-0" />
            <span>UPDATE NOW</span>
          </button>
        </div>
      </div>
    </div>
  )
}
