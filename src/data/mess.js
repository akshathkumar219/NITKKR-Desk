// ---------------------------------------------------------------------------
// MESS BOARD — generated from content/mess/*.md
//
// One file per hostel, named by its code: content/mess/H10.md, CVR.md
// Any hostel without a file falls back to the first menu that exists, and the
// Mess page shows a "shared menu" banner so nobody trusts the wrong food.
//
// Shape: MESS[HOSTEL][DAY][MEAL] = { items: string[], extra?: string }
// ---------------------------------------------------------------------------

import generated from './generated/mess.json'

export const MEALS = [
  {
    key: 'breakfast',
    label: 'BREAKFAST',
    time: '07:00 – 09:00 AM',
    startMins: 7 * 60,
    endMins: 9 * 60,
    accent: 'var(--color-acid)',
    iconKey: 'breakfast',
  },
  {
    key: 'lunch',
    label: 'LUNCH',
    time: '12:30 – 02:00 PM',
    startMins: 12 * 60 + 30,
    endMins: 14 * 60,
    accent: 'var(--color-orange)',
    iconKey: 'lunch',
  },
  {
    key: 'dinner',
    label: 'DINNER',
    time: '07:30 – 09:00 PM',
    startMins: 19 * 60 + 30,
    endMins: 21 * 60,
    accent: 'var(--color-sky)',
    iconKey: 'dinner',
  },
]

export const MESS = generated

/**
 * Check if an official menu exists for a hostel.
 */
export function hasHostelMenu(hostel) {
  return Boolean(MESS[hostel])
}

export function menuFor(hostel, dayKey, overrides = null) {
  const host = MESS[hostel] ?? {}
  const baseDay = host[dayKey] ?? {}
  if (!overrides || !overrides[dayKey]) return baseDay
  return {
    ...baseDay,
    ...overrides[dayKey],
  }
}

/** Which meal is currently active or next up. */
export function currentMeal(mins) {
  if (mins < 9 * 60 + 30) return MEALS[0]
  if (mins < 14 * 60 + 30) return MEALS[1]
  return MEALS[2]
}

/** Check if current time falls within serving hours */
export function isLiveMeal(meal, mins) {
  return mins >= meal.startMins && mins < meal.endMins
}
