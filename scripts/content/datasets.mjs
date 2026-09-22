// ---------------------------------------------------------------------------
// Per-dataset markdown parsers.
//
// Each takes the raw text of one content file and returns plain data, or
// throws a ContentError with a file:line the author can act on. Everything
// here is pure — the build orchestrates, these just translate.
// ---------------------------------------------------------------------------

import { ContentError, parseFrontMatter, parseSections, requireColumns } from './md.mjs'
import { assignIds } from './ids.mjs'
import { parseTime } from '../../src/lib/time.js'

const DAYS_5 = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const DAYS_7 = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const TYPES = ['lecture', 'lab', 'tutorial', 'break', 'other']
const MEAL_KEYS = ['breakfast', 'lunch', 'dinner']

function required(data, key, file, what) {
  const v = (data[key] ?? '').trim()
  if (!v) throw new ContentError(file, 1, `Front matter is missing \`${key}:\` (${what}).`)
  return v
}

function time(row, column) {
  const raw = row.get(column)
  if (!raw) row.fail(`\`${column}\` is empty. Use a time like \`9:00\`, \`9 am\` or \`14:30\`.`)
  const mins = parseTime(raw)
  if (mins === null) {
    row.fail(`Could not read \`${column}\` as a time: "${raw}". Try \`9:00\`, \`9 am\`, \`2 pm\`, \`14:30\`.`)
  }
  return mins
}

// ------------------------------------------------------------- timetables --

/**
 * content/timetables/<BRANCH>-<YEAR>.md
 *
 * Front matter declares branch + year; each `## MON` section holds one table
 * of that day's sessions. Times become integer minutes here, at the boundary,
 * so nothing downstream ever parses a time string again.
 */
export function parseTimetable(text, file) {
  const { data, lines, bodyStart } = parseFrontMatter(text, file)
  const branch = required(data, 'branch', file, 'e.g. `branch: CSE`').toUpperCase()
  const year = required(data, 'year', file, 'e.g. `year: 2`')
  if (!['1', '2', '3', '4'].includes(year)) {
    throw new ContentError(file, 1, `\`year: ${year}\` is not one of 1, 2, 3, 4.`)
  }

  const sessions = []
  for (const section of parseSections(lines, bodyStart, file)) {
    if (!section.heading) continue
    const day = section.heading.toUpperCase().slice(0, 3)
    if (!DAYS_5.includes(day)) {
      throw new ContentError(
        file,
        section.line,
        `Heading "${section.heading}" is not a weekday. Use one of ${DAYS_5.join(', ')}.`,
      )
    }
    for (const table of section.tables) {
      requireColumns(table, ['start', 'end', 'course'], file)
      for (const row of table.rows) {
        const start = time(row, 'start')
        const end = time(row, 'end')
        if (end <= start) {
          row.fail(`\`end\` (${row.get('end')}) is not after \`start\` (${row.get('start')}).`)
        }
        const type = (row.get('type') || 'lecture').toLowerCase()
        if (!TYPES.includes(type)) {
          row.fail(`\`type\` is "${type}". Use one of: ${TYPES.join(', ')}.`)
        }
        const name = row.get('course')
        if (!name && type !== 'break') row.fail('`course` is empty.')
        sessions.push({
          day,
          start,
          end,
          name,
          code: row.get('code'),
          room: row.get('room'),
          group: row.get('group'),
          instructor: row.get('instructor') || row.get('teacher') || row.get('professor') || null,
          type,
          line: row.line,
        })
      }
    }
  }

  const { sessions: withIds, collisions } = assignIds(sessions, { branch, year })
  const warnings = collisions.map(
    (c) =>
      `${file}:${c.session.line}  Duplicate session — same day, start time and course as an ` +
      `earlier row. Kept as \`${c.id}-${c.n}\`. If this is two halves of one split ` +
      `lab that is fine; if it is a copy-paste slip, delete the row.`,
  )

  // Overlap detection runs per day, ignoring breaks (a break legitimately
  // brackets nothing, but two lectures at once means a transcription error).
  for (const day of DAYS_5) {
    const onDay = withIds
      .filter((s) => s.day === day && s.type !== 'break')
      .sort((a, b) => a.start - b.start)
    for (let i = 1; i < onDay.length; i++) {
      const prev = onDay[i - 1]
      const cur = onDay[i]
      if (cur.start < prev.end && !sharesNothing(prev, cur)) {
        warnings.push(
          `${file}:${cur.line}  "${cur.name}" overlaps "${prev.name}" on ${day}. ` +
            `Fine if they are different groups; check the \`group\` column if not.`,
        )
      }
    }
  }

  return {
    branch,
    year,
    source: data.source ?? null,
    sessions: withIds.map((s) => omit(s, 'line')),
    warnings,
  }
}

