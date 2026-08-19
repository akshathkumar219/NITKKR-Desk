# NITKKR BOARD

An unofficial student companion for NIT Kurukshetra — timetable, attendance ("roll call"),
mess board, open-room checker, PYQ browser, campus map and a small toolkit.

Built from the PEC MANAGE teardown: same information architecture, own visual language,
and the structural problems from that app fixed rather than copied.

**Everything is local.** No backend, no login, no database. All user data lives in this
browser's `localStorage`. Nothing is ever uploaded.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build
```

Node 18+ required.

### Deploy

`dist/` is a static SPA — it needs a catch-all rewrite so deep links like `/rollcall` work.

- **Netlify** — `public/_redirects` is already set up. Drag `dist/` in, or connect the repo.
- **Vercel** — `vercel.json` is already set up.
- **Anything else** — rewrite all unmatched paths to `/index.html`.

---

## Everything you need to replace

All placeholder data lives in `src/data/`. **None of it is real.** Every file has a header
comment saying so. Replace in roughly this order:

| File | What's in it | Priority |
|---|---|---|
| `src/data/campus.js` | Branch codes and names, hostel list | **Do first** — everything keys off these |
| `src/data/timetables.js` | Class timetables. Only CSE Year 2 is filled in | **The big one** |
| `src/data/mess.js` | Mess menus, 7 days × 4 meals per hostel | Biggest volume of typing |
| `src/data/info.js` | Academic calendar, helpline numbers, landmarks, links | Verify every phone number |
| `src/data/pyq.js` | Past-paper list and hosting URLs | Only host what you may share |

Two things to be careful about before you share this with anyone:

1. **The helpline numbers are placeholders.** A wrong emergency number is worse than none.
2. **The academic calendar dates are invented.** Copy them from the official notice.

---

## Adding a timetable

`src/data/timetables.js`, shape:

```js
TIMETABLES.CSE[3] = [
  {
    id: 'cse3-mon-1',        // must be unique and STABLE — attendance keys off it
    day: 'MON',              // MON | TUE | WED | THU | FRI
    start: 9 * 60,           // minutes since midnight — 9:00 AM
    end: 10 * 60,
    name: 'Operating Systems',
    code: 'CSPC-301',
    room: 'LT-4',            // '+' separates parallel rooms: 'CL-1+CL-2'
    group: 'A1',             // optional batch
    type: 'lecture',         // lecture | lab | tutorial | break | other
  },
]
```

> **Never renumber an existing `id`.** Attendance records are stored as
> `` `${date}|${sessionId}` ``, so changing an id orphans every mark against it.

Times are **integers, not strings**. This is the one significant structural change from the
reference app, which stored `"10-12 noon"` and had to re-parse it everywhere. Integers make
the week grid, the open-room checker and "next class" plain arithmetic.

Branches and years with no published timetable aren't broken — they show an empty state and
the user builds their own via **Edit Board**. Those edits are stored per branch-year and
layered over the published data, so updating `timetables.js` later doesn't wipe them.

---

## Project layout

```
src/
  data/          all placeholder content — the stuff you replace
  lib/
    time.js      minute arithmetic, parsing, formatting
    storage.js   localStorage hooks, profile, theme, backup/restore
    board.js     effective timetable = published + user overrides
    rollcall.js  attendance tallies and the safe-to-skip maths
  ui/index.jsx   design primitives: Panel, Chip, Segmented, Modal, Ring, Meter…
  components/    Shell (sidebar + mobile nav), PlainShell, SessionModal
  pages/         one file per route
```

### Routes

| Route | Page |
|---|---|
| `/` | Landing / live status board |
| `/welcome` | First-run name capture |
| `/select/branch` · `/select/hostel` · `/select/info` | Onboarding pickers |
| `/home` | Timetable — day list, week grid, search, edit mode |
| `/mess` | Mess board |
| `/rollcall` | Attendance — today, subjects, backfill |
| `/rooms` | Open-room checker |
| `/tools` | Skip guard, CGPA, transport, links, placements, backup |
| `/pyq` · `/map` · `/campus` | PYQ browser, campus map, institute info |
| `/info` · `/profile` · `/about` | Hub, profile, disclaimer |

Unlike the reference app, secondary sections have real routes instead of `?tab=` query
params — better deep links and working browser history.

---

## Design system

Tokens live in `src/index.css` under `@theme`. Change them there, not in components.

- **Type** — Bricolage Grotesque (display), Figtree (body), JetBrains Mono (all labels/chrome)
- **Core** — ink `#12121A`, paper `#FAF7F2`, brand cobalt `#2F4EEA`
- **Accents** — acid `#B8FF3C`, coral `#FF5C7A`, amber `#FFB627`, violet `#8B5CF6`, teal `#00C2A8`, sky `#58C4FF`
- **Shape** — 3px radius (sharp), 2px borders, hard offset shadows (`4px 4px 0 0 ink`), no blur
- **Voice** — departure-board register: BOARD · LIVE, NEXT DEPARTURE, ROLL CALL, OPEN ROOMS

Dark mode is a `.dark` class on `<html>`, set before first paint by an inline script in
`index.html` so there's no flash. Hard shadows drop away in dark mode and borders carry the
structure instead.

---

## Verification

`verify.mjs` is a Playwright script that loads all 17 routes across four configurations
(desktop light, desktop dark, mobile, fresh-install), checks for console errors, blank
renders and horizontal overflow, then runs an interaction pass: week grid renders, add-session
saves and survives reload, roll-call marking updates the ring, backup export downloads.

```bash
npm run build
npx vite preview --port 4173 &
node verify.mjs           # screenshots land in shots/
```

---

## Known gaps

- Only **CSE Year 2** has a sample timetable; everything else is empty by design.
- **Open Rooms** reads published timetables only. Personal edits are private to a device, so
  they can't tell you about other people's rooms. Rooms booked for non-class use won't show.
- **No cross-device sync.** Clearing browser data deletes everything. Export a backup.
- The **CGPA grade scale** in `src/pages/Tools.jsx` assumes a 10-point scale — check yours.

### The one upgrade worth doing next

Keep localStorage as the source of truth, then add *optional* sync behind a magic-link login
(Supabase free tier is enough). Users who don't want an account never see it; users who do get
cross-device access and insurance against losing a semester of attendance to a cleared cache.
That's roughly a weekend, and it's the thing that makes this materially better than a re-skin.

---

## Disclaimer

Unofficial student project. Not affiliated with, endorsed by, or maintained by NIT Kurukshetra.
Verify anything important on official institute channels.
