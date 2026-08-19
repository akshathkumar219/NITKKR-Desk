// ---------------------------------------------------------------------------
// CAMPUS REFERENCE DATA — NIT Kurukshetra
//
// PLACEHOLDER WARNING
// Branch and hostel lists below are a best-effort starting point and have NOT
// been verified against official NITKKR sources. Check them against the
// institute website before you ship, and edit freely — nothing else in the
// codebase hardcodes these values.
// ---------------------------------------------------------------------------

export const BRANCHES = [
  { code: 'CSE', name: 'Computer Engineering', group: 'ENGINEERING' },
  { code: 'IT', name: 'Information Technology', group: 'ENGINEERING' },
  { code: 'ECE', name: 'Electronics & Communication', group: 'ENGINEERING' },
  { code: 'EE', name: 'Electrical Engineering', group: 'ENGINEERING' },
  { code: 'MECH', name: 'Mechanical Engineering', group: 'ENGINEERING' },
  { code: 'CIVIL', name: 'Civil Engineering', group: 'ENGINEERING' },
  { code: 'PIE', name: 'Production & Industrial', group: 'ENGINEERING' },
  { code: 'CHEM', name: 'Chemical Engineering', group: 'ENGINEERING' },
  { code: 'META', name: 'Metallurgical & Materials', group: 'ENGINEERING' },
  { code: 'MNC', name: 'Mathematics & Computing', group: 'SCIENCES' },
  { code: 'PHY', name: 'Engineering Physics', group: 'SCIENCES' },
]

export const YEARS = ['1', '2', '3', '4']

export const HOSTELS = [
  { code: 'CVR', name: 'C.V. Raman Hostel' },
  { code: 'HJB', name: 'H.J. Bhabha Hostel' },
  { code: 'APJ', name: 'A.P.J. Abdul Kalam Hostel' },
  { code: 'JCB', name: 'J.C. Bose Hostel' },
  { code: 'SNB', name: 'S.N. Bose Hostel' },
  { code: 'KLP', name: 'Kalpana Chawla Hostel' },
  { code: 'GRG', name: 'Gargi Hostel' },
]

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

export const DEFAULT_BRANCH = 'CSE'
export const DEFAULT_HOSTEL = 'CVR'
export const DEFAULT_YEAR = '2'
