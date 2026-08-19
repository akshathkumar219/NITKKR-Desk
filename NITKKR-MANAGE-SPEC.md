# PEC MANAGE — Full Teardown & Build Spec

**Source:** https://pecmanage.netlify.app/
**Audited:** 14 Aug 2026, live site, Chrome
**Purpose:** reference spec for building an equivalent app for NIT Kurukshetra

**How to read confidence tags:**

- `[Observed]` — I saw it in the running app or in the shipped bundle
- `[Inferred]` — deduced from behaviour; not directly confirmed
- `[Unverified]` — could not check in this session

---

## 0. TL;DR

A **client-side-only React SPA**. No backend, no auth, no database. All user data lives in `localStorage`. All institutional data (timetables, mess menus, PYQ links, campus landmarks, calendar) is **hardcoded into the JS bundle** — the bundle is ~1.0 MB, and that size is almost entirely data, not logic.

The engineering here is a weekend. The two months went into **collecting the data** and **iterating on the visual language**. Plan your effort the same way: 80% data, 15% design, 5% code.

---

## 1. Tech stack

| Layer | What they used | Evidence |
|---|---|---|
| Framework | React 18 (SPA) | `[Observed]` JSX runtime `g.jsx` in bundle |
| Router | React Router (client-side, `path:` route objects) | `[Observed]` router identifiers + route table in bundle |
| Build | Vite | `[Observed]` `/assets/index-<hash>.js` + `.css` naming |
| Styling | Tailwind CSS **v4** | `[Observed]` `--spacing`, `--text-*--line-height`, oklch color tokens |
| Icons | Lucide | `[Observed]` `lucide` present in bundle |
| Drag & drop | a draggable lib (dnd-kit or similar) | `[Observed]` draggable identifiers in bundle |
| PWA | `vite-plugin-pwa` | `[Observed]` `registerSW.js` + `manifest.webmanifest`; Workbox `[Inferred]` |
| Host | Netlify (free tier), SPA redirect to `index.html` | `[Observed]` deep links like `/attendance` resolve |
| Persistence | `localStorage` only | `[Observed]` network trace shows zero API calls |
| Backend | **None** | `[Observed]` |

**Total network requests on cold load:** HTML, 1 JS bundle, 1 CSS file, `registerSW.js`, `manifest.webmanifest`, `icon.svg`, Google Fonts CSS + 2 woff2. Nothing else. No analytics, no telemetry, no Firebase/Supabase.

### PWA manifest (verbatim)

```json
{
  "name": "PEC MANAGE",
  "short_name": "PEC MANAGE",
  "description": "Student timetable, mess menu and college info for PEC Chandigarh",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFD028",
  "theme_color": "#000000",
  "lang": "en",
  "scope": "/",
  "orientation": "portrait-primary",
  "icons": [{ "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" }]
}
```

---

## 2. Route map `[Observed — extracted from bundle]`

```
/                     Landing / hero + status card
/welcome              First-run name capture
/select/branch        Year picker + branch grid
/select/hostel        Hostel grid
/select/info          Info selection (pre-onboarding variant)
/home                 Main app shell — 4 tabs via ?tab=
/home?tab=freenow     Free room checker
/home?tab=info        Campus info (calendar, helpline, links)
/attendance           Attendance tracker
/tools                Student productivity tools (6 sub-tabs)
/pyq                  Previous year questions browser
/map                  Campus map
/profile              Edit profile
/info                 Info hub (6-tile launcher)
/about                About / disclaimer / credits
*                     404
```

Two navigation shells exist:

- **Pre-onboarding** (`/`, `/select/*`, `/pyq`, `/map`): full-bleed, centered, a floating BACK button, grid background, no sidebar.
- **Post-onboarding** (`/home`, `/attendance`, `/tools`, `/profile`, `/info`): persistent left sidebar + content column.

---

## 3. Page-by-page spec

### 3.1 `/welcome` — First contact `[Observed]`

Single centered card on a grid background.

- Eyebrow: `SYNC // INITIALISING` (mono, uppercase, letter-spaced)
- H1: `WHAT SHOULD I CALL YOU?`
- Sub: `ONE NAME. STORED ON THIS DEVICE ONLY.`
- One text input, placeholder `FIRST NAME`
- Primary button `CONTINUE` (solid black, hard offset shadow)
- Ghost link `SKIP FOR NOW`
- Footer rule + `STORED ON THIS DEVICE ONLY. NEVER UPLOADED.`

**The whole "login" is this.** Writes one string to localStorage. No account, no password, no server.

