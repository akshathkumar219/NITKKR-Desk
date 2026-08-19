// ---------------------------------------------------------------------------
// MESS BOARD — generated from content/mess/*.md
//
// One file per hostel, named by its code: content/mess/CVR.md
// Any hostel without a file falls back to the first menu that exists, and the
// Mess page shows a "shared menu" banner so nobody trusts the wrong food.
//
// Shape: MESS[HOSTEL][DAY][MEAL] = string[]
// ---------------------------------------------------------------------------

import generated from './generated/mess.json'

export const MEALS = [
  { key: 'breakfast', label: 'BREAKFAST', time: '7:30 – 9:30', accent: 'var(--color-amber)' },
  { key: 'lunch', label: 'LUNCH', time: '12:30 – 2:30', accent: 'var(--color-sky)' },
  { key: 'snacks', label: 'SNACKS', time: '5:00 – 6:00', accent: 'var(--color-coral)' },
  { key: 'dinner', label: 'DINNER', time: '7:30 – 9:30', accent: 'var(--color-teal)' },
]

export const MESS = generated

/**
 * The stand-in week for hostels with no menu of their own. Whichever hostel
 * happens to be first — arbitrary, but the UI always labels it as shared, so
 * the fallback is visible rather than silently wrong.
 */
export const DEFAULT_WEEK = Object.values(generated)[0] ?? {}

export function menuFor(hostel, dayKey) {
  return (MESS[hostel] ?? DEFAULT_WEEK)[dayKey] ?? DEFAULT_WEEK.MON ?? {}
}

/** Which meal is closest to now — drives the landing-page subtitle. */
export function currentMeal(mins) {
  if (mins < 9 * 60 + 30) return MEALS[0]
  if (mins < 14 * 60 + 30) return MEALS[1]
  if (mins < 18 * 60) return MEALS[2]
  return MEALS[3]
}
