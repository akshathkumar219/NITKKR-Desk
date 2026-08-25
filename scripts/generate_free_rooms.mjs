import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const generated = JSON.parse(readFileSync(join(ROOT, 'src/data/generated/timetables.json'), 'utf8'))

function normalizeRoom(r) {
  if (!r) return []
  r = r.trim()
  if (r.includes('/')) return r.split('/').map(normalizeRoom).flat()
  if (r.includes('+')) return r.split('+').map(normalizeRoom).flat()

  const map = {
    'A 311': 'A-311',
    'A311': 'A-311',
    'A210': 'A-210',
    'A321': 'A-321',
    'AB-104': 'AB-104',
    'C-103': 'C-103',
    'C 201': 'C-201',
    'CAD LAB E313': 'CAD Lab (E-313)',
    'CS A1 CR': 'CS A1 CR',
    'CS. Lab': 'CS Lab',
    'Chemistry Dept': 'Chemistry Dept',
    'Digital Design Lab': 'Digital Design Lab',
    'E 101': 'E-101',
    'E-101': 'E-101',
    'E 102': 'E-102',
    'E-102': 'E-102',
    'E 201': 'E-201',
    'E 202': 'E-202',
    'E-202': 'E-202',
    'E 301': 'E-301',
    'E301': 'E-301',
    'E 302': 'E-302',
    'E302': 'E-302',
    'E314': 'E-314',
    '2nd Floor EED': '2nd Floor EED',
    '3rd Floor EED': '3rd Floor EED',
    'EHFF': 'EHFF',
    'EHGF': 'EHGF',
    'Electronics Lab': 'Electronics Lab',
    'Humanities Dept': 'Humanities Dept',
    'Inst. Lab': 'Instrumentation Lab',
    'L1': 'L1',
    'L2': 'L2',
    'L3': 'L3',
    'L4': 'L4',
    'L5': 'L5',
    'L6': 'L6',
    'LAB 1': 'Lab 1',
    'Lab 1': 'Lab 1',
    'LAB 3': 'Lab 3',
    'Lab 3': 'Lab 3',
    'LAB 4': 'Lab 4',
    'LAB 6': 'Lab 6',
    'Lab 6': 'Lab 6',
    'LAB 8': 'Lab 8',
    'LAB 9': 'Lab 9',
    'Lab 9': 'Lab 9',
    'LAB 10': 'Lab 10',
    'Lab 10': 'Lab 10',
    'LHC 101': 'LHC 101',
    'LHC-101': 'LHC 101',
    'LHC 102': 'LHC 102',
    'LHC103': 'LHC 103',
    'LHC 104': 'LHC 104',
    'LHC 105': 'LHC 105',
    'LHC 106': 'LHC 106',
    'LHC 201': 'LHC 201',
    'LHC-201': 'LHC 201',
    'LHC 202': 'LHC 202',
    'LHC 203': 'LHC 203',
    'LHC-203': 'LHC 203',
    'LHC 204': 'LHC 204',
    'LHC 205': 'LHC 205',
    'LHC-205': 'LHC 205',
    'LHC-206': 'LHC 206',
    'LHC301': 'LHC 301',
    'LHC 302': 'LHC 302',
    'LHC-302': 'LHC 302',
    'LHC-303': 'LHC 303',
    'LHC-304': 'LHC 304',
    'LHC 305': 'LHC 305',
    'LHC-306': 'LHC 306',
    'M 103': 'M-103',
    'M-103': 'M-103',
    'M103': 'M-103',
    'M 305': 'M-305',
    'M 306': 'M-306',
    'M 309': 'M-309',
    'MATLAB Lab': 'MATLAB Lab',
    'MCA 304': 'MCA 304',
    'MCA 312': 'MCA 312',
    'MED': 'MED',
    'MLDA Lab': 'MLDA Lab',
    'Physics Dept': 'Physics Dept',
    'S 307': 'S-307',
    'S 310': 'S-310',
    'SSC LAB E220': 'SSC Lab (E-220)',
    'SSC Lab E220': 'SSC Lab (E-220)',
    'Studio 1': 'Studio 1',
    'Studio-I': 'Studio 1',
    'Studio 2': 'Studio 2',
    'Workshop': 'Workshop',
  }
  return [map[r] || r]
}