### 3.2 `/` — Landing `[Observed]`

- Pill badge: `THE ULTIMATE STUDENT TOOL`
- Giant two-line wordmark, `--text-9xl`-ish, tight tracking
- Easter egg top-right: BB-8 illustration + handwritten-style caption *"Yes, this is a dark mode toggle"* with an arrow. It **is** the theme toggle.
- **Status card** ("SYNC" panel):
  - Left: green pulsing dot + `SYNC // ONLINE` (`@keyframes sync-dot-pulse`)
  - Right: live clock `HH:MM · DDD`
  - Avatar square (yellow, initials or `??`)
  - Headline changes by state: `STANDING BY FOR FIRST CONTACT.` when no name set
  - Chips showing current `BRANCH · YEAR` and `HOSTEL`
  - Wide CTA: `SELECT YOUR BRANCH` → `PICK YOUR BRANCH` once partially set
  - Tip line pointing at Info → Edit Profile
- **Three launcher tiles** below, content depends on onboarding state:
  - Not onboarded: `SELECT YOUR BRANCH` / `SELECT YOUR HOSTEL` / `INFO`
  - Onboarded: `TIMETABLE` / `MESS MENU` / `INFO` with live subtitles (`DATA SCIENCE · YEAR 1`, `KURUKSHETRA · BREAKFAST`)
- Footer: `© 2026 PEC CHANDIGARH`

### 3.3 `/select/branch` `[Observed]`

- Eyebrow with graduation-cap icon: `DEPARTMENT SELECTION`
- H1 `SELECT YOUR BRANCH`, right-aligned mono description
- **Year segmented control**: 1 / 2 / 3 / 4 (active = solid black)
- Grouped grid:
  - `ENGINEERING`: DS, META, EE, MECH, CIVIL, PROD, MNC, AERO, VLSI, AI, ECE, CSE (12)
  - `DESIGN`: B DES (1)
- Card = big display code + mono subtitle `<CODE> TIMETABLE` + a thin divider rule

**Full branch label map `[Observed]`:**

| Code | Full name |
|---|---|
| DS | Data Science |
| META | Metallurgical & Materials |
| EE | Electrical |
| MECH | Mechanical |
| CIVIL | Civil |
| PROD | Production & Industrial |
| MNC | Mathematics & Computing |
| AERO | Aerospace |
| VLSI | VLSI Design |
| AI | Artificial Intelligence |
| ECE | Electronics & Communication |
| CSE | Computer Science |
| B DES | Bachelor of Design |

### 3.4 `/select/hostel` `[Observed]`

Six cards: SHIVALIK, HIMALAYA, KURUKSHETRA, ARAVALI, KALPANA (Kalpana Chawla), VINDHYA. Same card pattern. Sub-line: `<NAME> HOSTEL`. Description: *"Choose your hostel to view the correct daily mess menu."*

### 3.5 `/home` — Timetable (default tab) `[Observed]`

**Header panel:**

- Icon tile (blue) + H1 `TIMETABLE`
- Mono sub: `STAY SYNCHRONIZED · <BRANCH> · YEAR <N>`
- Two dropdowns top-right: BRANCH (13 options), YEAR (4 options)
- Day tabs: MON TUE WED THU FRI (active = solid black)
- View toggle: **list** / **grid** icon pair
- Search input: `SEARCH COURSE / ROOM / CODE...`
- `EDIT TIMETABLE` button

**Empty state** (Year 1, any branch): `YEAR 1 TIMETABLE COMING SOON` — *"First-year written timetables aren't published yet for any branch. You can still add sessions manually in edit mode."*

**Day view** (list):

- Sub-header bar: `DAY VIEW · YEAR 3` / big day name / `N SESSIONS` right-aligned
- Session cards in a 3-up grid, each with:
  - Time chip (blue tint) e.g. `10-12 NOON`
  - Type chip: `LAB` / `LECTURE` / `BREAK` / `TUTORIAL` / `OTHER`
  - Course title (display font, large)
  - Course code in mono angle brackets: `<DSN5001>`
  - Room chips: `301+303+402+L-19`
  - Batch/group chip: `DS1+DS2+DS3+DS4`
  - Circular attendance status badge, top-right (`—` when unmarked)
  - Footer strip: `OPEN TRACKER TO LOG THIS COURSE` + `TRACKER` button
- `BREAK` type renders a bare card (no code, no room, no tracker)

**Week grid view:**