/** Drop a key without leaving an unused binding behind. */
function omit(obj, key) {
  const out = { ...obj }
  delete out[key]
  return out
}

/** Two overlapping sessions are fine when they target disjoint groups. */
function sharesNothing(a, b) {
  const ga = splitPlus(a.group)
  const gb = splitPlus(b.group)
  if (!ga.length || !gb.length) return false
  return !ga.some((g) => gb.includes(g))
}

function splitPlus(v) {
  return (v || '')
    .split('+')
    .map((x) => x.trim())
    .filter(Boolean)
}

// ------------------------------------------------------------------- mess --

/**
 * content/mess/<HOSTEL>.md — one `## MON` section per day, one table of
 * `| Meal | Items |` where items are separated by commas.
 */
export function parseMess(text, file) {
  const { data, lines, bodyStart } = parseFrontMatter(text, file)
  const hostel = required(data, 'hostel', file, 'e.g. `hostel: H10`').toUpperCase()

  const week = {}
  for (const section of parseSections(lines, bodyStart, file)) {
    if (!section.heading) continue
    const day = section.heading.toUpperCase().slice(0, 3)
    if (!DAYS_7.includes(day)) {
      throw new ContentError(
        file,
        section.line,
        `Heading "${section.heading}" is not a day. Use one of ${DAYS_7.join(', ')}.`,
      )
    }
    const meals = {}
    for (const table of section.tables) {
      requireColumns(table, ['meal', 'items'], file)
      for (const row of table.rows) {
        const meal = row.get('meal').toLowerCase()
        if (!MEAL_KEYS.includes(meal) && meal !== 'snacks') {
          row.fail(`\`meal\` is "${meal}". Use one of: ${MEAL_KEYS.join(', ')}.`)
        }
        const items = row
          .get('items')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
        if (!items.length) row.fail(`\`items\` is empty for ${meal}.`)
        const extra = row.has('extra') ? row.get('extra').trim() : ''
        meals[meal] = {
          items,
          extra: extra || null,
        }
      }
    }
    const missing = MEAL_KEYS.filter((m) => !meals[m])
    if (missing.length) {
      throw new ContentError(file, section.line, `${day} is missing: ${missing.join(', ')}.`)
    }
    week[day] = meals
  }

  const missingDays = DAYS_7.filter((d) => !week[d])
  const warnings = missingDays.length
    ? [`${file}:1  No menu for ${missingDays.join(', ')} — those days fall back to the default week.`]
    : []

  return { hostel, week, warnings }
}

// ----------------------------------------------------------------- campus --

/** content/campus/branches.md — `| Code | Name | Group |` */
export function parseBranches(text, file) {
  const { lines, bodyStart } = parseFrontMatter(text, file)
  const out = []
  for (const section of parseSections(lines, bodyStart, file)) {
    for (const table of section.tables) {
      requireColumns(table, ['code', 'name'], file)
      for (const row of table.rows) {
        const code = row.get('code').toUpperCase()
        if (!code) row.fail('`code` is empty.')
        out.push({
          code,
          name: row.get('name') || code,
          group: (row.get('group') || 'ENGINEERING').toUpperCase(),
        })
      }
    }
  }
  if (!out.length) throw new ContentError(file, 1, 'No branches found. Expected a table with Code and Name columns.')
  return out
}

/** content/campus/hostels.md — `| Code | Name |` */
export function parseHostels(text, file) {
  const { lines, bodyStart } = parseFrontMatter(text, file)
  const out = []
  for (const section of parseSections(lines, bodyStart, file)) {
    for (const table of section.tables) {
      requireColumns(table, ['code', 'name'], file)
      for (const row of table.rows) {
        const code = row.get('code').toUpperCase()
        if (!code) row.fail('`code` is empty.')
        out.push({ code, name: row.get('name') || code })
      }
    }
  }
  if (!out.length) throw new ContentError(file, 1, 'No hostels found.')
  return out
}

