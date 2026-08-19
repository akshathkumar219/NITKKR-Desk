import { Link } from 'react-router-dom'
import {
  DoorOpen,
  FileText,
  Info,
  Map,
  ShieldQuestion,
  User,
  Wrench,
} from 'lucide-react'
import Shell from '../components/Shell'
import { Panel } from '../ui'

const TILES = [
  {
    to: '/profile',
    icon: User,
    title: 'EDIT PROFILE',
    sub: 'NAME, BRANCH, HOSTEL',
    bg: 'var(--color-violet)',
  },
  {
    to: '/tools',
    icon: Wrench,
    title: 'STUDENT TOOLS',
    sub: 'SKIP GUARD, CGPA, LINKS, BACKUP',
    bg: 'var(--color-acid)',
  },
  {
    to: '/rooms',
    icon: DoorOpen,
    title: 'FREE NOW',
    sub: 'OPEN ROOM CHECKER',
    bg: 'var(--color-teal)',
  },
  {
    to: '/pyq',
    icon: FileText,
    title: 'PYQ BROWSER',
    sub: 'PREVIOUS YEAR QUESTIONS',
    bg: 'var(--color-amber)',
  },
  {
    to: '/map',
    icon: Map,
    title: 'CAMPUS MAP',
    sub: 'FIND YOUR WAY AROUND',
    bg: 'var(--color-coral)',
  },
  {
    to: '/campus',
    icon: Info,
    title: 'NITKKR INFO',
    sub: 'CALENDAR, HELPLINE, LINKS',
    bg: 'var(--surface)',
  },
  {
    to: '/about',
    icon: ShieldQuestion,
    title: 'ABOUT',
    sub: 'DISCLAIMER & PRIVACY',
    bg: 'var(--surface)',
  },
]

export default function InfoHub() {
  return (
    <Shell>
      <Panel className="p-5 sm:p-6">
        <p className="label muted">INFO HUB</p>
        <h1 className="heading mt-2 text-3xl sm:text-4xl">Everything in one place</h1>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="board board-hard block p-5 transition-transform hover:-translate-y-0.5"
            style={{ background: t.bg, color: 'var(--color-ink)' }}
          >
            <t.icon size={22} strokeWidth={2.5} aria-hidden />
            <p className="heading mt-8 text-xl">{t.title}</p>
            <p className="label mt-1.5 opacity-70">{t.sub}</p>
          </Link>
        ))}
      </div>
    </Shell>
  )
}