- Header: `WEEK GRID · 25 BLOCKS · BATCHES GROUPED`
- Columns MON–FRI, hour rail 8 AM → 5 PM+ on the left
- Blocks positioned and height-scaled by duration
- Block colors by type — lecture = light blue `#93c5fd`-family, lab = lavender/purple, break = neutral
- Block content: title, room, time

**Edit mode** (after `EDIT TIMETABLE`):

- Toolbar swaps to: `DONE EDITING` (lime) / `+ ADD SESSION` (blue) / `RESET TEMPLATE` (outline)
- Grid header becomes `WEEK GRID · 25 BLOCKS · DRAG TO RESCHEDULE`
- Each day column header gets a `+` chip
- Each block gets a drag handle (⠿)
- Blocks are drag-and-drop repositionable

**Add Session modal `[Observed]` — this is your session schema:**

| Field | Type | Notes |
|---|---|---|
| DAY | select | MON/TUE/WED/THU/FRI |
| TIME | text | free text, e.g. `9-10 am`, `1-3 pm` |
| COURSE NAME | text | |
| COURSE CODE | text | |
| LOCATION / ROOM | text | |
| GROUP | text | e.g. `G1` |
| TYPE | select | Lecture / Lab / Break / Tutorial / Other |

Buttons: `SAVE` (lime) / `CANCEL`. Note: *"Changes apply to both day and week views."*

> Time is a **free-text string**, not structured. That's why the grid layout logic has to parse `"10-12 noon"`. If you rebuild, store `startMin`/`endMin` as integers and render the label — cleaner and it makes Free Now trivial.

### 3.6 `/home` — Mess Menu tab `[Observed]`

