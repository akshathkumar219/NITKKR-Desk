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
      if (seed) {
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
            '2026-08-10|cse2-mon-1': 'present',
            '2026-08-10|cse2-mon-2': 'present',
            '2026-08-11|cse2-tue-1': 'absent',
            '2026-08-11|cse2-tue-2': 'present',
            '2026-08-12|cse2-wed-1': 'present',
            '2026-08-12|cse2-wed-2': 'cancelled',
          }),
        )
        localStorage.setItem(
          'kkr.rollcall.settings',
          JSON.stringify({ required: 75, trackingSince: '2026-08-01' }),
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
        hostel: 'CVR',
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
  await page.getByRole('button', { name: 'EDIT BOARD' }).click()
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

await browser.close()

console.log(`\nRendered ${results.length} page loads across 4 configurations.`)
if (errors.length === 0) {
  console.log('PASS — no console errors, no blank pages, no horizontal overflow.')
} else {
  console.log(`\nFAIL — ${errors.length} issue(s):`)
  for (const e of [...new Set(errors)]) console.log('  - ' + e)
  process.exitCode = 1
}
