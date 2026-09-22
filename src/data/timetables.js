// ---------------------------------------------------------------------------
// TIMETABLES — generated from content/timetables/*.md
//
// To add or fix a timetable, edit the markdown. One file per branch/year,
// named <BRANCH>-<YEAR>.md:
//
//   content/timetables/CSE-2.md
//
// Session IDs are derived from branch+year+day+start+course, so amending a
// room or a group never breaks anyone's logged attendance. See
// scripts/content/ids.mjs for why that matters, and ids.test.mjs for the
// tests that keep it true.
//
//   Session = {
//     id, day: MON..FRI, start/end: minutes since midnight,
//     name, code, room, group, type
//   }
// ---------------------------------------------------------------------------

import generated from './generated/timetables.json' with { type: 'json' }
import { getSubsectionsForBranch } from './campus.js'

export const TIMETABLES = generated

let _sessionById = null

export function getSessionById(id) {
  if (!id) return null
  if (!_sessionById) {
    _sessionById = new Map()
    for (const byYear of Object.values(TIMETABLES)) {
      for (const list of Object.values(byYear)) {
        for (const s of list) {
          _sessionById.set(s.id, {
            ...s,
            attendanceCredits: s.attendanceCredits != null && s.attendanceCredits !== 2 ? Number(s.attendanceCredits) : 1,
          })
        }
      }
    }
  }
  return _sessionById.get(id) || null
}

/** Published (non-editable-source) timetable for a branch/year. */
export function baseTimetable(branch, year) {
  const list = TIMETABLES[branch]?.[year] ?? []
  return list.map((s) => ({
    ...s,
    attendanceCredits: s.attendanceCredits != null && s.attendanceCredits !== 2 ? Number(s.attendanceCredits) : 1,
  }))
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

/** Group/section labels a student can pick from for a branch/year. */
export function groupsFor(branch, year) {
  const set = new Set()
  for (const s of baseTimetable(branch, year)) {
    if (!s.group) continue
    s.group.split('+').forEach((g) => {
      const t = g.trim()
      if (t) set.add(t)
    })
  }
  if (set.size === 0) {
    return getSubsectionsForBranch(branch)
  }
  return [...set].sort()
}