/** content/campus/landmarks.md — `| Name | Tag | Lat | Lng |` (lat/lng optional) */
export function parseLandmarks(text, file) {
  const { lines, bodyStart } = parseFrontMatter(text, file)
  const out = []
  const warnings = []
  for (const section of parseSections(lines, bodyStart, file)) {
    for (const table of section.tables) {
      requireColumns(table, ['name', 'tag'], file)
      for (const row of table.rows) {
        const name = row.get('name')
        if (!name) row.fail('`name` is empty.')
        const lat = row.get('lat')
        const lng = row.get('lng')
        const hasCoords = lat !== '' && lng !== ''
        if (hasCoords && (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng)))) {
          row.fail(`\`lat\`/\`lng\` are not numbers: "${lat}", "${lng}".`)
        }
        if (!hasCoords) {
          warnings.push(
            `${file}:${row.line}  "${name}" has no lat/lng — Maps will search by name, ` +
              `which can land on the wrong place. Add coordinates when you can.`,
          )
        }
        out.push({
          id: row.get('id') || null,
          name,
          tag: (row.get('tag') || 'OTHER').toUpperCase(),
          lat: hasCoords ? Number(lat) : null,
          lng: hasCoords ? Number(lng) : null,
          query: row.get('query') || `${name}, NIT Kurukshetra`,
        })
      }
    }
  }
  return { landmarks: out, warnings }
}

// --------------------------------------------------------------- calendar --

/**
 * content/calendar/<term>.md and content/exams/<term>.md
 * `| Label | Value | Category |` plus front-matter title/term.
 * `holiday: yes` in the Category column is what makes attendance
 * holiday-aware downstream.
 */
export function parseCalendar(text, file) {
  const { data, lines, bodyStart } = parseFrontMatter(text, file)
  const events = []
  for (const section of parseSections(lines, bodyStart, file)) {
    for (const table of section.tables) {
      requireColumns(table, ['label', 'value'], file)
      for (const row of table.rows) {
        const label = row.get('label')
        if (!label) row.fail('`label` is empty.')
        events.push({
          label,
          value: row.get('value'),
          category: (row.get('category') || 'EVENTS').toUpperCase(),
          date: row.get('date') || null,
          endDate: row.get('end date') || row.get('enddate') || null,
        })
      }
    }
  }
  return {
    title: data.title ?? 'ACADEMIC CALENDAR',
    term: data.term ?? null,
    audience: data.audience ?? null,
    source: data.source ?? null,
    verified: (data.verified ?? '').toLowerCase() === 'yes',
    events,
  }
}

// -------------------------------------------------------------------- pyq --

/** content/pyq/<session>.md — `| Code | Title | Semester | URL |` */
/**
 * The three exams a paper can belong to. `id` is what lands in the JSON;
 * matching is loose on purpose so "Mid Sem 1", "MIDSEM-1" and "MID 1" all
 * land on the same bucket. An empty cell means "not tagged yet" and the
 * paper shows under every exam.
 */
export const EXAMS = [
  { id: 'MID1', label: 'MID SEM 1', match: /^mid\s*(sem)?\s*[-_ ]?1$/ },
  { id: 'MID2', label: 'MID SEM 2', match: /^mid\s*(sem)?\s*[-_ ]?2$/ },
  { id: 'END', label: 'END SEM', match: /^end\s*(sem)?$/ },
]

function normaliseExam(raw) {
  const v = (raw || '').trim().toLowerCase()
  if (!v) return null
  return EXAMS.find((e) => e.match.test(v))?.id ?? null
}

export function parsePyq(text, file) {
  const { data, lines, bodyStart } = parseFrontMatter(text, file)
  const session = required(data, 'session', file, 'e.g. `session: 2024-25`')
  const papers = []
  const warnings = []
  for (const section of parseSections(lines, bodyStart, file)) {
    for (const table of section.tables) {
      requireColumns(table, ['code', 'title'], file)
      for (const row of table.rows) {
        const url = row.get('url')
        if (url && !/^https?:\/\/|^\//.test(url)) {
          row.fail(`\`url\` must start with http://, https://, or / — got "${url}".`)
        }
        if (!url) {
          warnings.push(`${file}:${row.line}  "${row.get('title')}" has no URL — it will render as "no file attached".`)
        }
        const exam = normaliseExam(row.get('exam'))
        if (row.get('exam') && !exam) {
          row.fail(
            `\`exam\` is "${row.get('exam')}". Use one of: ${EXAMS.map((e) => e.label).join(', ')}.`,
          )
        }
        papers.push({
          code: row.get('code'),
          title: row.get('title'),
          branch: row.get('branch') || '',
          sem: row.get('semester') || row.get('sem') || '',
          exam,
          url: url || null,
        })
      }
    }
  }
  return {
    session,
    sub: data.sub ?? null,
    available: (data.available ?? 'yes').toLowerCase() !== 'no',
    papers,
    warnings,
  }
}

// ------------------------------------------------------------------ links --

