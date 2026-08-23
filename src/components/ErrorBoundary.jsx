import { Component } from 'react'

/**
 * Last line of defence.
 *
 * Everything this app owns lives in localStorage with no server copy, so a
 * render crash is not just a blank page — it is a blank page in front of the
 * only copy of someone's semester. The recovery path therefore leads to the
 * backup export, not just to "reload".
 *
 * Class component because React still has no hook equivalent for
 * componentDidCatch.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // No telemetry in this app by design, so the console is the only place
    // this can go. Keep the component stack — it is what makes a user's bug
    // report actionable.
    console.error('[NITKKR DESK] render error', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="grid min-h-dvh place-items-center px-4 py-10">
        <div className="board board-hard w-full max-w-lg p-6 sm:p-8">
          <span className="sticker" style={{ background: 'var(--disruption)', color: '#fff' }}>
            SOMETHING BROKE
          </span>

          <h1 className="display mt-5 text-3xl sm:text-4xl uppercase">THAT WASN&apos;T SUPPOSED TO HAPPEN</h1>

          <p className="mt-4 text-sm font-medium">
            The page failed to render. Your saved data has not been touched — it is still on this
            device.
          </p>

          <p className="label muted mt-3 normal-case">{String(this.state.error?.message ?? this.state.error)}</p>

          <div className="mt-7 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              RELOAD
            </button>
            <a href="/tools#backup" className="btn">
              EXPORT A BACKUP
            </a>
            <a href="/" className="btn">
              DASHBOARD
            </a>
          </div>
        </div>
      </div>
    )
  }
}
