// ---------------------------------------------------------------------------
// TIMETABLES — PLACEHOLDER DATA
//
// Every session below is invented. Replace with real NITKKR timetables.
//
// Shape:
//   timetables[BRANCH][YEAR] = Session[]
//
//   Session = {
//     id:    string   unique and stable — attendance records key off this
//     day:   'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'
//     start: number   minutes since midnight (9:00 AM = 540)
//     end:   number   minutes since midnight
//     name:  string
//     code:  string
//     room:  string   '+' separates parallel rooms, e.g. 'CL1+CL2'
//     group: string   optional batch, e.g. 'A1+A2'
//     type:  'lecture' | 'lab' | 'tutorial' | 'break' | 'other'
//   }
//
// Only CSE Year 2 is filled in, as a working reference. Every other
// branch/year renders the "nothing on the board" empty state, and users can
// still build their own via Edit Board.
// ---------------------------------------------------------------------------

const H = (h, m = 0) => h * 60 + m

const LUNCH = (day) => ({
  id: `lunch-${day}`,
  day,
  start: H(13),
  end: H(14),
  name: 'Lunch Break',
  code: '',
  room: '',
  group: '',
  type: 'break',
})

const CSE_2 = [
  // MON
  { id: 'cse2-mon-1', day: 'MON', start: H(9), end: H(10), name: 'Data Structures', code: 'CSPC-201', room: 'LT-3', group: '', type: 'lecture' },
  { id: 'cse2-mon-2', day: 'MON', start: H(10), end: H(11), name: 'Discrete Mathematics', code: 'CSPC-203', room: 'LT-3', group: '', type: 'lecture' },
  { id: 'cse2-mon-3', day: 'MON', start: H(11), end: H(13), name: 'Data Structures Lab', code: 'CSPC-251', room: 'CL-1+CL-2', group: 'A1+A2', type: 'lab' },
  LUNCH('MON'),
  { id: 'cse2-mon-4', day: 'MON', start: H(14), end: H(15), name: 'Digital Electronics', code: 'ECPC-207', room: 'LT-5', group: '', type: 'lecture' },

  // TUE
  { id: 'cse2-tue-1', day: 'TUE', start: H(9), end: H(10), name: 'Object Oriented Programming', code: 'CSPC-205', room: 'LT-2', group: '', type: 'lecture' },
  { id: 'cse2-tue-2', day: 'TUE', start: H(10), end: H(11), name: 'Data Structures', code: 'CSPC-201', room: 'LT-3', group: '', type: 'lecture' },
  { id: 'cse2-tue-3', day: 'TUE', start: H(11), end: H(12), name: 'Discrete Mathematics Tutorial', code: 'CSPC-203', room: 'TR-4', group: 'A1', type: 'tutorial' },
  LUNCH('TUE'),
  { id: 'cse2-tue-4', day: 'TUE', start: H(14), end: H(16), name: 'Digital Electronics Lab', code: 'ECPC-257', room: 'EL-2', group: 'A3+A4', type: 'lab' },

  // WED
  { id: 'cse2-wed-1', day: 'WED', start: H(9), end: H(10), name: 'Discrete Mathematics', code: 'CSPC-203', room: 'LT-3', group: '', type: 'lecture' },
  { id: 'cse2-wed-2', day: 'WED', start: H(10), end: H(11), name: 'Digital Electronics', code: 'ECPC-207', room: 'LT-5', group: '', type: 'lecture' },
  { id: 'cse2-wed-3', day: 'WED', start: H(11), end: H(12), name: 'Object Oriented Programming', code: 'CSPC-205', room: 'LT-2', group: '', type: 'lecture' },
  LUNCH('WED'),
  { id: 'cse2-wed-4', day: 'WED', start: H(14), end: H(16), name: 'OOP Lab', code: 'CSPC-255', room: 'CL-3+CL-4', group: 'A1+A2+A3+A4', type: 'lab' },

  // THU
  { id: 'cse2-thu-1', day: 'THU', start: H(10), end: H(11), name: 'Data Structures', code: 'CSPC-201', room: 'LT-3', group: '', type: 'lecture' },
  { id: 'cse2-thu-2', day: 'THU', start: H(11), end: H(12), name: 'Economics for Engineers', code: 'HSMC-201', room: 'LT-1', group: '', type: 'lecture' },
  { id: 'cse2-thu-3', day: 'THU', start: H(12), end: H(13), name: 'Object Oriented Programming', code: 'CSPC-205', room: 'LT-2', group: '', type: 'lecture' },
  LUNCH('THU'),
  { id: 'cse2-thu-4', day: 'THU', start: H(15), end: H(16), name: 'Discrete Mathematics', code: 'CSPC-203', room: 'LT-3', group: '', type: 'lecture' },

  // FRI
  { id: 'cse2-fri-1', day: 'FRI', start: H(9), end: H(10), name: 'Economics for Engineers', code: 'HSMC-201', room: 'LT-1', group: '', type: 'lecture' },
  { id: 'cse2-fri-2', day: 'FRI', start: H(10), end: H(11), name: 'Digital Electronics', code: 'ECPC-207', room: 'LT-5', group: '', type: 'lecture' },
  LUNCH('FRI'),
  { id: 'cse2-fri-3', day: 'FRI', start: H(14), end: H(17), name: 'Mini Project', code: 'CSPW-291', room: 'CL-5', group: 'A1+A2+A3+A4', type: 'lab' },
]

export const TIMETABLES = {
  CSE: { 1: [], 2: CSE_2, 3: [], 4: [] },
}

/** Published (non-editable-source) timetable for a branch/year. */
export function baseTimetable(branch, year) {
  return TIMETABLES[branch]?.[year] ?? []
}

/** Every room mentioned anywhere — used by Open Rooms. */
export function allRooms() {
  const set = new Set()
  for (const byYear of Object.values(TIMETABLES)) {
    for (const sessions of Object.values(byYear)) {
      for (const s of sessions) {
        if (!s.room) continue
        s.room.split('+').forEach((r) => set.add(r.trim()))
      }
    }
  }
  return [...set].sort()
}
