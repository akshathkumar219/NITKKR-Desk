// ---------------------------------------------------------------------------
// Interactive-state sweep.
//
// verify.mjs only ever sees each route in its default state, so anything
// behind a tab, toggle, modal or edit mode was untested — which is exactly
// where the invisible active-state bugs were hiding.
//
// This drives each screen through its real states, in BOTH themes, and runs
// the same console-error and contrast checks in every one.
//
// Run: node states.mjs   (needs `vite preview --port 4173` running)
// ---------------------------------------------------------------------------

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.VERIFY_BASE ?? 'http://localhost:4173'
const OUT = 'shots/states'
mkdirSync(OUT, { recursive: true })

const errors = []
let checks = 0

const browser = await chromium.launch()

/** Injected into the page; mirrors the contrast check in verify.mjs. */
const CONTRAST = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    // Handles both `rgba(0, 0, 0, 0.9)` and the modern `rgb(0 0 0 / 0.9)`
    // that Tailwind emits.
    const [rgb, alpha] = m[1].split('/')
    const n = rgb.trim().split(/[\s,]+/).map(parseFloat)
    if (n.length < 3 || n.slice(0, 3).some(Number.isNaN)) return null
    const a = alpha !== undefined ? parseFloat(alpha) : (Number.isNaN(n[3]) ? 1 : n[3] ?? 1)
    return { r: n[0], g: n[1], b: n[2], a: Number.isNaN(a) ? 1 : a }
  }
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
  }
  const bgOf = (el) => {
    let n = el
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c && c.a > 0.5) return c
      n = n.parentElement
    }
    return parse(getComputedStyle(document.body).backgroundColor)
  }
  const out = []
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('[aria-hidden="true"], .world, .ghost-type, .intro-overlay')) continue
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join('')
    if (!own) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.5) continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) continue
    const fg = parse(cs.color)
    const bg = bgOf(el)
    if (!fg || !bg || fg.a < 0.5) continue
    const cr = ratio(fg, bg)
    if (cr < 3) out.push(`${cr.toFixed(2)}:1 "${own.slice(0, 34)}"`)
  }
  return [...new Set(out)].slice(0, 5)
}

async function newPage(theme) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[${theme}] pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET|net::ERR_FAILED/.test(m.text()))
      errors.push(`[${theme}] console: ${m.text()}`)
  })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((t) => {
    localStorage.setItem('kkr.theme', JSON.stringify(t))
    localStorage.setItem('kkr.welcomed', JSON.stringify(true))
    sessionStorage.setItem('kkr.intro.plays', JSON.stringify(99))
    localStorage.setItem(
      'kkr.profile',
      JSON.stringify({
        name: 'Akshath',
        branch: 'CSE',
        hostel: 'CVR',
        yearByBranch: { CSE: '2' },
        branchPicked: true,
        hostelPicked: true,
      }),
    )
    localStorage.setItem(
      'kkr.rollcall',
      JSON.stringify({
        '2026-08-10|timlqc': 'present',
        '2026-08-10|1w4w891': 'present',
        '2026-08-11|1smfvn4': 'absent',
        '2026-08-11|1989s0n': 'present',
        '2026-08-12|3a9i38': 'present',
        '2026-08-12|cwjlbp': 'cancelled',
      }),
    )
    localStorage.setItem(
      'kkr.rollcall.settings',
      JSON.stringify({ required: 75, trackingSince: '2026-08-01' }),
    )
    localStorage.setItem(
      'kkr.grades',
      JSON.stringify([{ id: 'g1', name: 'Data Structures', credits: '4', grade: '9' }]),
    )
  }, theme)
  return { ctx, page }
}

