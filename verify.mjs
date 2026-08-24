import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.VERIFY_BASE ?? 'http://localhost:4173'
const OUT = 'shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['welcome', '/welcome'],
  ['landing', '/'],
  ['select-branch', '/select/branch'],
  ['select-hostel', '/select/hostel'],
  ['select-info', '/select/info'],
  ['board-day', '/home'],
  ['mess', '/mess'],
  ['rollcall', '/rollcall'],
  ['rooms', '/rooms'],
  ['tools', '/tools'],
  ['pyq', '/pyq'],
  ['map', '/map'],
  ['campus', '/campus'],
  ['info', '/info'],
  ['subjects', '/subjects'],
  ['calculator', '/calculator'],
  ['profile', '/profile'],
  ['about', '/about'],
  ['404', '/does-not-exist'],
]

const errors = []
const results = []

const browser = await chromium.launch()

async function run(label, viewport, theme, seed) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()

  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_FAILED/.test(m.text()))
      errors.push(`[${label}] console: ${m.text()}`)
  })
  page.on('pageerror', (e) => errors.push(`[${label}] pageerror: ${e.message}`))

  // Seed localStorage so post-onboarding routes render real content.
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([theme, seed]) => {
      localStorage.setItem('kkr.theme', JSON.stringify(theme))
      localStorage.setItem('kkr.welcomed', JSON.stringify(true))
      // Retire the entry animation for route captures. It now mounts at the
      // app root, so without this it would cover every route screenshot, not
      // just `/`. Session-scoped, so it survives the reloads in this tab.
      sessionStorage.setItem('kkr.intro.plays', JSON.stringify(99))
      if (seed) {
        localStorage.setItem(
          'kkr.profile',
          JSON.stringify({
            name: 'Akshath',
            branch: 'CSE',
            hostel: 'H1',
            yearByBranch: { CSE: '2' },
            branchPicked: true,
            hostelPicked: true,
          }),
        )
        localStorage.setItem(
          'kkr.rollcall',
          JSON.stringify({
            // Real ids from src/data/generated/timetables.json (CSE Y2).
            // Regenerate these if the content pipeline's hash ever changes —
            // scripts/content/ids.test.mjs will fail loudly first.
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
          JSON.stringify({ required: 65, trackingSince: '2026-08-01' }),
        )
        localStorage.setItem(
          'kkr.grades',
          JSON.stringify([
            { id: 'g1', name: 'Data Structures', credits: '4', grade: '9' },
            { id: 'g2', name: 'Discrete Maths', credits: '3', grade: '8' },
          ]),
        )
      }
    },
    [theme, seed],
  )

  for (const [name, path] of ROUTES) {
    if (name === 'welcome' && seed) continue
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(250)

    // ---- Contrast --------------------------------------------------------
    // Catches the class of bug where a FIXED colour token (--color-ink /
    // --color-paper, which mean literal black/off-white for text on bright
    // accent fills) gets used as if it were theme-aware, producing e.g. a
    // near-black active state on a near-black dark-mode page.
    const lowContrast = await page.evaluate(() => {
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
      // Effective background: walk up until something is actually painted.
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
        // Only elements rendering their own text.
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
        // 3.0 is the WCAG floor for large text and UI components. Anything
        // under that is not a judgement call, it is unreadable.
        if (cr < 3) {
          out.push(`${cr.toFixed(2)}:1 "${own.slice(0, 32)}" (${cs.color} on rgb(${bg.r},${bg.g},${bg.b}))`)
        }
      }
      return [...new Set(out)].slice(0, 6)
    })
    for (const c of lowContrast) errors.push(`[${label}/${name}] low contrast ${c}`)

    const text = await page.evaluate(() => document.body.innerText.trim())
    const rootEmpty = await page.evaluate(
      () => document.getElementById('root').children.length === 0,
    )
    if (rootEmpty) errors.push(`[${label}] ${path} rendered an empty root`)
    if (text.length < 20) errors.push(`[${label}] ${path} rendered almost no text`)

    // Horizontal overflow check — common failure on mobile widths.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    if (overflow > 2) errors.push(`[${label}] ${path} overflows horizontally by ${overflow}px`)

    results.push({ label, path, chars: text.length })
    await page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: false })
  }

  await ctx.close()
}

await run('desk-light', { width: 1440, height: 900 }, 'light', true)
await run('desk-dark', { width: 1440, height: 900 }, 'dark', true)
await run('mob-light', { width: 390, height: 844 }, 'light', true)
await run('fresh', { width: 1440, height: 900 }, 'light', false)

