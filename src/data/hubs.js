import { BookOpen, Calculator, Compass, FileText, Info, Landmark, Map, User } from 'lucide-react'

// One source for both hub screens. /info (inside the app shell) and
// /select/info (pre-onboarding).
//
// `neutral` marks a tile with no accent fill. It matters: accent tiles carry
// --color-ink text because their fill is a bright pastel in both themes, but
// a neutral tile sits on --surface, which is near-black in dark mode.
export const HUB_TILES = [
  {
    to: '/profile',
    icon: User,
    title: 'EDIT PROFILE',
    sub: 'NAME, BRANCH & HOSTEL',
    bg: 'var(--color-amber)',
  },
  {
    to: '/calculator',
    icon: Calculator,
    title: 'CGPA CALCULATOR',
    sub: 'SGPA & TARGET FORECASTER',
    bg: 'var(--color-coral)',
  },
  {
    to: '/subjects',
    icon: BookOpen,
    title: 'SUBJECTS',
    sub: 'SYLLABUS, MARKS & ATTENDANCE',
    bg: 'var(--color-acid)',
  },
  {
    to: '/pyq',
    icon: FileText,
    title: 'PYQS',
    sub: 'PREVIOUS YEAR QUESTIONS',
    bg: 'var(--color-fuchsia)',
  },
  {
    to: '/map',
    icon: Map,
    title: 'MAP',
    sub: 'CAMPUS & KURUKSHETRA PLACES',
    bg: 'var(--color-orange)',
  },
  {
    to: '/campus',
    icon: Landmark,
    title: 'NITKKR INFO',
    sub: 'CALENDAR & CONTACTS',
    bg: 'var(--color-teal)',
  },
]

// Help tiles. Only /info renders these: on mobile there is no sidebar, so the
// hub is the only route to GUIDE and ABOUT. Pre-onboarding (/select/info)
// deliberately keeps to HUB_TILES.
export const HELP_TILES = [
  {
    to: '/guide',
    icon: Compass,
    title: 'GUIDE',
    sub: 'HOW TO USE THIS DESK',
    bg: 'var(--color-lime)',
  },
  {
    to: '/about',
    icon: Info,
    title: 'ABOUT',
    sub: 'WHAT THIS IS & WHO MADE IT',
    bg: 'var(--color-violet)',
  },
]

/** Fill and foreground for a hub tile, kept together so they cannot drift. */
export function tileStyle(tile) {
  if (tile.neutral) {
    return { background: 'var(--surface)', color: 'var(--text)' }
  }
  // Hub tiles are fixed navigation cards, not a user-selectable accent
  // picker, so they follow the Universal Text-on-Accent Rule (white in
  // light mode, black in dark mode) rather than each hue's own -ink token.
  return { background: tile.bg, color: 'var(--on-accent)' }
}