const periods = [
  { id: 'P1', start: 510, end: 565, label: '08:30 – 09:25' },
  { id: 'P2', start: 565, end: 620, label: '09:25 – 10:20' },
  { id: 'P3', start: 640, end: 695, label: '10:40 – 11:35' },
  { id: 'P4', start: 695, end: 750, label: '11:35 – 12:30' },
  { id: 'P5', start: 750, end: 805, label: '12:30 – 13:25' },
  { id: 'P6', start: 825, end: 880, label: '13:45 – 14:40' },
  { id: 'P7', start: 880, end: 935, label: '14:40 – 15:35' },
  { id: 'P8', start: 935, end: 990, label: '15:35 – 16:30' },
  { id: 'P9', start: 990, end: 1045, label: '16:30 – 17:25' },
  { id: 'P10', start: 1045, end: 1100, label: '17:25 – 18:20' },
]

const dayNames = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
}

const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']

const roomCategories = {
  'Lecture Hall Complex (LHC)': [
    'LHC 101', 'LHC 102', 'LHC 103', 'LHC 104', 'LHC 105', 'LHC 106',
    'LHC 201', 'LHC 202', 'LHC 203', 'LHC 204', 'LHC 205', 'LHC 206',
    'LHC 301', 'LHC 302', 'LHC 303', 'LHC 304', 'LHC 305', 'LHC 306',
  ],
  'Lecture Theatres (L1 – L6)': [
    'L1', 'L2', 'L3', 'L4', 'L5', 'L6',
  ],
  'A-Block Classrooms': [
    'A-210', 'A-311', 'A-321', 'AB-104',
  ],
  'E-Block Classrooms (Electrical & Electronics)': [
    'E-101', 'E-102', 'E-201', 'E-202', 'E-301', 'E-302', 'E-314',
  ],
  'M-Block Classrooms (Mechanical)': [
    'M-103', 'M-305', 'M-306', 'M-309', 'MED',
  ],
  'Civil, Architecture, Exam & Computing': [
    'C-103', 'C-201', 'S-307', 'S-310', 'Studio 1', 'Studio 2', 'EHGF', 'EHFF', 'MCA 304', 'MCA 312', 'CS A1 CR',
  ],
  'Laboratories & Department Facilities': [
    'Lab 1', 'Lab 3', 'Lab 4', 'Lab 6', 'Lab 8', 'Lab 9', 'Lab 10', 'CS Lab', 'MLDA Lab',
    'Chemistry Dept', 'Physics Dept', 'Humanities Dept', 'Workshop', 'Electronics Lab',
    'Digital Design Lab', 'Instrumentation Lab', 'MATLAB Lab', 'CAD Lab (E-313)', 'SSC Lab (E-220)',
    '2nd Floor EED', '3rd Floor EED',
  ],
}

const allRoomsList = Object.values(roomCategories).flat()

const occupancy = {}
for (const d of days) {
  occupancy[d] = {}
  for (const r of allRoomsList) {
    occupancy[d][r] = {}
    for (const p of periods) {
      occupancy[d][r][p.id] = []
    }
  }
}

for (const [branch, years] of Object.entries(generated)) {
  for (const [year, sessions] of Object.entries(years)) {
    for (const s of sessions) {
      if (!s.room || !days.includes(s.day)) continue
      const rList = normalizeRoom(s.room)
      for (const r of rList) {
        if (!occupancy[s.day][r]) {
          occupancy[s.day][r] = {}
          for (const p of periods) occupancy[s.day][r][p.id] = []
        }
        for (const p of periods) {
          if (Math.max(s.start, p.start) < Math.min(s.end, p.end)) {
            occupancy[s.day][r][p.id].push({
              branch,
              year,
              name: s.name,
              code: s.code,
              group: s.group,
              type: s.type,
            })
          }
        }
      }
    }
  }
}

let md = ''