- Icon tile (orange) + H1 `MESS MENU`
- Mono sub: `EAT SLEEP REPEAT · <HOSTEL> HOSTEL`
- Hostel dropdown top-right
- Day tabs **MON–SUN** (7, unlike timetable's 5)
- Lime badge `SHOWING TODAY` when viewing the current day
- Four meal cards side by side, each: colored icon tile, meal name, mono time range, numbered items (`01`–`04`) with divider rules

| Meal | Time | Icon tint |
|---|---|---|
| BREAKFAST | 7:30 – 9:30 | yellow |
| LUNCH | 12:00 – 2:00 | blue |
| SNACKS | 4:30 – 6:00 | pink |
| DINNER | 7:30 – 9:30 | green |

Data shape: `hostel → day → meal → string[]`. 6 hostels × 7 days × 4 meals = **168 item lists** to collect. This is the single biggest data-entry job in the app.

### 3.7 `/attendance` `[Observed]`

**Summary panel:**

- Large circular progress ring, center = overall %, label `OVERALL` (shows `—` when nothing logged)
- Eyebrow `ATTENDANCE TRACKER`
- Headline `NOTHING LOGGED` (empty state), sub `MARK A CLASS TO START TRACKING`
- Chip: `SINCE SAT 15 AUG`

**Collapsible `SETTINGS`:**

- `REQUIRED ATTENDANCE` — number input, default **75**, `SAVE` button
- `TRACKING SINCE` — date input, default today
- Helper: *"Classes before this date are ignored, so old timetable slots never show as unmarked."*

**Three tabs:**

1. **TODAY** — today's sessions with mark buttons. Empty state: `NO CLASSES TODAY` / `NEXT CLASS DAY · MONDAY`
2. **SUBJECTS** — per-course rows: title, mono `CODE · TYPE`, horizontal % bar, `NOT TRACKED YET` or stats, expand chevron
3. **FIX A DAY** — `FIX A PAST DAY`, date picker, then each scheduled session for that date with three buttons: `PRESENT` / `ABSENT` / `CANCELLED`. Empty: `NO CLASSES SCHEDULED ON THIS DATE.`

**Attendance math:**

```
attended  = count(PRESENT)
held      = count(PRESENT) + count(ABSENT)     // CANCELLED excluded
percent   = held === 0 ? null : (attended / held) * 100
canBunk   = floor(attended / threshold - held)           // classes you can skip
mustAttend= ceil((threshold*held - attended) / (1 - threshold))  // classes to recover
```
`[Inferred]` — standard formulas; the app's exact rounding not verified.

### 3.8 `/tools` — Student Productivity Tools `[Observed]`

Header: `STUDENT PRODUCTIVITY TOOLS`, sub `BUNK GUARD · CGPA · PLACEMENTS · BACKUP`.
Six colored pill tabs that scroll to sections: **BUNK GUARD** (lime), **CGPA** (blue), **TRANSPORT** (blue), **LINKS** (white), **PLACEMENTS** (pink), **BACKUP** (orange).
Below: three dropdowns — BRANCH / YEAR / HOSTEL.

**1. BUNK GUARD**
Contextual "what's next" card. States: `NO MORE CLASSES` / *"You are clear for the rest of today."* Plus a mess line: `MESS · BREAKFAST: <items>`. `[Inferred]` when classes remain it shows the next session and safe-to-skip status.

**2. SGPA / CGPA** — `LIVE GRADE ESTIMATE`
Big `SGPA 0.00` readout, empty state *"No courses yet — add your first row to start calculating."*, `ADD COURSE` button. Rows are credits + grade; weighted average. `[Inferred]` on exact grade→point scale.

**3. CHANDIGARH TRANSPORT** — `OPEN DIRECTIONS IN MAPS`
Five static destination chips: ISBT Sector 17, Chandigarh Railway Station, Airport, Sector 17 Plaza, Elante Mall. Each opens Google Maps directions.

**4. USEFUL LINKS** — `OFFICIAL PORTALS & STUDY TOOLS`, `6 LINKS`

| Category | Title | Description |
|---|---|---|
| CAMPUS | PEC OFFICIAL | College notices, academics, and campus updates |
| LEARN | NPTEL | Free engineering courses and certifications |
| LEARN | SWAYAM | Government online learning platform |
| DOCS | DIGILOCKER | Store marksheets and certificates securely |
| AID | NATIONAL SCHOLARSHIP PORTAL | Apply and track scholarship schemes |
| OFFICIAL | AICTE | Approvals, schemes, and student resources |

**5. PLACEMENT CHECKLIST** — `DRIVE PREP ESSENTIALS` (static content, 4 numbered items)

- `01 RESUME PACK` — PDF + Drive folder with projects and certificates.
- `02 DRIVE TRACKER` — Track company, role, CTC/stipend, eligibility, deadline, test date, and interview status.
- `03 WHATSAPP UPDATE FORMAT` — Company | Role | Deadline | Eligible branches | Apply link | Contact person.
- `04 ELIGIBILITY WATCH` — CGPA cutoff, backlog rules, and branch filters before applying.

**6. BACKUP / EXPORT** — `OFFLINE JSON SNAPSHOT`
*"Download your personal timetable, attendance, grades, and profile as JSON. Works fully offline."*
`EXPORT JSON` (save a snapshot you can restore later) / `IMPORT JSON` (restore from a previous backup file).

> This is the **only** recovery mechanism in the entire app. Clearing browser data with no export = total loss.

### 3.9 `/home?tab=freenow` — Free Now `[Observed]`

- Icon tile (green) + H1 `FREE NOW`, mono live clock below
- Right: green dot + `LIVE · UPDATES EVERY MINUTE`
- Two columns side by side:
  - `OCCUPIED` with a pink count chip `N ROOMS`
  - `FREE NOW` with a green count chip `N ROOMS`
- Empty states: *"No classes scheduled right now / All tracked locations appear free right now"* and *"No free rooms right now / Every tracked location is in use"*

Logic: union all room strings across all branch/year timetables → for current weekday + time, a room is OCCUPIED if any session uses it, else FREE. Re-evaluated every 60s. `[Inferred]`

### 3.10 `/pyq` — PYQ Browser `[Observed]`

Two-step flow on the pre-onboarding shell.

- H1 stacked three lines: `PREVIOUS` / `YEAR` / `QUESTIONS`
- `STEP #1 SELECT YEAR` — three square cards:
  - `2022-23` · 1ST SEMESTER - B.TECH.
  - `2023-24` · 2ND SEMESTER - B.TECH.
  - `2024-25` · COMING SOON (dashed border, disabled)
- Selected card fills lime
- `STEP #2 PAPERS — <year>` — cards with mono code chip, title, mono `<year> · <semester>`, `VIEW PAPER →`
- Footnote: `* PAPERS OPEN IN A VIEW-ONLY BROWSER. DOWNLOADS ARE DISABLED.`

**Paper viewer `[Observed]`:** `VIEW PAPER` is a `<button>`, not a link — it opens a **full-screen in-app viewer**, not a new tab. Lime toolbar with `← CLOSE`, `<CODE> · <TITLE>` on the left, and `VIEW ONLY · DOWNLOADS DISABLED` on the right. The document body showed `LOADING…` and never resolved during this audit — either the embed was blocked in my session or the source is flaky.

2022-23 papers observed: CH1101 Applied Chemistry I · ES1101 Introduction to Computing · ES1201 Engineering Drawing with CAD Software · ES1401 Intro. to Electronics & Electrical Engg. · MA1101 Calculus & Ordinary Differential Equations.

`[Inferred]` PDFs are hosted on Google Drive in preview mode — that's what gives "view-only, downloads disabled".

### 3.11 `/map` — Campus Map `[Observed]`

- Eyebrow `CAMPUS NAVIGATION`, H1 `CAMPUS MAP`
- Category filter chips: Hostels, Academic Blocks, Labs, Sports Grounds, Admin Areas
- `SEARCH LANDMARK` input + `OPEN IN MAPS` button
- Landmark cards, each with a category tag:

| Landmark | Tag |
|---|---|
| MAIN GATE | ENTRANCE |
| ADMIN BLOCK | ADMIN |
| CENTRAL LIBRARY | STUDY |
| ACADEMIC BLOCK | ACADEMIC |
| COMPUTER CENTRE | ACADEMIC |
| SHIVALIK HOSTEL | HOSTEL |
| KALPANA CHAWLA HOSTEL | HOSTEL |
| SPORTS COMPLEX | SPORTS |
| WORKSHOPS | LAB |
| CANTEEN | FOOD |

- Bottom: `LIVE MAP · PEC SECTOR 12` — embedded `maps.google.com/maps` iframe pinned to campus `[Observed]`
- Cards open Google Maps walking directions in a new tab

### 3.12 `/home?tab=info` — PEC Info `[Observed]`

- H1 `PEC INFO`, sub `CAMPUS INFORMATION · SECTOR 12, CHANDIGARH, 160012`, `OFFICIAL SITE` link
- **ABOUT** block with three stat tiles: `ESTABLISHED 1921` / `CAMPUS 146 ACRES` / `LOCATION SECTOR 12, CHD`
- **OFFICIAL CALENDAR** — `ODD SEMESTER 2026-27`, audience line, code chip `CODE 26271`, attribution `AS PER NOTICE OF PEC CHANDIGARH`. Date rows:

| Event | Date |
|---|---|
| CLASSES BEGIN | JUL 27, 2026 (MON) |
| MID-TERM EXAMS | OCT 01 – 08, 2026 |
| CLASSES END | NOV 19, 2026 (THU) |
| END-TERM EXAMS | NOV 26 – DEC 05, 2026 |
| WINTER BREAK (STUDENTS) | DEC 10, 2026 – JAN 10, 2027 |
| NEXT SEMESTER BEGINS | JAN 11, 2027 (MON) |

- Category filter chips: REGISTRATION, CLASSES, EXAMS, GRADES, BREAKS, EVENTS, HOLIDAYS, TEACHING DAYS
- **HELPLINE** — `EMERGENCY CONTACTS`: Campus Security `0172-2753051`, Medical Emergency `112`, Student Counsellor `SEE NOTICE BOARD`
- **RESOURCES** — `QUICK LINKS`: PEC Website, Academic Calendar, Library, T&P Cell

### 3.13 `/info` — Info Hub `[Observed]`

Header panel `INFO HUB` / `EVERYTHING IN ONE PLACE`, then six full-color tiles (this is the most visually striking screen — each tile is a saturated flat block with a black border, icon top-left, label bottom-left):

| Tile | Color | Target |
|---|---|---|
| EDIT PROFILE | purple `#a78bfa`-family | `/profile` |
| STUDENT PRODUCTIVITY TOOLS | lime `#c7f58b` | `/tools` |
| FREE NOW | blue `#54a0ff` | `/home?tab=freenow` |
| PYQ BROWSER | yellow `#ffd028` | `/pyq` |
| CAMPUS MAP | pink `#ff8fab` | `/map` |
| PEC INFO | white | `/home?tab=info` |
| ABOUT / DISCLAIMER | white | `/about` |

### 3.14 `/profile` `[Observed]`

- Chip `LOCAL ONLY`, eyebrow `EDIT PROFILE`, H1 `YOUR BOARD, YOUR NAME`
- Sub: *"Update how sync greets you, then jump to branch or hostel when you need a change."*
- Avatar square with initials (`??` if unset)
- `DISPLAY NAME` — shows `NO NAME SET` + `<BRANCH> · Y<N> · <HOSTEL>`
- `FIRST NAME` input + `SAVE NAME`
- `CHANGE BRANCH` row → current value
- `CHANGE HOSTEL` row → current value
- Footer: *"Everything here lives in this browser only — no cloud account."*

### 3.15 `/about` `[Observed]`

- H1 `PEC MANAGE`, *"Unofficial student companion for Punjab Engineering College (PEC) Chandigarh."*, *"Not affiliated with or endorsed by PEC Chandigarh administration."*
- **DISCLAIMER** — *"This app is an unofficial student project. Timetables, mess menus, PYQs, maps, and contacts may change without notice — always verify important info on official PEC channels."*
- **PRIVACY** — three bullets: on-device localStorage; no sign-in / no cloud account; no ads, external links open in new tab
- **CONTACT / ISSUES** + two credit cards (role, name, branch · year)

---

## 4. Design system `[Observed — pulled from computed CSS custom properties]`

Tailwind v4, `@theme` tokens. Aesthetic: **neo-brutalism** — hard black borders, zero-blur offset shadows, flat saturated color blocks, condensed display type over monospace labels.

### 4.1 Type

```css
--font-display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
--font-sans:    "Inter", ui-sans-serif, system-ui, sans-serif;
--font-mono:    ui-monospace, "Cascadia Code", "Segoe UI Mono", Menlo, monospace;
```

Also loaded from Google Fonts (some unused / PYQ-scoped): DM Sans, IBM Plex Mono, Syne. PYQ page has its own `--pyq-sans / --pyq-display / --pyq-mono` scope.

**The type rule that defines the whole look:**

- Headings → `--font-display`, weight 700–900, `tracking-tighter` (-0.05em), ALL CAPS, very large
- Labels, eyebrows, chips, metadata → **mono**, uppercase, `tracking-widest` (0.1em), `--text-xs`
- Body → Inter, sentence case (one of the few places that isn't uppercase)

Scale: xs `.75` / sm `.875` / base `1` / lg `1.125` / xl `1.25` / 2xl `1.5` / 3xl `1.875` / 4xl `2.25` / 5xl `3` / 6xl `3.75` / 7xl `4.5` / 9xl `8` rem.
Tracking: tighter `-.05em`, tight `-.025em`, normal, wide `.025em`, wider `.05em`, widest `.1em`.
Leading: tight `1.25`, snug `1.375`, relaxed `1.625`.

### 4.2 Shadows — the signature

```css
--shadow-neo-sm: 2px 2px 0 0 #000;
--shadow-neo:    4px 4px 0 0 #000;
--shadow-neo-lg: 6px 6px 0 0 #000;
```

Zero blur, zero spread, pure black. Utility classes `.neo`, `.neo-sm`, `.neo-lg`. Get this right and 60% of the look is done.

### 4.3 Color

```css
--color-accent-blue: #54a0ff;
--color-accent-pink: #ff8fab;
--color-black: #000;
--color-white: #fff;
```

Accent rotation array found in the bundle:
`["#54A0FF", "#FF8FAB", "#00D26A", "#FFD028", "#c7f58b", ...]` — assigned round-robin to cards/tiles.

Most-used hexes by frequency in the stylesheet:

| Hex | Uses | Role |
|---|---|---|
| `#475569` | 23 | slate-600, muted text |
| `#c7f58b` | 16 | lime — primary/save actions |
| `#ff8fab` | 8 | pink accent |
| `#111827` | 8 | near-black surface |
| `#86efac` | 8 | green-300, success |
| `#54a0ff` | 7 | blue accent |
| `#1e293b` | 7 | slate-800, dark card surface |
| `#f43f5e` | 6 | rose, danger/absent |
| `#22c55e` | 6 | green, present |
| `#ffd028` | 6 | brand yellow — sidebar/logo |
| `#f8fafc` `#f3f4f6` `#f0f0f0` | — | light backgrounds |
| `#0b161b` `#081318` | — | deepest dark surfaces |

**Light mode `[Observed via computed styles]`**

- Page background `#f3f4f6`, text `#0f172a`
- Card: white bg, **3px solid #000** border, radius ~17px, no shadow on the card itself
- `.neo` element: black bg, white text, 2px black border, radius 8.5px, `4px 4px 0 0 #000`
- Sidebar: brand yellow `#ffd028` header block

**Dark mode `[Observed]`**

- Toggled by `.dark` class on `<html>`; persisted to localStorage; defaults to `prefers-color-scheme`
- Page background deep navy with a subtle grid overlay
- Card bg `oklch(0.279 0.041 260.031)` = slate-800 `#1e293b`, border `3px solid oklch(0.554 0.046 257.417)` ≈ slate-500
- Shadows soften / mostly disappear; borders carry the structure instead

> Note this: in light mode the design is loud neo-brutalism (black borders + hard shadows). In dark mode it becomes a muted navy "terminal" look. They are almost two different design languages sharing one layout. Worth deciding deliberately which one *you* want to lead with.

### 4.4 Radius, spacing, motion

```css
--radius-md: .375rem;  --radius-lg: .5rem;   --radius-xl: .75rem;
--radius-2xl: 1rem;    --radius-3xl: 1.5rem;
--spacing: .25rem;     /* Tailwind v4 base unit */
--blur-sm: 8px;  --blur-md: 12px;
--ease-out:    cubic-bezier(0, 0, .2, 1);
--ease-in-out: cubic-bezier(.4, 0, .2, 1);
```

Keyframes in the bundle: `tools-chip-in`, `sync-caret-blink`, `sync-dot-pulse`, `ping`, `pulse`.
Motion is **restrained** — no page transitions, no scroll animation, no parallax. Just a blinking caret, a pulsing status dot, and staggered chip entrances on the tools page. Part of why it reads as "a tool" rather than "a portfolio piece".

### 4.5 Recurring components

| Component | Description |
|---|---|
| Eyebrow | mono, xs, uppercase, widest tracking, muted — above every H1 |
| Panel | bordered container with header strip; holds controls |
| Neo button | solid fill, 2px black border, `4px 4px 0 0 #000`, uppercase |
| Segmented control | row of buttons; active = solid black, inactive = surface + border |
| Chip | small mono uppercase pill; tinted by semantic meaning |
| Icon tile | rounded square, saturated bg, black icon — one per page header |
| Stat tile | label above, big value below, in a bordered box |
| Status card | live dot + mono status text + clock |
| Empty state | centered display headline + mono explanation line |
| Color tile | full-bleed saturated launcher block (Info Hub) |

### 4.6 Voice

The copy is doing real work. Terminal/sci-fi register, always uppercase for chrome:

`SYNC // ONLINE` · `STANDING BY FOR FIRST CONTACT.` · `EAT SLEEP REPEAT` · `STAY SYNCHRONIZED` · `LIVE · UPDATES EVERY MINUTE` · `NOTHING LOGGED` · `YOUR BOARD, YOUR NAME` · `EVERYTHING STAYS ON THIS DEVICE.`

This is the cheapest, highest-leverage thing to copy in *spirit* — pick a register and hold it across every screen. It's also the most obvious thing to change if you want your version to not read as a clone.

---

## 5. Data model

### 5.1 Persisted (localStorage) `[Inferred — exact key names obfuscated by minification]`

```ts
{
  name:        string,              // display name
  branch:      BranchCode,          // "DS" | "CSE" | ...
  yearMap:     Record<Branch, "1"|"2"|"3"|"4">,   // year is stored per-branch
  hostel:      HostelCode,
  theme:       "light" | "dark",
  onboarded:   "1" | null,
  welcomeSeen: "1" | null,

  customTimetable: Record<`${branch}-${year}`, Session[]>,  // user edits/overrides
  attendance:      Record<`${isoDate}:${sessionId}`, "present"|"absent"|"cancelled">,
  attendanceSettings: { required: number, trackingSince: string /* ISO date */ },
  grades:          { courses: {name, credits, grade}[], createdAt: string }
}
```

Confirmed behaviours: theme write toggles `document.documentElement.classList`; there is a migration path (an older key is read, rewritten under a newer key, then removed); several booleans are stored as the string `"1"`.

### 5.2 Static (compiled into the bundle) `[Observed]`

```ts
Session {
  day:    "MON"|"TUE"|"WED"|"THU"|"FRI"
  time:   string        // free text: "10-12 noon", "9-10 am"
  name:   string
  code:   string        // "DSN5001"
  room:   string        // "301+303+402+L-19"
  group?: string        // "DS1+DS2+DS3+DS4"
  type:   "lecture"|"lab"|"break"|"tutorial"|"other"
}

timetables: Record<BranchCode, Record<Year, Session[]>>
mess:       Record<HostelCode, Record<Day7, Record<Meal, string[]>>>
pyq:        Record<AcademicYear, { code, title, semester, url }[]>
landmarks:  { name, category, mapsUrl }[]
links:      { category, title, description, url }[]
transport:  { name, mapsUrl }[]
calendar:   { event, date, category }[]
helpline:   { label, value }[]
```

---

## 6. Build order for the NIT KKR version

Ship in this sequence — each step is independently useful.

**Phase 1 — shell (½ day)**
Vite + React + React Router + Tailwind v4. Define the theme tokens (§4) first, before any component. Build: neo button, panel, chip, eyebrow, icon tile, empty state. Light + dark from the start — retrofitting dark mode is miserable.

**Phase 2 — onboarding + persistence (½ day)**
`/welcome` → `/select/branch` → `/select/hostel` → `/home`. A single `useLocalStorage` hook behind a `profile` store. Everything downstream reads from it.

**Phase 3 — timetable (1 day)**
Day list + week grid + search + edit mode. **Store times as `{startMin, endMin}` integers, not strings.** Seed with one real branch/year of NITKKR data so you're testing against reality.

**Phase 4 — attendance (1 day)**
Mark today, per-subject stats, fix-a-day backfill, threshold setting. Highest-retention feature in the whole app — students open it daily.

**Phase 5 — mess menu (½ day code, days of data)**
Trivial to render, brutal to populate. Start with one hostel; add more as you get menus.

**Phase 6 — tools + free-now (1 day)**
Bunk guard, CGPA, links, transport, backup export/import. **Do export/import early**, not last — it's your users' only safety net.

**Phase 7 — static content (ongoing)**
Campus map, PYQs, academic calendar, helpline. Pure data collection.

**Phase 8 — PWA + deploy (2 hours)**
`vite-plugin-pwa`, manifest, deploy to Netlify or Vercel with an SPA fallback rewrite.

---

## 7. What to do differently

**Fix these — they're real weaknesses, not style choices:**

1. **Free-text time strings.** Forces fragile parsing everywhere. Use minutes-since-midnight integers.
2. **All data in the JS bundle.** 1 MB parsed on every cold load. Split static data into JSON chunks and lazy-load per branch/year — a student only ever needs one.
3. **No recovery path.** Clear-site-data wipes a semester silently. Minimum: auto-prompt an export every N days. Better: optional cloud sync (see below).
4. **Year 1 timetables missing.** First-years are your biggest and most eager user segment, and they're the ones who'd install a campus app in week one. Do Year 1 *first*, not last.
5. **`?tab=` query params for major sections.** Give Free Now and Campus Info real routes — better deep links, better history.

**The one genuine upgrade:**

Keep localStorage as the source of truth, add **optional** sync behind a magic-link login (Supabase free tier, ~50 lines). Users who don't want an account never see it. Users who do get cross-device + deletion insurance. This is the single feature that makes yours materially better rather than a re-skin — and it's a weekend, not two months.

**Make it visibly yours:**

The neo-brutalism + terminal-copy combo is distinctive enough that a straight copy will read as a copy — to your friend and to anyone who's seen both. Change at least: the display typeface, the accent palette, and the copy register. Keep the *structure* (which is the genuinely good part) and the information architecture.

**Legal/ethical:** mark it unofficial and unaffiliated, exactly as they did. Don't host copyrighted question papers directly — link to official or Drive-hosted view-only copies.

---

## 8. Data collection checklist

This is the real project. Everything else is a weekend.

- [ ] Timetables — every branch × every year (the big one; source from department noticeboards / class WhatsApp groups)
- [ ] Room/lab code list (needed for Free Now)
- [ ] Mess menus — every hostel × 7 days × 4 meals
- [ ] Hostel list + correct official names
- [ ] Branch codes + full department names
- [ ] Academic calendar (from the official notice)
- [ ] PYQ archive + view-only hosting
- [ ] Campus landmarks + Google Maps coordinates
- [ ] Emergency/helpline numbers (verify before publishing)
- [ ] Official portal links
- [ ] Local transport destinations for Kurukshetra

---

## 9. Verification notes

**Directly observed:** route table (from the bundle), all page copy and structure, every form field in Add Session, attendance mark options and settings, the six tools sections, design tokens via computed CSS, hex frequency from the stylesheet, PWA manifest verbatim, full network trace, branch and hostel lists, light and dark surface colors, React Router / Lucide / drag-lib presence in the bundle, the `maps.google.com/maps` iframe, and the full-screen PYQ viewer chrome.

**Inferred, not confirmed:** exact localStorage key names (minified, and the browser tooling blocked reading storage-shaped strings out of the bundle); attendance formula rounding; CGPA grade→point scale; Bunk Guard's populated state; where PYQ PDFs are actually hosted (no `drive.google.com` string in the bundle and the viewer never finished loading — so my earlier Drive guess is **not** supported; treat hosting as unknown); Workbox specifically as the SW library.

**Not verified:** mobile layout (window resize didn't take effect in this session — check it yourself on a phone, since it's a portrait-locked PWA and the mobile shell likely differs from the desktop sidebar); service worker caching strategy; 404 page; the populated Free Now state; Year 1 timetables for any branch (all empty).
