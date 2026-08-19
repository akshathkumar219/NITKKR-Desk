// ---------------------------------------------------------------------------
// content/*.md  ->  src/data/generated/*.json
//
// Run directly (`npm run content`), in check-only mode (`npm run content:check`),
// or from the Vite plugin on every save. Errors are reported as file:line so
// whoever is adding a timetable can fix it without reading any JavaScript.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ContentError } from './md.mjs'
import {
  parseBranches,
  parseCalendar,
  parseHostels,
  parseLandmarks,
  parseLinks,
  parseMess,
  parsePyq,
  parseTimetable,
} from './datasets.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const CONTENT = join(ROOT, 'content')
const OUT = join(ROOT, 'src/data/generated')

const rel = (p) => relative(ROOT, p)

function mdFiles(dir) {
  const full = join(CONTENT, dir)
  if (!existsSync(full)) return []
  return readdirSync(full)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort()
    .map((f) => ({ path: join(full, f), name: basename(f, '.md') }))
}

function readOne(file) {
  return readFileSync(file, 'utf8')
}

/**
 * Parse everything. Collects errors rather than throwing on the first one, so
 * a contributor sees every problem in a single run instead of playing
 * whack-a-mole through six rebuilds.
 */
export function buildContent() {
  const errors = []
  const warnings = []

  const attempt = (fn, fallback) => {
    try {
      return fn()
    } catch (e) {
      if (e instanceof ContentError) errors.push(e.toString())
      else errors.push(String(e.stack ?? e))
      return fallback
    }
  }

  // ---- campus reference ----------------------------------------------------
  const branchesFile = join(CONTENT, 'campus/branches.md')
  const branches = existsSync(branchesFile)
    ? attempt(() => parseBranches(readOne(branchesFile), rel(branchesFile)), [])
    : []

  const hostelsFile = join(CONTENT, 'campus/hostels.md')
  const hostels = existsSync(hostelsFile)
    ? attempt(() => parseHostels(readOne(hostelsFile), rel(hostelsFile)), [])
    : []

  const landmarksFile = join(CONTENT, 'campus/landmarks.md')
  let landmarks = []
  if (existsSync(landmarksFile)) {
    const r = attempt(
      () => parseLandmarks(readOne(landmarksFile), rel(landmarksFile)),
      { landmarks: [], warnings: [] },
    )
    landmarks = r.landmarks
    warnings.push(...r.warnings)
  }

  const branchCodes = new Set(branches.map((b) => b.code))
  const hostelCodes = new Set(hostels.map((h) => h.code))

  // ---- timetables ----------------------------------------------------------
  const timetables = {}
  for (const { path } of mdFiles('timetables')) {
    const parsed = attempt(() => parseTimetable(readOne(path), rel(path)), null)
    if (!parsed) continue
    warnings.push(...parsed.warnings)
    if (branchCodes.size && !branchCodes.has(parsed.branch)) {
      errors.push(
        `${rel(path)}:1  Unknown branch "${parsed.branch}". ` +
          `Add it to content/campus/branches.md, or fix the spelling. ` +
          `Known: ${[...branchCodes].join(', ')}.`,
      )
      continue
    }
    timetables[parsed.branch] ??= { 1: [], 2: [], 3: [], 4: [] }
    if (timetables[parsed.branch][parsed.year].length) {
      errors.push(`${rel(path)}:1  ${parsed.branch} year ${parsed.year} is already defined by another file.`)
      continue
    }
    timetables[parsed.branch][parsed.year] = parsed.sessions
  }
  // Every known branch gets an entry so the UI can distinguish "no data yet"
  // from "branch does not exist".
  for (const code of branchCodes) timetables[code] ??= { 1: [], 2: [], 3: [], 4: [] }

  // ---- mess ----------------------------------------------------------------
  const mess = {}
  for (const { path } of mdFiles('mess')) {
    const parsed = attempt(() => parseMess(readOne(path), rel(path)), null)
    if (!parsed) continue
    warnings.push(...parsed.warnings)
    if (hostelCodes.size && !hostelCodes.has(parsed.hostel)) {
      errors.push(
        `${rel(path)}:1  Unknown hostel "${parsed.hostel}". ` +
          `Add it to content/campus/hostels.md. Known: ${[...hostelCodes].join(', ')}.`,
      )
      continue
    }
    mess[parsed.hostel] = parsed.week
  }

  // ---- calendar / exams ----------------------------------------------------
  const calendars = mdFiles('calendar').map(({ path }) =>
    attempt(() => parseCalendar(readOne(path), rel(path)), null),
  ).filter(Boolean)

  const exams = mdFiles('exams').map(({ path }) =>
    attempt(() => parseCalendar(readOne(path), rel(path)), null),
  ).filter(Boolean)

  // ---- pyq -----------------------------------------------------------------
  const pyq = []
  for (const { path } of mdFiles('pyq')) {
    const parsed = attempt(() => parsePyq(readOne(path), rel(path)), null)
    if (!parsed) continue
    warnings.push(...parsed.warnings)
    pyq.push(parsed)
  }

  // ---- flat link tables ----------------------------------------------------
  const flat = {}
  for (const name of ['links', 'transport', 'helpline', 'institute', 'placements']) {
    const p = join(CONTENT, `${name}.md`)
    if (!existsSync(p)) continue
    flat[name] = attempt(() => parseLinks(readOne(p), rel(p)), {})
  }

  return {
    errors,
    warnings,
    data: { branches, hostels, landmarks, timetables, mess, calendars, exams, pyq, flat },
  }
}

