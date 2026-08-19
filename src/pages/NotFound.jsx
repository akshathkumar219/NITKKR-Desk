import { Link } from 'react-router-dom'
import PlainShell from '../components/PlainShell'
import { Panel } from '../ui'

// design.md §10: 404, empty states and Easter eggs are "safe places to be
// deliberately ridiculous" — high personality. This is one of the few
// screens that gets the display face at full size.
export default function NotFound() {
  return (
    <PlainShell back={null}>
      <Panel className="cutout relative mt-12 overflow-hidden px-6 py-14 text-center sm:py-20">
        <div
          className="world world-halftone"
          style={{
            color: 'var(--disruption)',
            // §15 lists "decorative noise behind text" as an anti-pattern, so
            // the dots are pushed out to the edges of the panel.
            maskImage: 'radial-gradient(ellipse 60% 55% at 50% 45%, transparent, #000)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 45%, transparent, #000)',
          }}
          aria-hidden
        />
        <div className="relative z-10">
          <span className="sticker" style={{ background: 'var(--disruption)', color: '#fff' }}>
            ERROR 404
          </span>
          <p className="display animate-settle mt-6 text-6xl sm:text-8xl">
            nothing
            <br />
            pinned here
          </p>
          <p className="label muted mt-6">THAT ROUTE ISN&apos;T ON THE BOARD.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-2">
            <Link to="/" className="btn btn-primary">
              HOME
            </Link>
            <Link to="/home" className="btn">
              TIMETABLE
            </Link>
          </div>
        </div>
      </Panel>
    </PlainShell>
  )
}