md += '# NIT Kurukshetra — Empty & Free Rooms Timetable\n\n'
md += '> **Odd Semester (Session 2026–27)**  \n'
md += '> *Auto-compiled from all official branch timetables across 1st, 2nd, 3rd, and 4th Years.*  \n'
md += '> Use this reference to find empty classrooms, lecture halls, and laboratories for group studies, society meetings, coding practice, or project work.\n\n'

md += '---\n\n'

md += '## ⏰ Standard Institute Period Timings\n\n'
md += '| Period | Time Slot | Duration | Remarks |\n'
md += '|:---|:---|:---|:---|\n'
md += '| **P1** | 08:30 – 09:25 | 55 mins | Morning Lecture 1 / Lab Start |\n'
md += '| **P2** | 09:25 – 10:20 | 55 mins | Morning Lecture 2 |\n'
md += '| *Break* | *10:20 – 10:40* | *20 mins* | *Morning Tea / Transition Break* |\n'
md += '| **P3** | 10:40 – 11:35 | 55 mins | Mid-Day Lecture 1 / Lab Start |\n'
md += '| **P4** | 11:35 – 12:30 | 55 mins | Mid-Day Lecture 2 |\n'
md += '| **P5** | 12:30 – 13:25 | 55 mins | Pre-Lunch Lecture |\n'
md += '| *Break* | *13:25 – 13:45* | *20 mins* | *Lunch Break* |\n'
md += '| **P6** | 13:45 – 14:40 | 55 mins | Afternoon Lecture 1 |\n'
md += '| **P7** | 14:40 – 15:35 | 55 mins | Afternoon Lecture 2 / Lab Start |\n'
md += '| **P8** | 15:35 – 16:30 | 55 mins | Late Afternoon Lecture |\n'
md += '| **P9** | 16:30 – 17:25 | 55 mins | Evening Lecture / Club / Lab Slot |\n'
md += '| **P10** | 17:25 – 18:20 | 55 mins | Evening Slot |\n\n'

md += '---\n\n'

md += '## 📑 Table of Contents\n\n'
md += '1. [Day-by-Day Slot Directory (Quick Free Room Finder)](#1-day-by-day-slot-directory)\n'
md += '   - [Monday Free Rooms](#-monday)\n'
md += '   - [Tuesday Free Rooms](#-tuesday)\n'
md += '   - [Wednesday Free Rooms](#-wednesday)\n'
md += '   - [Thursday Free Rooms](#-thursday)\n'
md += '   - [Friday Free Rooms](#-friday)\n'
md += '2. [Master Daily Occupancy Grids (Room × Period Matrix)](#2-master-daily-occupancy-grids)\n'
md += '   - [Monday Grid](#-monday-master-grid)\n'
md += '   - [Tuesday Grid](#-tuesday-master-grid)\n'
md += '   - [Wednesday Grid](#-wednesday-master-grid)\n'
md += '   - [Thursday Grid](#-thursday-master-grid)\n'
md += '   - [Friday Grid](#-friday-master-grid)\n'
md += '3. [Room-by-Room Weekly Availability Summary](#3-room-by-room-weekly-availability-summary)\n'
md += '   - [Lecture Hall Complex (LHC 101 – 306)](#lecture-hall-complex-lhc)\n'
md += '   - [Lecture Theatres (L1 – L6)](#lecture-theatres-l1--l6)\n'
md += '   - [A-Block Classrooms](#a-block-classrooms)\n'
md += '   - [E-Block Classrooms](#e-block-classrooms-electrical--electronics)\n'
md += '   - [M-Block Classrooms](#m-block-classrooms-mechanical)\n'
md += '   - [Civil, Architecture & Computing](#civil-architecture-exam--computing)\n'
md += '   - [Laboratories & Specialized Facilities](#laboratories--department-facilities)\n\n'

md += '---\n\n'

// ==========================================
// 1. Day by Day Slot Breakdown
// ==========================================
md += '# 1. Day-by-Day Slot Directory\n\n'
md += '> Browse any day and specific time slot to instantly see which classrooms, lecture theatres, and labs are empty.\n\n'

