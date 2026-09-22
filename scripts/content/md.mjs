// ---------------------------------------------------------------------------
// Minimal markdown reader for the content pipeline.
//
// Deliberately not a general markdown parser. It understands exactly three
// things — YAML-ish front matter, `##` headings, and pipe tables — because
// that is the whole vocabulary content authors need, and a small strict
// reader gives far better error messages than a permissive one.
//
// Every returned node carries a 1-based `line` so the validator can point at
// the exact row a human (or Gemini) got wrong.
// ---------------------------------------------------------------------------

/**
 * Split `---` front matter off the top of a document.
 * Values are read as plain strings; no nested structures, no type coercion
 * beyond trimming, because every consumer wants to validate its own fields.
 */
export function parseFrontMatter(text, file) {
  const lines = text.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') {
    return { data: {}, lines, bodyStart: 0 }
  }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (end === -1) {
    throw new ContentError(file, 1, 'Front matter opens with `---` but is never closed.')
  }
  const data = {}
  for (let i = 1; i < end; i++) {
    const raw = lines[i]
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    const at = raw.indexOf(':')
    if (at === -1) {
      throw new ContentError(file, i + 1, `Front matter line is not \`key: value\`: ${raw.trim()}`)
    }
    data[raw.slice(0, at).trim()] = stripQuotes(raw.slice(at + 1).trim())
  }
  return { data, lines, bodyStart: end + 1 }
}

function stripQuotes(v) {
  if (v.length > 1 && ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'"))) {
    return v.slice(1, -1)
  }
  return v
}

/**
 * Group the body into `##` sections. Content before the first heading is
 * returned under the heading `null`, which is what single-table files use.
 *
 * `#` (level 1) is treated as the document title, not a section — files open
 * with one and it must not be mistaken for a day or a category.
 *
 * Each section: { heading, level, line, tables: Table[], bullets: {text,line}[] }
 * Each Table:   { columns: string[], rows: Row[] }
 * Each Row:     { line, cells: string[], get(column) }
 */
export function parseSections(lines, bodyStart, file) {
  const sections = []
  let current = { heading: null, level: 0, line: bodyStart + 1, tables: [], bullets: [], prose: [] }

  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) continue

    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (h) {
      const level = h[1].length
      // A level-1 heading is the document title. Keep collecting into the
      // current (unnamed) section rather than opening a named one.
      if (level === 1) continue
      if (current.tables.length || current.bullets.length || current.prose.length || current.heading !== null) {
        sections.push(current)
      }
      current = { heading: h[2].trim(), level, line: i + 1, tables: [], bullets: [], prose: [] }
      continue
    }

    if (trimmed.startsWith('|')) {
      const table = readTable(lines, i, file)
      current.tables.push(table.table)
      i = table.nextIndex - 1
      continue
    }

    const b = /^(?:[-*]|\d+[.)])\s+(.*)$/.exec(trimmed)
    if (b) {
      current.bullets.push({ text: b[1].trim(), line: i + 1 })
      continue
    }

    current.prose.push({ text: trimmed, line: i + 1 })
  }
  sections.push(current)
  return sections
}

function splitRow(line) {
  // `| a | b |` -> ['a','b']. Trailing/leading pipes are optional.
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map((c) => c.trim())
}

const DIVIDER = /^[\s|:-]+$/

function readTable(lines, start, file) {
  const columns = splitRow(lines[start]).map((c) => c.toLowerCase())
  let i = start + 1
  if (i < lines.length && DIVIDER.test(lines[i]) && lines[i].includes('-')) i++
  else {
    throw new ContentError(
      file,
      start + 2,
      'Table header must be followed by a divider row like `|---|---|`.',
    )
  }

  const rows = []
  for (; i < lines.length; i++) {
    const t = lines[i].trim()
    if (!t.startsWith('|')) break
    const cells = splitRow(lines[i])
    if (cells.every((c) => c === '')) continue
    rows.push(makeRow(cells, columns, i + 1, file))
  }
  return { table: { columns, rows, line: start + 1 }, nextIndex: i }
}

function makeRow(cells, columns, line, file) {
  return {
    line,
    cells,
    columns,
    /** Cell by column name. Missing column -> '' so callers can require it themselves. */
    get(name) {
      const at = columns.indexOf(name.toLowerCase())
      return at === -1 ? '' : (cells[at] ?? '').trim()
    },
    has(name) {
      return columns.includes(name.toLowerCase())
    },
    fail(message) {
      throw new ContentError(file, line, message)
    },
  }
}

/** Assert a table carries every column a parser depends on. */
export function requireColumns(table, required, file) {
  const missing = required.filter((c) => !table.columns.includes(c.toLowerCase()))
  if (missing.length) {
    throw new ContentError(
      file,
      table.line,
      `Table is missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. ` +
        `Found: ${table.columns.join(', ')}.`,
    )
  }
}

/**
 * A content problem with a location. Thrown by parsers, caught by the build
 * so one bad file reports cleanly instead of dumping a JS stack trace at
 * whoever is trying to add a timetable.
 */
export class ContentError extends Error {
  constructor(file, line, message) {
    super(message)
    this.name = 'ContentError'
    this.file = file
    this.line = line
  }
  toString() {
    return `${this.file}:${this.line}  ${this.message}`
  }
}
