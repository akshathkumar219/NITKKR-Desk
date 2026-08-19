import { ShieldQuestion } from 'lucide-react'
import Shell from '../components/Shell'
import { PageHeader, Panel } from '../ui'
import { CREDITS, INSTITUTE } from '../data/info'

export default function About() {
  return (
    <Shell>
      <PageHeader
        icon={ShieldQuestion}
        accent="var(--color-sky)"
        eyebrow="ABOUT"
        title="NITKKR BOARD"
        sub="UNOFFICIAL STUDENT COMPANION"
      />

      <Panel className="p-4 sm:p-6">
        <p className="text-sm font-medium">
          An unofficial student companion for {INSTITUTE.short}. Not affiliated with,
          endorsed by, or maintained by the institute administration.
        </p>

        <h2 className="heading mt-6 text-lg">DISCLAIMER</h2>
        <p className="mt-2 text-sm font-medium">
          Timetables, mess menus, past papers, maps, calendar dates and contact numbers
          in this app may be out of date or wrong. Always verify anything important on
          official {INSTITUTE.short} channels before acting on it.
        </p>

        <h2 className="heading mt-6 text-lg">PRIVACY</h2>
        <ul className="mt-2 space-y-1.5 text-sm font-medium">
          <li>· Your board, roll call, grades and profile are stored on this device only (localStorage).</li>
          <li>· No sign-in, no account, no server, no analytics. Nothing you type is uploaded.</li>
          <li>· No ads. External links open official portals or Google Maps in a new tab.</li>
          <li>· Clearing your browser data deletes everything — export a backup from Student Tools.</li>
        </ul>

        <h2 className="heading mt-6 text-lg">CREDITS</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CREDITS.map((c) => (
            <div key={c.name} className="board p-3">
              <p className="label muted">{c.role}</p>
              <p className="heading mt-1 text-base">{c.name}</p>
              <p className="label muted mt-1 normal-case">{c.detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        className="p-4"
        style={{ borderLeftWidth: 6, borderLeftColor: 'var(--color-amber)' }}
      >
        <p className="label">
          BUILD NOTE — BRANCHES, HOSTELS, TIMETABLES, MENUS, CALENDAR DATES AND PHONE
          NUMBERS ALL SHIP AS PLACEHOLDERS. REPLACE THEM IN CONTENT/ BEFORE SHARING
          THIS WITH ANYONE.
        </p>
      </Panel>
    </Shell>
  )
}
