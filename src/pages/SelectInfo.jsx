import { Link } from 'react-router-dom'
import { DoorOpen, FileText, Info, Map, ShieldQuestion, User, Wrench } from 'lucide-react'
import PlainShell from '../components/PlainShell'
import { Eyebrow } from '../ui'

const TILES = [
  { to: '/profile', icon: User, title: 'EDIT PROFILE', sub: 'NAME, BRANCH & HOSTEL' },
  { to: '/rollcall', icon: ShieldQuestion, title: 'ROLL CALL', sub: 'ATTENDANCE TRACKER' },
  { to: '/tools', icon: Wrench, title: 'STUDENT TOOLS', sub: 'SKIP GUARD, CGPA, BACKUP' },
  { to: '/rooms', icon: DoorOpen, title: 'FREE NOW', sub: 'OPEN ROOM CHECKER' },
  { to: '/pyq', icon: FileText, title: 'PYQ BROWSER', sub: 'PREVIOUS YEAR QUESTIONS' },
  { to: '/map', icon: Map, title: 'CAMPUS MAP', sub: 'NAVIGATE THE CAMPUS' },
  { to: '/campus', icon: Info, title: 'NITKKR INFO', sub: 'CALENDAR & CONTACTS' },
  { to: '/about', icon: ShieldQuestion, title: 'ABOUT', sub: 'UNOFFICIAL COMPANION' },
]

export default function SelectInfo() {
  return (
    <PlainShell back="/">
      <Eyebrow icon={Info}>INFO SELECTION</Eyebrow>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <h1 className="heading text-5xl sm:text-6xl">
          Select
          <br />
          your info
        </h1>
        <p className="label muted max-w-xs sm:text-right">
          EDIT YOUR PROFILE, OPEN THE TOOLKIT, OR JUMP TO CAMPUS TOOLS.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="board board-hard flex items-start gap-3 p-4 transition-transform hover:-translate-y-0.5"
          >
            <t.icon size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              <span className="heading block text-base">{t.title}</span>
              <span className="label muted mt-1 block">{t.sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </PlainShell>
  )
}