/** content/links.md, content/transport.md, content/helpline.md — flat tables. */
export function parseLinks(text, file) {
  const { lines, bodyStart } = parseFrontMatter(text, file)
  const groups = {}
  for (const section of parseSections(lines, bodyStart, file)) {
    const key = (section.heading ?? 'DEFAULT').toUpperCase()
    const rows = []
    for (const table of section.tables) {
      for (const row of table.rows) {
        const entry = {}
        for (const col of table.columns) entry[col] = row.get(col)
        if (entry.url && !/^https?:\/\//.test(entry.url)) {
          row.fail(`\`url\` must start with http:// or https:// — got "${entry.url}".`)
        }
        rows.push(entry)
      }
    }
    if (rows.length) groups[key] = rows
  }
  return groups
}

// ------------------------------------------------------------- curriculum --

/**
 * content/curriculum/<BRANCH>/sem-<N>.md
 *
 * Front matter declares branch, semester, year, totalCredits, contactHours, batch, source.
 * ## Courses contains the table of courses.
 * ## Syllabi contains syllabus details for each course.
 */
export function parseCurriculum(text, file) {
  const { data, lines, bodyStart } = parseFrontMatter(text, file)
  const branch = required(data, 'branch', file, 'e.g. `branch: CSE`').toUpperCase()
  const semRaw = required(data, 'semester', file, 'e.g. `semester: 3`')
  const semester = parseInt(semRaw, 10)
  if (Number.isNaN(semester) || semester < 1 || semester > 10) {
    throw new ContentError(file, 1, `\`semester: ${semRaw}\` must be an integer between 1 and 10.`)
  }
  const year = data.year ? parseInt(data.year, 10) : Math.ceil(semester / 2)
  const totalCredits = data.totalCredits || data.credits || ''
  const contactHours = data.contactHours || data.contact || ''
  const batch = data.batch || null
  const source = data.source || null

  const courses = []
  const syllabi = {}
  let currentCourseCode = null

  for (const section of parseSections(lines, bodyStart, file)) {
    if (!section.heading) continue
    const headingUpper = section.heading.toUpperCase()

    if (headingUpper === 'COURSES' || headingUpper === 'SUBJECTS') {
      for (const table of section.tables) {
        requireColumns(table, ['code', 'title'], file)
        for (const row of table.rows) {
          const code = row.get('code')
          const title = row.get('title') || row.get('name')
          if (!code || !title) continue
          courses.push({
            code,
            title,
            name: title,
            category: row.get('category') || 'PC',
            type: row.get('type') || 'Theory',
            l: row.get('l') || '0',
            t: row.get('t') || '0',
            p: row.get('p') || '0',
            credits: row.get('credits') || '0',
            contact: row.get('contact') || '',
          })
        }
      }
    } else if (section.level === 3) {
      // e.g. "### CSPC 201: Design and Analysis of Algorithms"
      const match = /^([A-Z]{2,4}\s*(?:IC|PC|NC|PE|OE)?\s*\d{2,3}[A-Z]?)(?:\s*[:-]\s*(.*))?$/i.exec(section.heading)
      if (match) {
        currentCourseCode = match[1].trim()
        syllabi[currentCourseCode] = {
          code: currentCourseCode,
          title: match[2]?.trim() || '',
          units: [],
          objectives: [],
          references: [],
        }
      }
    } else if (section.level >= 4 && currentCourseCode && syllabi[currentCourseCode]) {
      const subHeadingUpper = section.heading.toUpperCase()
      if (subHeadingUpper.includes('OBJECTIVE')) {
        syllabi[currentCourseCode].objectives = section.bullets.map((b) => b.text)
      } else if (subHeadingUpper.includes('REFERENCE') || subHeadingUpper.includes('TEXTBOOK') || subHeadingUpper.includes('BOOKS')) {
        syllabi[currentCourseCode].references = section.bullets.map((b) => b.text)
      } else if (subHeadingUpper.includes('UNIT') || subHeadingUpper.includes('MODULE') || subHeadingUpper.includes('SECTION')) {
        if (section.heading.trim().toUpperCase() === 'UNITS') {
          continue
        }
        let topics = section.bullets.map((b) => b.text)
        if (!topics.length && section.prose?.length) {
          const rawProse = section.prose.map((p) => p.text).join(' ')
          const parts = rawProse.split(/[,;]\s+/).map((s) => s.trim().replace(/\.$/, '')).filter(Boolean)
          topics = parts.length > 0 ? parts : [rawProse]
        }
        syllabi[currentCourseCode].units.push({
          title: section.heading,
          topics,
        })
      }
    }
  }

  return {
    branch,
    semester,
    year,
    totalCredits,
    contactHours,
    batch,
    source,
    courses,
    syllabi,
  }
}
