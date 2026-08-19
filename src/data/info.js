// ---------------------------------------------------------------------------
// STATIC CAMPUS CONTENT — PLACEHOLDER DATA
//
// Calendar dates, phone numbers and landmark coordinates below are INVENTED
// placeholders. Verify every one against official NITKKR sources before you
// publish — a wrong emergency number is worse than no number.
// ---------------------------------------------------------------------------

export const INSTITUTE = {
  name: 'National Institute of Technology Kurukshetra',
  short: 'NIT Kurukshetra',
  address: 'Thanesar, Kurukshetra, Haryana 136119',
  established: '1963',
  campus: '300 ACRES',
  location: 'KURUKSHETRA, HR',
  website: 'https://nitkkr.ac.in/',
  blurb:
    'NIT Kurukshetra is an Institute of National Importance with a large residential campus, established in 1963 as Regional Engineering College Kurukshetra.',
}

export const CALENDAR = {
  title: 'ODD SEMESTER 2026-27',
  audience: 'B.Tech (3rd, 5th & 7th sem), M.Tech (3rd sem) & Ph.D. scholars',
  note: 'PLACEHOLDER — REPLACE WITH THE OFFICIAL NITKKR ACADEMIC CALENDAR',
  events: [
    { label: 'REGISTRATION', value: 'JUL 20 – 24, 2026', category: 'REGISTRATION' },
    { label: 'CLASSES BEGIN', value: 'JUL 27, 2026 (MON)', category: 'CLASSES' },
    { label: 'MID-TERM EXAMS', value: 'SEP 21 – 26, 2026', category: 'EXAMS' },
    { label: 'CLASSES END', value: 'NOV 20, 2026 (FRI)', category: 'CLASSES' },
    { label: 'END-TERM EXAMS', value: 'NOV 27 – DEC 08, 2026', category: 'EXAMS' },
    { label: 'RESULT DECLARATION', value: 'DEC 22, 2026', category: 'GRADES' },
    { label: 'WINTER BREAK', value: 'DEC 10, 2026 – JAN 03, 2027', category: 'BREAKS' },
    { label: 'NEXT SEMESTER BEGINS', value: 'JAN 04, 2027 (MON)', category: 'CLASSES' },
  ],
}

export const CALENDAR_CATEGORIES = [
  'ALL',
  'REGISTRATION',
  'CLASSES',
  'EXAMS',
  'GRADES',
  'BREAKS',
]

export const HELPLINE = [
  { label: 'CAMPUS SECURITY', value: 'VERIFY & ADD' },
  { label: 'MEDICAL EMERGENCY', value: '112' },
  { label: 'HEALTH CENTRE', value: 'VERIFY & ADD' },
  { label: 'STUDENT COUNSELLOR', value: 'SEE NOTICE BOARD' },
]

export const QUICK_LINKS = [
  { label: 'INSTITUTE WEBSITE', url: 'https://nitkkr.ac.in/' },
  { label: 'ACADEMIC SECTION', url: 'https://nitkkr.ac.in/' },
  { label: 'CENTRAL LIBRARY', url: 'https://nitkkr.ac.in/' },
  { label: 'TRAINING & PLACEMENT', url: 'https://nitkkr.ac.in/' },
]

export const USEFUL_LINKS = [
  {
    tag: 'CAMPUS',
    title: 'NITKKR OFFICIAL',
    description: 'Notices, academics and campus updates',
    url: 'https://nitkkr.ac.in/',
  },
  {
    tag: 'LEARN',
    title: 'NPTEL',
    description: 'Free engineering courses and certifications',
    url: 'https://nptel.ac.in/',
  },
  {
    tag: 'LEARN',
    title: 'SWAYAM',
    description: 'Government online learning platform',
    url: 'https://swayam.gov.in/',
  },
  {
    tag: 'DOCS',
    title: 'DIGILOCKER',
    description: 'Store marksheets and certificates securely',
    url: 'https://www.digilocker.gov.in/',
  },
  {
    tag: 'AID',
    title: 'NATIONAL SCHOLARSHIP PORTAL',
    description: 'Apply and track scholarship schemes',
    url: 'https://scholarships.gov.in/',
  },
  {
    tag: 'OFFICIAL',
    title: 'AICTE',
    description: 'Approvals, schemes and student resources',
    url: 'https://www.aicte-india.org/',
  },
]