for (const d of days) {
  const dayTitle = dayNames[d]
  md += `## 📅 ${dayTitle}\n\n`

  for (const p of periods) {
    md += `### ${dayTitle} · ${p.id} (${p.label})\n\n`

    const freeRoomsByCat = {}
    let totalFree = 0
    let totalTracked = 0

    for (const [catName, catRooms] of Object.entries(roomCategories)) {
      freeRoomsByCat[catName] = []
      for (const r of catRooms) {
        totalTracked++
        const occ = occupancy[d][r]?.[p.id] || []
        if (occ.length === 0) {
          freeRoomsByCat[catName].push(r)
          totalFree++
        }
      }
    }

    const pct = Math.round((totalFree / totalTracked) * 100)
    md += `> **Status**: **${totalFree} of ${totalTracked} rooms empty** (${pct}% available)\n\n`
    md += '| Building / Complex | Empty (Free) Rooms | Free / Total |\n'
    md += '|:---|:---|:---|\n'

    for (const [catName, freeList] of Object.entries(freeRoomsByCat)) {
      const roomStr = freeList.length > 0
        ? freeList.map((r) => `\`${r}\``).join(', ')
        : '*None (All occupied)*'
      md += `| **${catName}** | ${roomStr} | ${freeList.length} / ${roomCategories[catName].length} |\n`
    }
    md += '\n'
  }

  md += '---\n\n'
}

// ==========================================
// 2. Master Daily Occupancy Grids
// ==========================================
md += '# 2. Master Daily Occupancy Grids\n\n'
md += '> Comprehensive matrix for each day showing all rooms across all 10 periods.\n'
md += '> - `FREE` indicates an empty room.\n'
md += '> - Class labels indicate branch and year (e.g. `CSE-1`, `ECE-2`, `MECH-3`).\n\n'

for (const d of days) {
  const dayTitle = dayNames[d]
  md += `## 📊 ${dayTitle} Master Grid\n\n`

  for (const [catName, catRooms] of Object.entries(roomCategories)) {
    md += `### ${catName} — ${dayTitle}\n\n`
    md += '| Room | P1 (08:30) | P2 (09:25) | P3 (10:40) | P4 (11:35) | P5 (12:30) | P6 (13:45) | P7 (14:40) | P8 (15:35) | P9 (16:30) | P10 (17:25) |\n'
    md += '|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|\n'

    for (const r of catRooms) {
      let row = `| **${r}** `
      for (const p of periods) {
        const occ = occupancy[d][r]?.[p.id] || []
        if (occ.length === 0) {
          row += '| `FREE` '
        } else {
          const branches = [...new Set(occ.map((o) => `${o.branch}-${o.year}`))].join(',')
          row += `| ${branches} `
        }
      }
      row += '|\n'
      md += row
    }
    md += '\n'
  }

  md += '---\n\n'
}

// ==========================================
// 3. Room-by-Room Weekly Availability Summary
// ==========================================
md += '# 3. Room-by-Room Weekly Availability Summary\n\n'
md += '> Complete weekly schedule for each room, listing all free periods and occupied classes for Monday through Friday.\n\n'

for (const [catName, catRooms] of Object.entries(roomCategories)) {
  md += `## ${catName}\n\n`
  for (const r of catRooms) {
    md += `### ${r}\n\n`
    md += '| Day | Free Periods & Times | Occupied By |\n'
    md += '|:---|:---|:---|\n'

    for (const d of days) {
      const freePeriods = []
      const occPeriods = []
      for (const p of periods) {
        const occ = occupancy[d][r]?.[p.id] || []
        if (occ.length === 0) {
          freePeriods.push(`\`${p.id}\` (${p.label})`)
        } else {
          const occInfo = [...new Set(occ.map((o) => `${o.branch}-${o.year}`))].join(',')
          occPeriods.push(`\`${p.id}\`: ${occInfo}`)
        }
      }

      const freeStr = freePeriods.length > 0 ? freePeriods.join(', ') : '*Fully Occupied*'
      const occStr = occPeriods.length > 0 ? occPeriods.join(', ') : '*All Day Free*'
      md += `| **${dayNames[d]}** | ${freeStr} | ${occStr} |\n`
    }
    md += '\n'
  }
}

writeFileSync(join(ROOT, 'free_rooms.md'), md, 'utf8')
console.log('Successfully generated free_rooms.md (', md.length, 'bytes)')
