import { DoorOpen, FileText, Info, Map, ShieldQuestion, User, Wrench, ClipboardCheck } from 'lucide-react'

// One source for both hub screens. /info (inside the app shell) and
// /select/info (pre-onboarding) were maintaining near-identical tile lists
// that had already drifted apart — 7 tiles versus 8, with different
// descriptions for the same destinations.
//
// `neutral` marks a tile with no accent fill. It matters: accent tiles carry
// --color-ink text because their fill is a bright pastel in both themes, but
// a neutral tile sits on --surface, which is near-black in dark mode. Painting
// ink on it produced black-on-navy.
export const HUB_TILES = [
  {
    to: '/profile',
    icon: User,
    title: 'EDIT PROFILE',
    sub: 'NAME, BRANCH & HOSTEL',
    bg: 'var(--color-violet)',
  },
  {
    to: '/rollcall',
    icon: ClipboardCheck,
    title: 'ROLL CALL',
    sub: 'ATTENDANCE TRACKER',
    bg: 'var(--color-acid)',
  },
  {
    to: '/tools',
    icon: Wrench,
    title: 'STUDENT TOOLS',
    sub: 'SKIP GUARD, CGPA, BACKUP',
    bg: 'var(--color-teal)',
  },
  {
    to: '/rooms',
    icon: DoorOpen,
    title: 'FREE NOW',
    sub: 'OPEN ROOM CHECKER',
    bg: 'var(--color-sky)',
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
    sub: 'NAVIGATE THE CAMPUS',
    bg: 'var(--color-coral)',
  },
  { to: '/campus', icon: Info, title: 'NITKKR INFO', sub: 'CALENDAR & CONTACTS', neutral: true },
  {
    to: '/about',
    icon: ShieldQuestion,
    title: 'ABOUT',
    sub: 'UNOFFICIAL COMPANION',
    neutral: true,
  },
]

/** Fill and foreground for a hub tile, kept together so they cannot drift. */
export function tileStyle(tile) {
  return tile.neutral
    ? { background: 'var(--surface)', color: 'var(--text)' }
    : { background: tile.bg, color: 'var(--color-ink)' }
}
