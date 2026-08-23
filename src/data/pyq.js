// ---------------------------------------------------------------------------
// PREVIOUS YEAR QUESTIONS — generated from content/pyq/*.md
//
// One file per academic session: content/pyq/2024-25.md
// Put a view-only link in the URL column. Do not host papers you do not have
// permission to redistribute.
// ---------------------------------------------------------------------------

import generated from './generated/pyq.json'

/**
 * The three exam sittings. Kept in sync with EXAMS in
 * scripts/content/datasets.mjs — that file validates the `Exam` column and
 * writes these ids into the JSON.
 */
export const PYQ_EXAMS = [
  { id: 'MID1', label: 'MID SEM 1' },
  { id: 'MID2', label: 'MID SEM 2' },
  { id: 'END', label: 'END SEM' },
]

export const PYQ_YEARS = generated.map((s) => ({
  id: s.session,
  label: s.session,
  sub: s.sub ?? '',
  available: s.available,
}))

export const PYQ_PAPERS = Object.fromEntries(generated.map((s) => [s.session, s.papers]))

export function papersFor(session) {
  return PYQ_PAPERS[session] ?? []
}