/** Write generated JSON. Only touches files whose content actually changed. */
export function writeContent(data) {
  mkdirSync(OUT, { recursive: true })
  const files = {
    'campus.json': { branches: data.branches, hostels: data.hostels },
    'timetables.json': data.timetables,
    'mess.json': data.mess,
    'landmarks.json': data.landmarks,
    'calendar.json': { calendars: data.calendars, exams: data.exams },
    'pyq.json': data.pyq,
    'links.json': data.flat,
  }
  const written = []
  for (const [name, value] of Object.entries(files)) {
    const target = join(OUT, name)
    const next = JSON.stringify(value, null, 2) + '\n'
    // Avoid rewriting identical files — keeps Vite's watcher from looping.
    if (existsSync(target) && readFileSync(target, 'utf8') === next) continue
    writeFileSync(target, next)
    written.push(name)
  }
  return written
}

function summarise(data) {
  const branchesWithData = Object.entries(data.timetables).filter(([, y]) =>
    Object.values(y).some((s) => s.length),
  ).length
  const sessions = Object.values(data.timetables).reduce(
    (n, y) => n + Object.values(y).reduce((m, s) => m + s.length, 0),
    0,
  )
  return [
    `${data.branches.length} branches (${branchesWithData} with a timetable)`,
    `${sessions} sessions`,
    `${Object.keys(data.mess).length}/${data.hostels.length} hostel menus`,
    `${data.landmarks.length} landmarks`,
    `${data.pyq.reduce((n, p) => n + p.papers.length, 0)} papers`,
  ].join(' · ')
}

// ---- CLI --------------------------------------------------------------------

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const checkOnly = process.argv.includes('--check')
  const { errors, warnings, data } = buildContent()

  for (const w of warnings) console.warn(`  warn  ${w}`)

  if (errors.length) {
    console.error(`\n  ${errors.length} content error${errors.length > 1 ? 's' : ''}:\n`)
    for (const e of errors) console.error(`  error  ${e}`)
    console.error('')
    process.exit(1)
  }

  if (checkOnly) {
    console.log(`\n  content OK — ${summarise(data)}\n`)
  } else {
    const written = writeContent(data)
    console.log(`\n  content built — ${summarise(data)}`)
    console.log(written.length ? `  wrote ${written.join(', ')}\n` : '  no changes\n')
  }
}
