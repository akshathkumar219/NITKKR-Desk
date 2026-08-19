// ---------------------------------------------------------------------------
// The attendance-continuity test.
//
// Attendance is stored as `${isoDate}|${sessionId}`. If regenerating a
// timetable from markdown changes an ID, every mark a student logged silently
// detaches and their percentage resets. There is no server copy to recover
// from. This is the one regression that would actually hurt people, so it
// gets a test.
//
// Run: node scripts/content/ids.test.mjs
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { assignIds, sessionId } from './ids.mjs'
import { parseTimetable } from './datasets.mjs'

const FIXTURE = fileURLToPath(new URL('../../content/timetables/CSE-2.md', import.meta.url))

let failed = 0
function check(name, fn) {
  try {
    fn()
    console.log(`  ok    ${name}`)
  } catch (e) {
    failed++
    console.error(`  FAIL  ${name}\n        ${e.message}`)
  }
}
function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg}\n        expected: ${b}\n        actual:   ${a}`)
}
function ne(a, b, msg) {
  if (a === b) throw new Error(`${msg} (both were ${a})`)
}

const ids = (text) => parseTimetable(text, 'test.md').sessions.map((s) => s.id)
const original = readFileSync(FIXTURE, 'utf8')

check('same input produces the same IDs', () => {
  eq(ids(original).join(','), ids(original).join(','), 'Two parses of one file disagreed.')
})

check('IDs are unique within a branch/year', () => {
  const list = ids(original)
  eq(new Set(list).size, list.length, 'Duplicate IDs generated.')
})

check('changing a ROOM keeps every ID (rooms get reassigned mid-semester)', () => {
  const before = ids(original)
  const after = ids(original.replace('| LT-3      |', '| LT-9      |'))
  ne(original.indexOf('| LT-3      |'), -1, 'Fixture no longer contains the room being edited.')
  eq(after.join(','), before.join(','), 'A room change altered session IDs.')
})

check('changing a GROUP keeps every ID', () => {
  const before = ids(original)
  const after = ids(original.replace('A1+A2', 'B1+B2'))
  ne(original.indexOf('A1+A2'), -1, 'Fixture no longer contains the group being edited.')
  eq(after.join(','), before.join(','), 'A group change altered session IDs.')
})

check('changing an END time keeps every ID', () => {
  const before = ids(original)
  const after = ids(original.replace('| 09:00 | 10:00 |', '| 09:00 | 10:30 |'))
  eq(after.join(','), before.join(','), 'An end-time change altered session IDs.')
})

check('reordering rows within a day keeps every ID', () => {
  // IDs must not depend on position — a contributor tidying a table must not
  // cost anyone their history.
  const before = new Set(ids(original))
  const lines = original.split('\n')
  const a = lines.findIndex((l) => l.includes('Data Structures      |'))
  const b = lines.findIndex((l) => l.includes('Discrete Mathematics |'))
  ne(a, -1, 'Fixture rows not found.')
  ne(b, -1, 'Fixture rows not found.')
  ;[lines[a], lines[b]] = [lines[b], lines[a]]
  const after = new Set(ids(lines.join('\n')))
  eq([...after].sort().join(','), [...before].sort().join(','), 'Reordering rows changed IDs.')
})

check('changing a START time DOES change the ID (it is a different class slot)', () => {
  const before = ids(original)
  const after = ids(original.replace('| 09:00 | 10:00 |', '| 08:00 | 10:00 |'))
  ne(after.join(','), before.join(','), 'A start-time change left IDs untouched.')
})

check('the same course in two branches gets different IDs', () => {
  const a = sessionId({ branch: 'CSE', year: '2', day: 'MON', start: 540, code: 'MA-101' })
  const b = sessionId({ branch: 'ECE', year: '2', day: 'MON', start: 540, code: 'MA-101' })
  ne(a, b, 'Two branches shared an ID.')
})

check('duplicate rows are suffixed, not silently merged', () => {
  const dupes = [
    { day: 'MON', start: 540, code: 'X-1', name: 'X' },
    { day: 'MON', start: 540, code: 'X-1', name: 'X' },
  ]
  const { sessions, collisions } = assignIds(dupes, { branch: 'CSE', year: '2' })
  eq(collisions.length, 1, 'Collision was not reported.')
  ne(sessions[0].id, sessions[1].id, 'Duplicate rows collapsed onto one ID.')
  eq(sessions[1].id, `${sessions[0].id}-2`, 'Unexpected suffix format.')
})

// Guard against an accidental change to the hash itself. If this fails and the
// change was deliberate, every deployed user's attendance detaches — so it
// should fail loudly rather than be quietly updated.
check('hash function is unchanged (snapshot)', () => {
  eq(
    sessionId({ branch: 'CSE', year: '2', day: 'MON', start: 540, code: 'CSPC-201' }),
    'timlqc',
    'The ID hash changed. Every existing attendance record would detach.',
  )
})

writeFileSync(FIXTURE, original) // paranoia: nothing above writes, but be sure

console.log('')
if (failed) {
  console.error(`  ${failed} test${failed > 1 ? 's' : ''} failed\n`)
  process.exit(1)
}
console.log('  all ID-stability tests passed\n')
