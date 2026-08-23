// Single source of truth for the user-facing accent palette (rules.md §1.2).
//
// Every color picker in the app (profile badge, subjects, timetable sessions,
// calendar) should render from ACCENTS rather than keeping its own list —
// that's what let the palette drift into five slightly different arrays
// before this file existed.
//
// `ink` is a CSS variable, not a literal hex, so contrast stays correct across
// light/dark automatically (fuchsia is the one accent whose ink actually flips
// between themes).
export const ACCENTS = [
  { key: 'amber', label: 'Amber', value: 'var(--color-amber)', ink: 'var(--color-amber-ink)' },
  { key: 'acid', label: 'Acid', value: 'var(--color-acid)', ink: 'var(--color-acid-ink)' },
  { key: 'teal', label: 'Teal', value: 'var(--color-teal)', ink: 'var(--color-teal-ink)' },
  { key: 'sky', label: 'Blue', value: 'var(--color-sky)', ink: 'var(--color-sky-ink)' },
  { key: 'violet', label: 'Violet', value: 'var(--color-violet)', ink: 'var(--color-violet-ink)' },
  { key: 'coral', label: 'Red', value: 'var(--color-coral)', ink: 'var(--color-coral-ink)' },
  { key: 'orange', label: 'Orange', value: 'var(--color-orange)', ink: 'var(--color-orange-ink)' },
  { key: 'fuchsia', label: 'Fuchsia', value: 'var(--color-fuchsia)', ink: 'var(--color-fuchsia-ink)' },
  { key: 'lime', label: 'Lime', value: 'var(--color-lime)', ink: 'var(--color-lime-ink)' },
]

const ACCENT_BY_VALUE = new Map(ACCENTS.map((a) => [a.value, a]))

// Raw hex values that predate the CSS-variable accents above. Old profiles /
// subjects / sessions saved before this refactor can still hand these back —
// each maps to a fixed ink so they keep rendering legibly instead of falling
// through to a guess.
const LEGACY_HEX_INK = {
  '#111827': '#ffffff',
  '#305CDE': '#ffffff',
  '#4f46e5': '#ffffff',
  '#6C3BAA': '#ffffff',
  '#E60000': '#ffffff',
  '#AB2330': '#ffffff',
  '#36DA45': '#111111',
  '#f4f1e8': '#111111',
  '#faf7f0': '#111111',
  '#ffffff': '#111111',
}

// Non-accent CSS vars that also show up as a saved avatar/session color and
// always want the same fixed ink regardless of theme.
const STATIC_INK = {
  'var(--disruption)': '#ffffff',
}

/** Ink (text/icon) color for any accent fill, including legacy raw hex. */
export function inkFor(value) {
  if (!value) return 'var(--on-accent)'
  const accent = ACCENT_BY_VALUE.get(value)
  if (accent) return accent.ink
  if (LEGACY_HEX_INK[value]) return LEGACY_HEX_INK[value]
  if (STATIC_INK[value]) return STATIC_INK[value]
  return 'var(--on-accent)'
}

/** {background, color} pair for a solid accent fill. */
export function fillStyle(value) {
  return { background: value, color: inkFor(value) }
}

/**
 * Returns the theme token pair and label for any subject / timetable session.
 * 
 * Rules:
 *  - Lab subjects -> Red (`var(--color-coral)`)
 *  - Maths subjects -> Green (`var(--color-acid)`)
 *  - Core CS subjects -> Blue (`var(--color-sky)`)
 *  - Explicit session/subject accent overrides take precedence when configured.
 */
