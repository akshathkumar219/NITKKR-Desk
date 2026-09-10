/**
 * Notification feed for NITKKR DESK.
 * Release updates (Version 1.0 to 1.5).
 */

export const NOTIFICATIONS = [
  {
    id: 'update-v1-5',
    version: '1.5',
    isNew: true,
    title: 'Version 1.5',
    accentColor: 'var(--color-acid)',
    summary: 'Updated Academic Calendar, PYQs uploaded, Dashboard redesigned, and bug fixes.',
    details: [
      'Updated Academic Calendar',
      'PYQs uploaded',
      'Dashboard redesigned',
      'Fixed minor bugs',
    ],
  },
  {
    id: 'update-v1-4',
    version: '1.4',
    isNew: false,
    title: 'Version 1.4',
    accentColor: 'var(--color-sky)',
    summary: 'Mobile notification deck, layout polish, and bug fixes.',
    details: [
      'Added mobile notifications page for app updates and version releases',
      'Added 3rd notification bell button on mobile masthead with unread indicator',
      'Space-saving dropdown details for version changelogs',
      'Cleaned mobile layout and fixed minor bugs',
    ],
  },
  {
    id: 'update-v1-3',
    version: '1.3',
    isNew: false,
    title: 'Version 1.3',
    accentColor: 'var(--color-amber)',
    summary: 'Timetable overhaul across all years and Hostel 7 mess menu.',
    details: [
      'Fixed timetable for 1st Year Civil, PIE, EE, Mechanical',
      'Timetable updated for All 2nd year branches',
      'Timetable updated for All 3rd year except Civil and VLSI',
      'Timetable updated for 4th year - AIML, CSE, ECE, IT, Mech, MNC, PIE',
      'Added menu of H7',
      'Fixed Export/Import and other small bugs',
    ],
  },
  {
    id: 'update-v1-2',
    version: '1.2',
    isNew: false,
    title: 'Version 1.2',
    accentColor: 'var(--color-violet)',
    summary: '1st Year timetables, guide page enhancements, and auto-update.',
    details: [
      'Updated Timetable for 1st Year (All Branches)',
      'Updated Guide Page with storage rules and best practices',
      'Fixed Export Button for local backups',
      'Auto-update detection added for PWA',
      "Fixed back button bug ~ Avdhoot (MNC'29)",
    ],
  },
  {
    id: 'update-v1-1',
    version: '1.1',
    isNew: false,
    title: 'Version 1.1',
    accentColor: 'var(--color-coral)',
    summary: 'IT branch academic refresh, girls hostels, and Cauvery & H4 mess menus.',
    details: [
      'Updated IT branch data — refreshed academic data for the IT branch',
      'Updated H4 mess data — filled in the H4 hostel mess menu (was placeholder)',
      "Added girls hostels — added girls' hostel options to the hostel list",
      'Added Cauvery mess menu — filled in the Cauvery hostel mess menu (was placeholder)',
      'Fixed Attendance page bug — resolved a bug on the Attendance page',
    ],
  },
  {
    id: 'update-v1-0',
    version: '1.0',
    isNew: false,
    title: 'Version 1.0',
    accentColor: 'var(--color-teal, #35D5F0)',
    summary: 'Initial launch of the student companion for NIT Kurukshetra.',
    details: [
      'Interactive weekly timetable and classroom session tracker',
      'Attendance tracker with bunk prediction and target cutoff calculation',
      'Hostel mess menus and live current meal detection',
      'Campus landmarks with Google Maps navigation and academic calendar',
      '100% private, device-only storage (no login required)',
    ],
  },
]