const maps = (q) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`

export const TRANSPORT = [
  { name: 'KURUKSHETRA JUNCTION', url: maps('Kurukshetra Junction Railway Station') },
  { name: 'KURUKSHETRA BUS STAND', url: maps('Kurukshetra Bus Stand') },
  { name: 'BRAHMA SAROVAR', url: maps('Brahma Sarovar Kurukshetra') },
  { name: 'PIPLI', url: maps('Pipli Kurukshetra') },
  { name: 'CHANDIGARH AIRPORT', url: maps('Chandigarh International Airport') },
]

export const PLACEMENT_CHECKLIST = [
  {
    title: 'RESUME PACK',
    body: 'One-page PDF plus a Drive folder with projects, certificates and transcripts.',
  },
  {
    title: 'DRIVE TRACKER',
    body: 'Company, role, CTC/stipend, eligibility, deadline, test date, interview status.',
  },
  {
    title: 'UPDATE FORMAT',
    body: 'Company | Role | Deadline | Eligible branches | Apply link | Point of contact.',
  },
  {
    title: 'ELIGIBILITY WATCH',
    body: 'CGPA cutoff, backlog rules and branch filters — check before you apply.',
  },
]

export const LANDMARKS = [
  { name: 'MAIN GATE', tag: 'ENTRANCE', query: 'NIT Kurukshetra Main Gate' },
  { name: 'ADMIN BLOCK', tag: 'ADMIN', query: 'NIT Kurukshetra Administrative Block' },
  { name: 'CENTRAL LIBRARY', tag: 'STUDY', query: 'NIT Kurukshetra Central Library' },
  { name: 'LECTURE HALL COMPLEX', tag: 'ACADEMIC', query: 'NIT Kurukshetra Lecture Hall Complex' },
  { name: 'COMPUTER CENTRE', tag: 'ACADEMIC', query: 'NIT Kurukshetra Computer Centre' },
  { name: 'C.V. RAMAN HOSTEL', tag: 'HOSTEL', query: 'NIT Kurukshetra CV Raman Hostel' },
  { name: 'KALPANA CHAWLA HOSTEL', tag: 'HOSTEL', query: 'NIT Kurukshetra Kalpana Chawla Hostel' },
  { name: 'SPORTS COMPLEX', tag: 'SPORTS', query: 'NIT Kurukshetra Sports Complex' },
  { name: 'WORKSHOPS', tag: 'LAB', query: 'NIT Kurukshetra Workshop' },
  { name: 'STUDENT ACTIVITY CENTRE', tag: 'FOOD', query: 'NIT Kurukshetra Student Activity Centre' },
  { name: 'HEALTH CENTRE', tag: 'ADMIN', query: 'NIT Kurukshetra Health Centre' },
  { name: 'OPEN AIR THEATRE', tag: 'SPORTS', query: 'NIT Kurukshetra Open Air Theatre' },
].map((l) => ({ ...l, url: maps(l.query) }))

export const LANDMARK_TAGS = ['ALL', 'ENTRANCE', 'ACADEMIC', 'HOSTEL', 'STUDY', 'LAB', 'SPORTS', 'ADMIN', 'FOOD']

export const MAP_EMBED =
  'https://maps.google.com/maps?q=NIT%20Kurukshetra&t=&z=16&ie=UTF8&iwloc=&output=embed'

export const CREDITS = [
  { role: 'BUILD', name: 'Akshath Kumar', detail: 'Add your branch & year' },
]
