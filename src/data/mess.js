// ---------------------------------------------------------------------------
// MESS BOARD — PLACEHOLDER DATA
//
// Every menu below is invented. This is the single biggest data-entry job in
// the app: 7 hostels x 7 days x 4 meals. Collect real menus per hostel and
// replace. Any hostel without an entry falls back to DEFAULT_WEEK.
//
// Shape: MESS[HOSTEL_CODE][DAY][MEAL] = string[]
// ---------------------------------------------------------------------------

export const MEALS = [
  { key: 'breakfast', label: 'BREAKFAST', time: '7:30 – 9:30', accent: 'var(--color-amber)' },
  { key: 'lunch', label: 'LUNCH', time: '12:30 – 2:30', accent: 'var(--color-sky)' },
  { key: 'snacks', label: 'SNACKS', time: '5:00 – 6:00', accent: 'var(--color-coral)' },
  { key: 'dinner', label: 'DINNER', time: '7:30 – 9:30', accent: 'var(--color-teal)' },
]

const day = (breakfast, lunch, snacks, dinner) => ({ breakfast, lunch, snacks, dinner })

export const DEFAULT_WEEK = {
  MON: day(
    ['Aloo Paratha + Curd', 'Boiled Egg (2) / Banana', 'Bread + Butter + Jam', 'Tea / Milk'],
    ['Rajma', 'Jeera Rice', 'Chapati', 'Salad + Pickle'],
    ['Samosa', 'Green Chutney', 'Tea / Coffee'],
    ['Kadhi Pakora', 'Plain Rice', 'Chapati', 'Gulab Jamun'],
  ),
  TUE: day(
    ['Poha + Sev', 'Boiled Egg (2) / Apple', 'Bread + Butter', 'Tea / Milk'],
    ['Chole', 'Plain Rice', 'Chapati', 'Boondi Raita'],
    ['Bread Pakora', 'Tea / Coffee', 'Biscuits (2)'],
    ['Mix Veg', 'Dal Tadka', 'Chapati', 'Rice + Salad'],
  ),
  WED: day(
    ['Idli + Sambar', 'Coconut Chutney', 'Boiled Egg (2) / Fruit', 'Tea / Milk'],
    ['Paneer Butter Masala', 'Jeera Rice', 'Chapati', 'Salad'],
    ['Veg Sandwich', 'Tea / Coffee', 'Namkeen'],
    ['Aloo Gobhi', 'Dal Fry', 'Chapati', 'Rice + Papad'],
  ),
  THU: day(
    ['Puri + Aloo Sabzi', 'Boiled Egg (2) / Banana', 'Bread + Jam', 'Tea / Milk'],
    ['Kadhai Paneer', 'Plain Rice', 'Chapati', 'Cucumber Raita'],
    ['Pav Bhaji', 'Tea / Coffee'],
    ['Sarson Saag', 'Makki Roti / Chapati', 'Rice', 'Jaggery'],
  ),
  FRI: day(
    ['Upma + Chutney', 'Boiled Egg (2) / Apple', 'Bread + Butter', 'Tea / Milk'],
    ['Dal Makhani', 'Jeera Rice', 'Chapati', 'Salad + Pickle'],
    ['Veg Cutlet', 'Ketchup', 'Tea / Coffee'],
    ['Shahi Paneer', 'Plain Rice', 'Chapati', 'Ice Cream'],
  ),
  SAT: day(
    ['Chole Bhature', 'Boiled Egg (2) / Fruit', 'Tea / Milk'],
    ['Veg Biryani', 'Raita', 'Chapati', 'Papad'],
    ['Maggi', 'Tea / Coffee'],
    ['Malai Kofta', 'Plain Rice', 'Chapati', 'Salad'],
  ),
  SUN: day(
    ['Masala Dosa', 'Sambar + Chutney', 'Boiled Egg (2) / Banana', 'Tea / Milk'],
    ['Chicken Curry / Soya Chaap', 'Plain Rice', 'Chapati', 'Onion Salad'],
    ['Fruit Chaat', 'Tea / Coffee'],
    ['Dal Tadka', 'Mix Veg', 'Chapati', 'Rice + Kheer'],
  ),
}

export const MESS = {
  // Add per-hostel overrides here. Everything else uses DEFAULT_WEEK.
  CVR: DEFAULT_WEEK,
}

export function menuFor(hostel, dayKey) {
  return (MESS[hostel] ?? DEFAULT_WEEK)[dayKey] ?? DEFAULT_WEEK.MON
}

/** Which meal is closest to now — drives the landing-page subtitle. */
export function currentMeal(mins) {
  if (mins < 9 * 60 + 30) return MEALS[0]
  if (mins < 14 * 60 + 30) return MEALS[1]
  if (mins < 18 * 60) return MEALS[2]
  return MEALS[3]
}