/** Snapshot one named state: contrast + overflow + screenshot. */
async function check(page, theme, name) {
  checks++
  await page.waitForTimeout(220)
  for (const c of await page.evaluate(CONTRAST)) {
    errors.push(`[${theme}/${name}] low contrast ${c}`)
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  if (overflow > 2) errors.push(`[${theme}/${name}] overflows horizontally by ${overflow}px`)
  await page.screenshot({ path: `${OUT}/${theme}-${name}.png` })
}

/** Click by visible name if present; report when an expected control is gone. */
async function click(page, name, { theme, state, optional = false } = {}) {
  const el = page.getByRole('button', { name, exact: false }).first()
  if ((await el.count()) === 0) {
    if (!optional) errors.push(`[${theme}/${state}] control not found: "${name}"`)
    return false
  }
  await el.click()
  await page.waitForTimeout(180)
  return true
}

for (const theme of ['light', 'dark']) {
  const { ctx, page } = await newPage(theme)

  // ---- Board: day view, week view, edit mode, add-session modal ----------
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
  await check(page, theme, 'board-day')

  await page.locator('button[aria-label="Week view"]').click()
  await check(page, theme, 'board-week')

  await page.locator('button[aria-label="Day view"]').click()
  await click(page, 'EDIT BOARD', { theme, state: 'board' })
  await check(page, theme, 'board-edit')

  if (await click(page, 'ADD SESSION', { theme, state: 'board-edit', optional: true })) {
    await check(page, theme, 'board-modal')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
  }

  // Search with no matches — an empty state behind input.
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder(/SEARCH/i).fill('zzzzz')
  await check(page, theme, 'board-no-matches')

  // A branch/year with no published timetable at all.
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
  await page.locator('select').first().selectOption('MECH')
  await check(page, theme, 'board-empty')

  // ---- Roll Call: all three tabs ----------------------------------------
  await page.goto(`${BASE}/rollcall`, { waitUntil: 'networkidle' })
  await check(page, theme, 'rollcall-today')
  await click(page, 'SUBJECTS', { theme, state: 'rollcall' })
  await check(page, theme, 'rollcall-subjects')
  await click(page, 'BACKFILL', { theme, state: 'rollcall' })
  await check(page, theme, 'rollcall-backfill')
  await page.goto(`${BASE}/rollcall`, { waitUntil: 'networkidle' })
  await click(page, 'SETTINGS', { theme, state: 'rollcall' })
  await check(page, theme, 'rollcall-settings')

  // ---- Mess: a weekday and a weekend ------------------------------------
  await page.goto(`${BASE}/mess`, { waitUntil: 'networkidle' })
  await check(page, theme, 'mess')
  await click(page, 'SUN', { theme, state: 'mess' })
  await check(page, theme, 'mess-sunday')

  // ---- The rest, default state ------------------------------------------
  for (const [name, path] of [
    ['rooms', '/rooms'],
    ['tools', '/tools'],
    ['profile', '/profile'],
    ['info', '/info'],
    ['campus', '/campus'],
    ['map', '/map'],
    ['pyq', '/pyq'],
    ['about', '/about'],
    ['landing', '/'],
    ['select-branch', '/select/branch'],
    ['select-hostel', '/select/hostel'],
    ['404', '/no-such-page'],
  ]) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await check(page, theme, name)
  }

  // ---- PYQ: pick a session, then open the viewer -------------------------
  await page.goto(`${BASE}/pyq`, { waitUntil: 'networkidle' })
  const session = page.getByRole('button', { name: /2023-24/ }).first()
  if (await session.count()) {
    await session.click()
    await check(page, theme, 'pyq-papers')
    const paper = page.getByRole('button', { name: /VIEW/i }).first()
    if (await paper.count()) {
      await paper.click()
      await check(page, theme, 'pyq-viewer')
    }
  }

  // ---- Tools: every section --------------------------------------------
  await page.goto(`${BASE}/tools`, { waitUntil: 'networkidle' })
  for (const s of ['CGPA', 'TRANSPORT', 'LINKS', 'PLACEMENTS', 'BACKUP']) {
    const link = page.getByRole('link', { name: s, exact: false }).first()
    if ((await link.count()) === 0) continue
    await link.click()
    await check(page, theme, `tools-${s.toLowerCase()}`)
  }

  await ctx.close()
}

await browser.close()

console.log(`\nSwept ${checks} interactive states across light and dark.`)
if (errors.length === 0) {
  console.log('PASS — no console errors, no contrast failures, no overflow.')
} else {
  console.log(`\nFAIL — ${errors.length} issue(s):`)
  for (const e of [...new Set(errors)]) console.log('  - ' + e)
  process.exitCode = 1
}
