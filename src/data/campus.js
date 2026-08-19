// ---------------------------------------------------------------------------
// CAMPUS REFERENCE — generated from content/campus/*.md
//
// Do not edit the lists here. Edit:
//   content/campus/branches.md
//   content/campus/hostels.md
// and the JSON below is rebuilt on the next dev save or build.
//
// What stays hand-written in this file is presentation, not data: session
// types, their colours, and the fallbacks used before a student has picked
// anything.
// ---------------------------------------------------------------------------

import campus from './generated/campus.json'

export const BRANCHES = campus.branches
export const HOSTELS = campus.hostels
export const YEARS = ['1', '2', '3', '4']

export const SESSION_TYPES = [
  { value: 'lecture', label: 'Lecture' },
  { value: 'lab', label: 'Lab' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'break', label: 'Break' },
  { value: 'other', label: 'Other' },
]

export const TYPE_STYLE = {
  lecture: { bg: 'var(--color-sky)', label: 'LECTURE' },
  lab: { bg: 'var(--color-violet)', label: 'LAB' },
  tutorial: { bg: 'var(--color-teal)', label: 'TUTORIAL' },
  break: { bg: 'transparent', label: 'BREAK' },
  other: { bg: 'var(--color-amber)', label: 'OTHER' },
}

export function branchName(code) {
  return BRANCHES.find((b) => b.code === code)?.name ?? code
}

export function hostelName(code) {
  return HOSTELS.find((h) => h.code === code)?.name ?? code
}

// Fallbacks for a profile that has not been filled in yet. Derived from the
// content rather than hardcoded, so removing a branch from branches.md can
// never leave the app pointing at one that does not exist.
export const DEFAULT_BRANCH = BRANCHES[0]?.code ?? 'CSE'
export const DEFAULT_HOSTEL = HOSTELS[0]?.code ?? 'CVR'
export const DEFAULT_YEAR = '1'
