// ---------------------------------------------------------------------------
// PREVIOUS YEAR QUESTIONS — generated from content/pyq/*.md
//
// One file per academic session/year: content/pyq/2026.md
// Put a view-only link in the URL column.
// ---------------------------------------------------------------------------

import generated from './generated/pyq.json' with { type: 'json' }

/**
 * Exam sittings. Supports MST1, MST2, and END SEM.
 */
export const PYQ_EXAMS = [
  { id: 'ALL', label: 'ALL EXAMS', badge: 'EXAM' },
  { id: 'MID1', label: 'MST 1', badge: 'MST 1', color: 'var(--color-sky)' },
  { id: 'MID2', label: 'MST 2', badge: 'MST 2', color: 'var(--color-amber)' },
  { id: 'END', label: 'END SEM', badge: 'END SEM', color: 'var(--color-lime)' },
]

export const PYQ_YEARS = generated.map((s) => ({
  id: s.session,
  label: s.session,
  sub: s.sub ?? '',
  available: s.available,
}))

export const PYQ_PAPERS = Object.fromEntries(generated.map((s) => [s.session, s.papers]))

export const ALL_PAPERS = generated.flatMap((s) =>
  (s.papers || []).map((p) => ({ ...p, session: s.session })),
)

export function papersFor(session) {
  if (!session || session === 'ALL') return ALL_PAPERS
  return PYQ_PAPERS[session] ?? []
}

export function semestersForYear(year) {
  switch (String(year)) {
    case '1':
      return ['1', '2']
    case '2':
      return ['3', '4']
    case '3':
      return ['5', '6']
    case '4':
      return ['7', '8']
    default:
      return ['1', '2', '3', '4', '5', '6', '7', '8']
  }
}

export function yearForSemester(sem) {
  const s = parseInt(sem, 10)
  if (s <= 2) return '1'
  if (s <= 4) return '2'
  if (s <= 6) return '3'
  if (s <= 8) return '4'
  return 'ALL'
}

const BRANCH_ALIASES = {
  CSE: ['CSE', 'CS', 'CSC', 'COE'],
  IT: ['IT'],
  AIML: ['AIML', 'AI & ML', 'AI'],
  AIDS: ['AIDS', 'DS', 'AD'],
  MNC: ['MNC', 'M&C', 'MAPC'],
  IIOT: ['IIOT', 'IIPC'],
  ECE: ['ECE'],
  EE: ['EE'],
  MECH: ['MECH', 'ME'],
  CIVIL: ['CIVIL', 'CE'],
  PIE: ['PIE'],
  VLSI: ['VLSI'],
  RA: ['RA'],
  SE: ['SE'],
  ARCH: ['ARCH'],
}

const CODE_PREFIX_MAP = {
  CS: 'CSE',
  IT: 'IT',
  AI: 'AIML',
  AD: 'AIDS',
  DS: 'AIDS',
  MA: 'MNC',
  II: 'IIOT',
  EC: 'ECE',
  EE: 'EE',
  ME: 'MECH',
  CE: 'CIVIL',
  PI: 'PIE',
  RA: 'RA',
  MV: 'VLSI',
  SE: 'SE',
}

export function paperMatchesBranch(paper, branchCode) {
  if (!branchCode || branchCode === 'ALL') return true

  const target = branchCode.toUpperCase()
  const pBranch = (paper.branch || '').toUpperCase()

  // 1. Common 1st year institute core or tagged ALL
  if (pBranch === 'ALL' || pBranch === 'ALL_BRANCHES') return true

  const aliases = BRANCH_ALIASES[target] || [target]

  // 2. Direct branch matches
  if (pBranch) {
    const paperBranches = pBranch.split(/[/,]/).map((b) => b.trim())
    if (paperBranches.some((b) => aliases.includes(b))) return true
  }

  // 3. 1st year Institute Core fallback (*IC-*)
  const code = (paper.code || '').toUpperCase()
  const sem = String(paper.sem || '').trim()
  if (['1', '2'].includes(sem)) {
    if (['CHIC', 'CSIC', 'HSIC', 'PHIC', 'MEIC'].some((ic) => code.startsWith(ic))) {
      return true
    }
    if (code.startsWith('MAIC') && ['1', '2'].includes(sem)) {
      return true
    }
  }

  // 4. Code prefix fallback
  const prefix = code.slice(0, 2)
  const mappedBranch = CODE_PREFIX_MAP[prefix]
  if (mappedBranch && aliases.includes(mappedBranch)) {
    return true
  }

  return false
}
