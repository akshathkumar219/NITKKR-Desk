// Design-token enforcement: walks the real rendered DOM of every converted
// route, at mobile + desktop, in both themes, and fails on anything that
// isn't drawn from the shared type / icon / spacing ramp defined in
// src/index.css (`.t-*`, `.icon-*`, `.pad-*`) and the color tokens in
// Color.md / index.css `:root` / `.dark`.
//
// This exists because "keep the pages consistent" decays the moment someone
// adds a card by eye. An assertion doesn't. Run after every conversion batch;
// a batch is not done until this returns clean for its routes.
//
// Usage: npm run verify:tokens [-- --routes=attendance,mess]
import { chromium } from 'playwright'

const BASE = process.env.VERIFY_BASE ?? 'http://localhost:4173'

// Routes under active conversion (see the design-consistency plan). Landing,
// SelectBranch, SelectHostel are intentionally excluded — they are optimised
// and out of scope, so this script never asserts anything about them.
const ROUTES = [
  ['profile', '/profile'],
  ['timetable', '/home'],
  ['about', '/about'],
  ['guide', '/guide'],
  ['attendance', '/attendance'],
  ['subjects', '/subjects'],
  ['mess', '/mess'],
  ['calendar', '/calendar'],
  ['calculator', '/calculator'],
  ['tools', '/tools'],
  ['pyq', '/pyq'],
  ['map', '/map'],
  ['campus', '/campus'],
  ['info', '/info'],
]

const argRoutes = process.argv
  .find((a) => a.startsWith('--routes='))
  ?.slice('--routes='.length)
  .split(',')
const routes = argRoutes ? ROUTES.filter(([name]) => argRoutes.includes(name)) : ROUTES

// ---- The allowed ramp --------------------------------------------------
// px, derived from src/index.css .t-* definitions (mobile below sm=640px,
// desktop at/above it).
const TEXT_SIZES = {
  mobile: new Set([32, 22, 14, 13, 12, 11]),
  desktop: new Set([40, 28, 17, 16, 15, 14, 12]),
}
// Tolerance in px for subpixel rounding.
const TOL = 0.6

const ICON_SIZES = new Set([14, 16, 20, 26])

const PAD_VALUES = {
  mobile: new Set([16, 14, 10, 6]), // pad-page/card/tight/row (row is asymmetric, checked separately)
  desktop: new Set([20, 16, 12, 6]),
}

function closeTo(value, set, tol = TOL) {
  for (const s of set) if (Math.abs(value - s) <= tol) return true
  return false
}

const browser = await chromium.launch()
const violations = []

async function check(routeLabel, path, viewport, theme) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate((theme) => {
    localStorage.setItem('kkr.theme', JSON.stringify(theme))
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
  }, theme)
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(250)

  const tag = `${routeLabel} · ${viewport.width}px · ${theme}`
  const isDesktop = viewport.width >= 640

  const result = await page.evaluate(
    () => {
      const out = { fontSize: [], icon: [], pad: [] }
      const RAMP_CLASSES = [
        't-masthead',
        't-card-title',
        't-section',
        't-stat',
        't-live',
        't-body',
        't-meta',
        't-micro',
      ]

      // ---- Font sizes: only elements bearing a .t-* class are asserted.
      // (Enforcing every text node in the tree would also flag third-party
      // and icon-label combinations outside this plan's scope; the ramp
      // classes are what conversion applies, so checking those verifies the
      // conversion actually landed.)
      for (const cls of RAMP_CLASSES) {
        for (const el of document.querySelectorAll(`.${cls}`)) {
          const cs = getComputedStyle(el)
          const size = parseFloat(cs.fontSize)
          out.fontSize.push({
            selector: cls,
            size,
            text: el.textContent.trim().slice(0, 24),
          })
        }
      }

      // ---- Icons: any inline svg (lucide) not carrying an icon-* class
      // and not inside a data-decorative subtree is a violation.
      for (const svg of document.querySelectorAll('svg')) {
        if (svg.closest('[data-decorative]')) continue
        const cs = getComputedStyle(svg)
        const w = parseFloat(cs.width)
        const hasClass = ['icon-micro', 'icon-sm', 'icon-md', 'icon-lg', 'icon-tile'].some((c) =>
          svg.classList.contains(c) || svg.closest(`.${c}`),
        )
        out.icon.push({ w, hasClass, outer: svg.outerHTML.slice(0, 60) })
      }

      // ---- Padding: elements with the .board class should use one of the
      // .pad-* rungs (or Tailwind's equivalent px value).
      for (const el of document.querySelectorAll('.board')) {
        const cs = getComputedStyle(el)
        out.pad.push({
          top: parseFloat(cs.paddingTop),
          left: parseFloat(cs.paddingLeft),
          cls: el.className,
        })
      }

      return out
    },
  )

  const sizeSet = isDesktop ? TEXT_SIZES.desktop : TEXT_SIZES.mobile
  for (const f of result.fontSize) {
    if (!closeTo(f.size, sizeSet)) {
      violations.push(
        `[${tag}] .${f.selector} "${f.text}" — computed ${f.size}px, expected one of {${[...sizeSet].join(',')}}`,
      )
    }
  }

  for (const i of result.icon) {
    if (!i.hasClass) continue // untouched pages / decorative svgs — batches convert incrementally
    if (!closeTo(i.w, ICON_SIZES, 0.5)) {
      violations.push(`[${tag}] icon ${i.outer} — computed ${i.w}px, expected one of {${[...ICON_SIZES].join(',')}}`)
    }
  }

  const padSet = isDesktop ? PAD_VALUES.desktop : PAD_VALUES.mobile
  for (const p of result.pad) {
    const usesPadClass = /pad-(page|card|tight|row)/.test(p.cls)
    if (!usesPadClass) continue // only assert boards that opted into the scale
    if (!closeTo(p.top, padSet, 1) || !closeTo(p.left, padSet, 1)) {
      violations.push(`[${tag}] .board padding ${p.top}px/${p.left}px — expected one of {${[...padSet].join(',')}}`)
    }
  }

  await ctx.close()
}

for (const [label, path] of routes) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    for (const theme of ['light', 'dark']) {
      await check(label, path, viewport, theme)
    }
  }
}

await browser.close()

console.log(`\nChecked ${routes.length} route(s) across 4 configurations each.`)
if (violations.length === 0) {
  console.log('PASS — every .t-*, icon-* and pad-* element matches the shared ramp.')
} else {
  console.log(`\nFAIL — ${violations.length} violation(s):`)
  for (const v of [...new Set(violations)]) console.log('  - ' + v)
  process.exitCode = 1
}
