import { Compass } from 'lucide-react'
import Shell from '../components/Shell'
import { PageHeader, Panel } from '../ui'

export default function Guide() {
  return (
    <Shell>
      <PageHeader icon={Compass} accent="var(--color-lime)" iconInk="var(--on-accent)" title="HOW DOES THIS WORK?" />

      <Panel className="pad-page flex flex-col items-center justify-center text-center space-y-3 min-h-[360px]">
        <div
          className="icon-tile"
          style={{ background: 'var(--color-lime)', color: 'var(--on-accent)' }}
        >
          <Compass className="icon-lg" strokeWidth={2.5} />
        </div>
        <h2 className="t-section">USER GUIDE & DOCUMENTATION</h2>
        <p className="t-meta muted max-w-md">
          This section is currently being prepped. Full walkthroughs, shortcuts, and usage tips for all NITKKR DESK modules will be available here soon.
        </p>
      </Panel>
    </Shell>
  )
}