export function getSubjectTheme(sessionOrCourse = {}) {
  if (!sessionOrCourse) {
    return {
      accent: 'var(--color-sky)',
      bgPill: 'var(--color-sky)',
      ink: 'var(--on-accent)',
      label: 'LECTURE',
    }
  }

  // Break / Recess session
  if (sessionOrCourse.type === 'break') {
    const accent = sessionOrCourse.accent || 'var(--color-violet)'
    return {
      accent,
      bgPill: accent,
      ink: 'var(--on-accent)',
      label: 'BREAK',
    }
  }

  // Explicit custom accent override chosen by the student
  if (sessionOrCourse.accent) {
    const ink = inkFor(sessionOrCourse.accent)
    const label = (sessionOrCourse.category || sessionOrCourse.type || 'COURSE').toUpperCase()
    return {
      accent: sessionOrCourse.accent,
      bgPill: sessionOrCourse.accent,
      ink,
      label,
    }
  }

  const type = (sessionOrCourse.type || '').toLowerCase()
  const name = (sessionOrCourse.name || '').toUpperCase()
  const code = (sessionOrCourse.code || '').toUpperCase()
  const category = (sessionOrCourse.category || '').toUpperCase()
  const combined = `${code} ${name} ${category}`

  // 1. Lab Subjects -> RED (var(--color-coral))
  const isLab =
    type === 'lab' ||
    category === 'LAB' ||
    category === 'PRACTICAL' ||
    name.includes('LAB') ||
    name.includes('PRACTICAL') ||
    code.includes('(P)') ||
    code.includes('-P') ||
    code.includes('(LAB)') ||
    code.includes('LAB')

  if (isLab) {
    return {
      accent: 'var(--color-coral)',
      bgPill: 'var(--color-coral)',
      ink: 'var(--on-accent)',
      label: 'LAB',
    }
  }

  // 2. Maths Subjects -> GREEN (var(--color-acid))
  const isMaths =
    category === 'MATHS' ||
    category === 'MATHEMATICS' ||
    combined.includes('MATH') ||
    combined.includes('DISCRETE') ||
    combined.includes('STAT') ||
    combined.includes('NUMERICAL') ||
    combined.includes('OPTIMIZ') ||
    combined.includes('ALGEBRA') ||
    combined.includes('CALCULUS') ||
    combined.includes('PROBABILITY') ||
    combined.includes('DIFFERENTIAL') ||
    code.startsWith('MA-') ||
    code.startsWith('MAIC') ||
    code.startsWith('MAIR') ||
    code.startsWith('MNC') ||
    code.startsWith('MAC')

  if (isMaths) {
    return {
      accent: 'var(--color-acid)',
      bgPill: 'var(--color-acid)',
      ink: 'var(--on-accent)',
      label: 'MATHS',
    }
  }

  // 3. Core CS Subjects -> BLUE (var(--color-sky))
  const isCoreCS =
    category === 'CORE CS' ||
    category === 'CSE' ||
    category === 'IT' ||
    category === 'AI' ||
    category === 'DS' ||
    combined.includes('DATA STRUCT') ||
    combined.includes('ALGORITHM') ||
    combined.includes('OBJECT-ORIENT') ||
    combined.includes('OOP') ||
    combined.includes('JAVA') ||
    combined.includes('PYTHON') ||
    combined.includes('C++') ||
    combined.includes('SOFTWARE') ||
    combined.includes('COMPUTER') ||
    combined.includes('ORGANIZATION') ||
    combined.includes('ARCHITECTURE') ||
    combined.includes('OPERATING SYSTEM') ||
    combined.includes('DATABASE') ||
    combined.includes('DBMS') ||
    combined.includes('NETWORK') ||
    combined.includes('IOT') ||
    combined.includes('INTERNET OF THINGS') ||
    combined.includes('COMPILER') ||
    combined.includes('THEORY OF COMPUT') ||
    combined.includes('AUTOMATA') ||
    combined.includes('INTELLIGENCE') ||
    combined.includes('MACHINE LEARN') ||
    combined.includes('DATA SCIENCE') ||
    combined.includes('KNOWLEDGE REPRESENT') ||
    combined.includes('CYBER') ||
    combined.includes('SECURITY') ||
    combined.includes('CLOUD') ||
    combined.includes('DISTRIBUTED') ||
    combined.includes('PROGRAMMING') ||
    code.startsWith('CS') ||
    code.startsWith('CSP') ||
    code.startsWith('CSPC') ||
    code.startsWith('IT') ||
    code.startsWith('ITP') ||
    code.startsWith('ITPC') ||
    code.startsWith('DS') ||
    code.startsWith('DSP') ||
    code.startsWith('DSPC') ||
    code.startsWith('AI') ||
    code.startsWith('AIP') ||
    code.startsWith('AIPC') ||
    code.startsWith('CO') ||
    code.startsWith('CP') ||
    code.startsWith('SE')

  if (isCoreCS) {
    return {
      accent: 'var(--color-sky)',
      bgPill: 'var(--color-sky)',
      ink: 'var(--on-accent)',
      label: 'CORE CS',
    }
  }

  // 4. Other Academic Disciplines
  if (type === 'tutorial' || category === 'TUTORIAL') {
    return {
      accent: 'var(--color-teal)',
      bgPill: 'var(--color-teal)',
      ink: 'var(--on-accent)',
      label: 'TUTORIAL',
    }
  }

  if (combined.includes('ELECT') || combined.includes('DIGITAL') || code.startsWith('EC') || code.startsWith('EE')) {
    return {
      accent: 'var(--color-amber)',
      bgPill: 'var(--color-amber)',
      ink: 'var(--on-accent)',
      label: 'CIRCUITS',
    }
  }

  if (combined.includes('PHYS') || combined.includes('CHEM') || combined.includes('ENVIR') || code.startsWith('PH') || code.startsWith('CH')) {
    return {
      accent: 'var(--color-violet)',
      bgPill: 'var(--color-violet)',
      ink: 'var(--on-accent)',
      label: 'SCIENCE',
    }
  }

  if (combined.includes('ECON') || combined.includes('COMM') || combined.includes('HSM') || combined.includes('MANAG')) {
    return {
      accent: 'var(--color-teal)',
      bgPill: 'var(--color-teal)',
      ink: 'var(--on-accent)',
      label: 'HUMANITIES',
    }
  }

  return {
    accent: 'var(--color-sky)',
    bgPill: 'var(--color-sky)',
    ink: 'var(--on-accent)',
    label: 'LECTURE',
  }
}

