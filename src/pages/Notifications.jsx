import { useState, useMemo, useEffect } from 'react'
import {
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import Shell from '../components/Shell'
import { EmptyState, PageHeader, Panel } from '../ui'
import { useNotifications } from '../lib/storage'
import { usePwa } from '../lib/pwa'

export default function Notifications() {
  const { notifications, markAllAsRead } = useNotifications()
  const { needRefresh, updateApp, checkForUpdates, checkStatus } = usePwa()
  const [expandedIds, setExpandedIds] = useState(() => new Set(['update-v1-7']))

  // Automatically mark notifications as seen when opening the page
  useEffect(() => {
    markAllAsRead()
  }, [markAllAsRead])

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const sorted = useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return 0
    })
  }, [notifications])

  return (
    <Shell>
      <PageHeader
        icon={Bell}
        accent="var(--color-coral)"
        iconInk="var(--on-accent)"
        title="NOTIFICATIONS"
        sub="APP UPDATES, NEW LAUNCHES & ANNOUNCEMENTS"
      />

      {/* PWA Update Banner if new service worker / assets are ready */}
      {needRefresh ? (
        <Panel
          className="pad-page animate-fade-in"
          style={{
            borderLeftWidth: 6,
            borderLeftColor: 'var(--color-acid)',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="grid size-9 place-items-center border-2 border-[var(--border)] shrink-0 shadow-sm"
                style={{ backgroundColor: 'var(--color-acid)', color: 'var(--on-accent)' }}
                aria-hidden
              >
                <Sparkles size={18} strokeWidth={2.5} />
              </span>
              <div>
                <p className="t-card-title text-sm sm:text-base uppercase leading-tight font-black">
                  NEW APP UPDATE READY
                </p>
                <p className="t-meta muted text-xs mt-0.5">
                  A fresh version of NITKKR DESK is downloaded and ready to apply.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={updateApp}
              className="btn !py-1.5 !px-4 text-xs font-black uppercase tracking-wider cursor-pointer shadow-hard-sm hover:shadow-hard"
              style={{
                backgroundColor: 'var(--color-acid)',
                color: 'var(--on-accent)',
              }}
            >
              <RefreshCw size={13} strokeWidth={2.5} />
              <span>UPDATE NOW</span>
            </button>
          </div>
        </Panel>
      ) : null}

      {/* Notifications List */}
      {sorted.length === 0 ? (
        <EmptyState
          title="NO NOTIFICATIONS"
          hint="You're all caught up! Updates, announcements, and new app launches will appear here."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((item) => {
            const isExpanded = expandedIds.has(item.id)

            return (
              <Panel
                key={item.id}
                className="pad-page transition-all duration-150"
                style={{
                  borderLeftWidth: 6,
                  borderLeftColor: item.accentColor || 'var(--color-violet)',
                }}
              >
                {/* Header Row: [NEW] (only for 1.4) + Title (20px) on left, DETAILS button on right */}
                <div
                  className="cursor-pointer select-none"
                  onClick={() => toggleExpand(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpand(item.id)
                    }
                  }}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                      {item.isNew ? (
                        <span
                          className="sticker !px-1.5 !py-0.5 !text-[11px] !font-black !tracking-wider select-none shrink-0"
                          style={{
                            backgroundColor: 'var(--color-lime)',
                            color: 'var(--color-ink, #111)',
                            transform: 'rotate(-6deg)',
                          }}
                        >
                          NEW
                        </span>
                      ) : null}

                      <h2
                        className="font-black uppercase tracking-wide leading-none select-text"
                        style={{ fontSize: '20px' }}
                      >
                        {item.title}
                      </h2>

                      {item.date ? (
                        <span className="text-[11px] font-mono font-bold text-[var(--muted)] uppercase tracking-wider">
                          ({item.date})
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(item.id)
                      }}
                      className="btn !py-1 !px-2.5 text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1 shadow-sm"
                      aria-label={isExpanded ? 'Hide details' : 'Show details'}
                    >
                      <span className="text-[10.5px] tracking-wider uppercase font-extrabold">
                        {isExpanded ? 'LESS' : 'DETAILS'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={13} strokeWidth={2.5} />
                      ) : (
                        <ChevronDown size={13} strokeWidth={2.5} />
                      )}
                    </button>
                  </div>

                  {/* Summary */}
                  <p className="t-body font-normal mt-2 text-xs sm:text-sm text-[var(--text)] opacity-90 leading-snug">
                    {item.summary}
                  </p>
                </div>

                {/* Dropdown Section: Details Only (No action buttons) */}
                {isExpanded && item.details && item.details.length > 0 ? (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] animate-fade-in">
                    <ul className="space-y-1.5">
                      {item.details.map((detail, idx) => (
                        <li
                          key={idx}
                          className="t-body font-normal text-xs sm:text-sm text-muted flex items-start gap-2"
                        >
                          <span
                            className="font-bold select-none leading-none mt-0.5"
                            style={{ color: item.accentColor }}
                          >
                            ▸
                          </span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Panel>
            )
          })}
        </div>
      )}

      {/* Bottom Check for Updates Card */}
      <Panel className="pad-page border-l-6 border-l-[var(--color-violet)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="t-meta muted">STAY INFORMED</p>
            <p className="t-card-title mt-1 text-sm sm:text-base font-black uppercase">
              AUTOMATIC APP UPDATES
            </p>
            <p className="t-body font-normal text-xs text-muted mt-1 max-w-lg">
              NITKKR DESK checks for updates in the background. New releases and improvements appear
              right here in your notification deck.
            </p>
          </div>
          <button
            type="button"
            onClick={needRefresh ? updateApp : checkForUpdates}
            disabled={checkStatus === 'checking'}
            className="btn !py-1.5 !px-3 text-xs font-bold uppercase cursor-pointer"
          >
            {checkStatus === 'checking' ? (
              <>
                <RefreshCw size={13} strokeWidth={2.5} className="animate-spin" />
                CHECKING...
              </>
            ) : checkStatus === 'up-to-date' ? (
              <>
                <Check size={13} strokeWidth={2.5} className="text-[var(--color-present)]" />
                UP TO DATE
              </>
            ) : needRefresh || checkStatus === 'updated' ? (
              <>
                <RefreshCw size={13} strokeWidth={2.5} className="text-[var(--color-acid)]" />
                UPDATE READY (RELOAD)
              </>
            ) : (
              <>
                <RefreshCw size={13} strokeWidth={2.5} />
                CHECK FOR UPDATES
              </>
            )}
          </button>
        </div>
      </Panel>
    </Shell>
  )
}
