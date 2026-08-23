import { Info } from 'lucide-react'
import Shell from '../components/Shell'
import { PageHeader, Panel } from '../ui'
import { CREDITS, INSPIRED_BY, INSTITUTE } from '../data/info'

/* Lucide dropped brand marks a while back, so these two are hand-drawn to
   match its exact stroke language (24x24, currentColor, 2px round strokes)
   rather than pulling in a whole icon pack for two glyphs. */

function LinkedInIcon({ className = 'icon-sm' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function InstagramIcon({ className = 'icon-sm' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
    </svg>
  )
}

export default function About() {
  const credit = CREDITS[0]

  return (
    <Shell>
      <PageHeader
        icon={Info}
        accent="var(--color-violet)"
        title="ABOUT"
        body={`An unofficial student companion for ${INSTITUTE.short}. Not affiliated with, endorsed by, or maintained by the institute administration.`}
      />

      <Panel className="pad-page border-l-6 border-l-[var(--color-violet)]">
        <h2 className="t-section">DISCLAIMER</h2>
        <p className="t-body font-normal mt-2">
          If timetables, mess menus, past papers, maps, calendar dates and contact
          numbers in this app are out of date or wrong please inform me at{' '}
          <a
            href="mailto:akshathkumar.work@gmail.com"
            className="underline underline-offset-2 font-bold hover:text-[var(--color-violet)]"
          >
            akshathkumar.work@gmail.com
          </a>
          . Always verify anything important on official {INSTITUTE.short} channels
          before acting on it.
        </p>
      </Panel>

      <Panel className="pad-page border-l-6 border-l-[var(--color-violet)]">
        <h2 className="t-section">PRIVACY</h2>
        <ul className="t-body font-normal mt-2 space-y-1.5">
          <li>· Your board, attendance, grades and profile are stored on this device only (localStorage).</li>
          <li>· No sign-in, no account, no server, no analytics. Nothing you type is uploaded.</li>
          <li>· Clearing your browser data deletes everything — export a backup from Student Tools.</li>
        </ul>
      </Panel>

      <Panel className="pad-page border-l-6 border-l-[var(--color-violet)]">
        <h2 className="t-section">CREDITS</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="board pad-page">
            <p className="t-meta muted">{credit.role}</p>
            <p className="t-card-title mt-1.5" style={{ fontSize: 20 }}>{credit.name}</p>
            <p className="t-meta muted mt-1 normal-case">{credit.detail}</p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href={credit.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="btn !p-2 cursor-pointer"
              >
                <LinkedInIcon />
              </a>
              <a
                href={credit.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="btn !p-2 cursor-pointer"
              >
                <InstagramIcon />
              </a>
            </div>
          </div>

          <div className="board pad-page">
            <p className="t-meta muted">{INSPIRED_BY.role}</p>
            <p className="t-card-title mt-1.5" style={{ fontSize: 20 }}>{INSPIRED_BY.name}</p>
            <a
              href={INSPIRED_BY.url}
              target="_blank"
              rel="noreferrer"
              className="t-meta muted mt-1 inline-block normal-case underline underline-offset-2 hover:text-[var(--color-violet)]"
            >
              {INSPIRED_BY.url}
            </a>
          </div>
        </div>
      </Panel>

      <Panel
        className="pad-page"
        style={{ borderLeftWidth: 6, borderLeftColor: 'var(--color-violet)' }}
      >
        <p className="t-meta">
          DATA NOTE — ALL BRANCHES, HOSTELS, LANDMARKS AND FORMULAS ARE VERIFIED FOR NIT KURUKSHETRA.
          TIMETABLES AND CALENDARS CAN BE CUSTOMIZED FREELY OR POPULATED IN CONTENT/.
        </p>
      </Panel>
    </Shell>
  )
}