// ---- Interaction smoke test -------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[interact] pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_FAILED/.test(m.text()))
      errors.push(`[interact] console: ${m.text()}`)
  })

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('kkr.welcomed', JSON.stringify(true))
    localStorage.setItem(
      'kkr.profile',
      JSON.stringify({
        name: 'Akshath',
        branch: 'CSE',
        hostel: 'H1',
        yearByBranch: { CSE: '2' },
        branchPicked: true,
        hostelPicked: true,
      }),
    )
  })

  // Week grid renders blocks
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
  await page.getByLabel('Week view').click()
  await page.waitForTimeout(300)
  const gridText = await page.locator('text=WEEK GRID').first().innerText()
  if (!/\d+ BLOCKS/.test(gridText)) errors.push('[interact] week grid header missing block count')
  await page.screenshot({ path: `${OUT}/interact-week-grid.png` })

  // Edit mode + add session
  await page.getByRole('button', { name: /EDIT (TIMETABLE|BOARD)/i }).click()
  await page.getByRole('button', { name: 'ADD SESSION', exact: true }).click()
  await page.waitForTimeout(200)
  await page.locator('#s-name').fill('Verification Seminar')
  await page.locator('#s-start').fill('4:00 pm')
  await page.locator('#s-end').fill('5:00 pm')
  await page.locator('#s-room').fill('LT-9')
  await page.getByRole('button', { name: 'SAVE', exact: true }).click()
  await page.waitForTimeout(400)
  const added = await page.locator('text=Verification Seminar').count()
  if (added === 0) errors.push('[interact] added session did not appear')
  await page.screenshot({ path: `${OUT}/interact-added-session.png` })

  // Persists across reload
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const persisted = await page.locator('text=Verification Seminar').count()
  if (persisted === 0) errors.push('[interact] added session did not persist across reload')

  // Roll call marking updates the ring
  await page.goto(`${BASE}/rollcall`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'BACKFILL', exact: true }).click()
  await page.waitForTimeout(200)
  const presentBtns = page.getByRole('button', { name: 'PRESENT' })
  if ((await presentBtns.count()) > 0) {
    await presentBtns.first().click()
    await page.waitForTimeout(300)
    const ring = await page.locator('svg + div p').first().innerText()
    if (!/%/.test(ring)) errors.push(`[interact] ring did not show a percentage (got "${ring}")`)
  } else {
    errors.push('[interact] no PRESENT buttons found in backfill')
  }
  await page.screenshot({ path: `${OUT}/interact-rollcall.png` })

  // Backup export produces a download
  await page.goto(`${BASE}/tools`, { waitUntil: 'networkidle' })
  const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
  await page.getByRole('button', { name: 'EXPORT JSON' }).click()
  const download = await dl
  if (!download) errors.push('[interact] export did not trigger a download')
  else if (!download.suggestedFilename().endsWith('.json'))
    errors.push('[interact] export filename is not .json')

  await ctx.close()
}

// ---------------------------------------------------------------------------
// Entry animation.
//
// The rule that matters here is design.md §1.3: information must never wait
// on an animation. So the assertion is not just "it plays and leaves" — it is
// that the dashboard underneath is already in the DOM while it plays.
// ---------------------------------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[intro] pageerror: ${e.message}`))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('kkr.welcomed', JSON.stringify(true))
    sessionStorage.removeItem('kkr.intro.plays')
  })

  const plays = async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    // Sample immediately — before the 2s auto-dismiss.
    return page.locator('.intro-overlay').count()
  }

  // First load: overlay present, and the real page readable behind it.
  if ((await plays()) !== 1) errors.push('[intro] did not play on a fresh visit')

  const behind = await page.evaluate(() => document.body.innerText)
  if (!/EVERYTHING STAYS ON THIS DEVICE/i.test(behind))
    errors.push('[intro] dashboard content is not present while the intro plays (design.md §1.3)')

  await page.screenshot({ path: `${OUT}/intro.png` })

  // Any interaction dismisses it (§11: never block content).
  await page.mouse.click(720, 450)
  await page.waitForTimeout(400)
  if ((await page.locator('.intro-overlay').count()) !== 0)
    errors.push('[intro] did not dismiss on interaction')

  // Loads 2..5 still play, the 6th does not.
  for (let i = 2; i <= 5; i++) {
    if ((await plays()) !== 1) errors.push(`[intro] did not play on load ${i} (limit is 5)`)
  }
  if ((await plays()) !== 0) errors.push('[intro] still playing after 5 loads')

  const count = await page.evaluate(() => sessionStorage.getItem('kkr.intro.plays'))
  if (Number(JSON.parse(count ?? '0')) !== 5)
    errors.push(`[intro] play counter is ${count}, expected 5`)

  await ctx.close()
}

// Reduced motion must skip the intro entirely (design.md §12).
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('kkr.welcomed', JSON.stringify(true))
    sessionStorage.removeItem('kkr.intro.plays')
  })
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  if ((await page.locator('.intro-overlay').count()) !== 0)
    errors.push('[intro] played despite prefers-reduced-motion')
  await page.screenshot({ path: `${OUT}/reduced-motion-landing.png` })
  await ctx.close()
}

await browser.close()

console.log(`\nRendered ${results.length} page loads across 4 configurations.`)
if (errors.length === 0) {
  console.log('PASS — no console errors, no blank pages, no horizontal overflow.')
} else {
  console.log(`\nFAIL — ${errors.length} issue(s):`)
  for (const e of [...new Set(errors)]) console.log('  - ' + e)
  process.exitCode = 1
}
