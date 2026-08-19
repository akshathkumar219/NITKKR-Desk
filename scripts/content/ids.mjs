// ---------------------------------------------------------------------------
// Deterministic session IDs.
//
// This is the load-bearing piece of the whole pipeline.
//
// Attendance is stored as `${isoDate}|${sessionId}` (see src/lib/rollcall.js).
// If regenerating a timetable from markdown changed the IDs, every mark a
// student had logged would silently detach and their percentage would reset —
// the worst possible failure for a local-only app with no server copy.
//
// So an ID is a hash of the fields that identify a class *as a class*:
//
//     branch | year | day | start | code-or-name
//
// Room, group, end time and type are deliberately excluded. Those are exactly
// the fields that get amended mid-semester ("DS lab moved to CL-3"), and an
// amendment must not cost anyone their attendance history.
//
// Plain FNV-1a rather than node:crypto so the identical function can run in
// the browser when importing a shared board from markdown or a QR code.
// ---------------------------------------------------------------------------

/** FNV-1a, 32-bit, returned as base36. Fast, dependency-free, plenty for this. */
function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    // h *= 16777619, kept in 32-bit range without BigInt
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h.toString(36)
}

/**
 * Stable ID for a published session.
 * `subject` is the course code when there is one, else the course name —
 * codes are stabler, but not every entry (labs, seminars, breaks) has one.
 */
export function sessionId({ branch, year, day, start, code, name }) {
  const subject = (code || name || '').trim().toUpperCase()
  return fnv1a(`${branch}|${year}|${day}|${start}|${subject}`)
}

/**
 * Assign IDs across a branch/year, disambiguating genuine collisions.
 *
 * A collision means two sessions share branch+year+day+start+subject — e.g. a
 * lab split across two rooms listed as separate rows. They get `-2`, `-3`
 * suffixes in file order, which is stable as long as the rows stay in order.
 * The validator warns on every one so an accidental duplicate row is visible
 * rather than silently absorbed.
 */
export function assignIds(sessions, { branch, year }) {
  const seen = new Map()
  const collisions = []
  return {
    sessions: sessions.map((s) => {
      const base = sessionId({ branch, year, day: s.day, start: s.start, code: s.code, name: s.name })
      const n = (seen.get(base) ?? 0) + 1
      seen.set(base, n)
      if (n > 1) collisions.push({ id: base, n, session: s })
      return { ...s, id: n === 1 ? base : `${base}-${n}` }
    }),
    collisions,
  }
}
