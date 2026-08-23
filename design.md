# Student Utility Website — Design System & Art Direction (`design.md`)

## 0. Core Design Thesis

**Calm information. Loud personality.**

This is a high-frequency student utility website for timetable, attendance, subjects, exams, assignments, notices, and related campus information. It must feel distinctive and expressive without sacrificing speed, readability, or predictability.

The visual identity is inspired by the **energy of Hobie Brown / Spider-Punk, comic-book printing, punk zines, paper collage, screen printing, photocopy imperfections, and editorial poster design**.

Do **not** make the website look like a literal Spider-Man/Marvel/Spider-Verse fan site. Borrow the visual principles, not copyrighted character art or an imitation of a specific movie frame.

The product should create this reaction:

> **First impression:** “This looks cool as hell.”  
> **After using it:** “Oh, it is actually extremely easy to use.”

The design philosophy is **B with moments of A**: approximately 70–85% functional clarity and 15–30% expressive personality depending on the page.

---

# 1. Non-Negotiable UX Principle

The website is a **utility first**.

Users may open it while:
- walking between classes,
- checking the next lecture,
- quickly checking attendance,
- looking at an exam time,
- checking a notice,
- using a phone one-handed.

Therefore:

1. Information hierarchy must always be obvious.
2. Navigation must remain conventional and predictable.
3. Important information must never require an animation to finish before it can be read.
4. Decorative effects must never reduce contrast, legibility, tap accuracy, or perceived performance.
5. The visual system may be expressive; the information architecture must remain disciplined.

**Never sacrifice usability for visual spectacle.**

---

# 2. Theme Strategy & Color System

Use **Light / Dark** as the primary theme switch.

The expressive style is part of the permanent brand identity. It exists in both light and dark themes with dedicated high-contrast palettes.

## 2.1 Foundation Palettes

### Dark Theme (`.dark`)
Dark mode feels like deep navy-black, night poster, printed comic surface:
- **Background (`--bg`)**: `#080D18` (Deep Navy-Black)
- **Surface (`--surface`)**: `#111A2B` (Midnight Blue)
- **Surface 2 (`--surface-2`)**: `#16223A` (Elevated Navy)
- **Primary Text (`--text`)**: `#F4F7FF` (Luminous White)
- **Muted Text (`--muted`)**: `#93A0B5` (Cool Slate)
- **Border (`--border`)**: `#26324A` (Crisp Slate Outline)
- **Border Strong (`--border-strong`)**: `#3A4A6B`
- **Primary Action (`--primary`)**: `#6C63FF` (Vibrant Purple)
- **Secondary (`--secondary`)**: `#38BDF8` (Sky Blue)
- **Disruption Accent (`--disruption`)**: `#FF4D6D` (Neon Coral)
- **Shadow Ink (`--shadow-ink`)**: `#808080` (Hard Cutout Lift)

### Light Theme (`:root`)
Light mode feels like warm off-white paper, crisp black ink, printed poster:
- **Background (`--bg`)**: `#FAF7F0` (Warm Paper Canvas)
- **Surface (`--surface`)**: `#FFFFFF` (Pure White)
- **Surface 2 (`--surface-2`)**: `#F4F1E8` (Soft Paper Tint)
- **Primary Text (`--text`)**: `#111111` (Deep Ink Black)
- **Muted Text (`--muted`)**: `#57534E` (Warm Slate)
- **Border (`--border`)**: `#111111` (2px Solid Ink Outline)
- **Border Strong (`--border-strong`)**: `#111111`
- **Primary Action (`--primary`)**: `#4F46E5` (Indigo)
- **Secondary (`--secondary`)**: `#0284C7` (Cobalt)
- **Disruption Accent (`--disruption`)**: `#D92D55` (Deep Crimson)
- **Shadow Ink (`--shadow-ink`)**: `#111111` (Hard Paper Cutout)

---

## 2.2 Accent & Card Theme Palettes

Each dashboard card and functional feature is mapped to a dedicated accent color pair:

| Accent Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--color-present` / `--color-acid` | `#16A34A` *(Emerald)* | `#36DA45` *(Acid Green)* | Top dividing line, Calendar card left line, Workspace icon button, active date cells, Classes Left card, event dots, text selection. |
| `--color-coral` | `#E60000` *(Electric Red)* | `#FF4F4F` *(Bright Soft Red)* | Left border, circular SVG progress gauge stroke, attendance status indicators. |
| `--color-amber` / `--warn-ink` | `#DAA520` *(Goldenrod)* | `#EFBF04` *(Electric Gold)* | Next Meal card, Student To-Dos left border, icon, and `+ ADD` button fill. |
| `--color-violet` | `#6C3BAA` *(Deep Royal Purple)* | `#A5A0FF` *(Neon Violet)* | Left border, `TODAY'S TIMETABLE` header, `FULL BOARD →` link, Live Break banners. |
| `--color-sky` | `#305CDE` *(Royal Blue)* | `#6395EE` *(Cornflower Blue)* | Student ID badge defaults, Info card (`/info`) border & label, maps & PYQ links. |
| `--color-teal` | `#0A8DA3` *(Deep Teal)* | `#35D5F0` *(Electric Cyan)* | User-selectable accent (profile badge, subjects, sessions, calendar). |
| `--color-orange` | `#EA580C` *(Burnt Orange)* | `#FF9F1C` *(Amber Orange)* | User-selectable accent; PYQs hub tile, one Mess meal card. |
| `--color-fuchsia` | `#C026D3` *(Fuchsia)* | `#E040FB` *(Neon Fuchsia)* | User-selectable accent; Map hub tile. |
| `--color-lime` | `#65A30D` *(Lime)* | `#99E80C` *(Electric Lime)* | User-selectable accent. |
| `--primary` | `#4F46E5` *(Indigo)* | `#6C63FF` *(Vibrant Purple)* | Global action buttons, focus rings, and primary links. |
| `--color-absent` / `--absent-ink` | `#DC2626` / `#B91C1C` | `#FF6B81` / `#FF8A99` | Short attendance warnings, critical alert chips. |

Every accent above (except `--primary`) carries a matching `-ink` token
(`--color-<name>-ink`) that resolves to whichever of black or white keeps text
legible on that specific fill. `--color-present` / `--color-absent` and their
`-ink` companions are semantic state colors (attendance, not a picker choice)
and are excluded from the user-facing accent palette in `src/lib/palette.js`.

---

## 2.3 Universal Contrast & Inking Rules

### The Universal Text-on-Accent Rule
> **Rule**: Whenever text, icons, or chips are rendered **inside** a solid accent color fill background (`var(--color-present)`, `var(--color-coral)`, `var(--color-sky)`, `var(--color-amber)`, `var(--color-violet)`, etc.):
> * **Light Mode**: Text and icons **MUST BE PURE WHITE** (`#ffffff` / `var(--on-accent)`).
> * **Dark Mode**: Text and icons **MUST BE CRISP BLACK** (`#111111` / `var(--on-accent)`).

```css
:root {
  --on-accent: #ffffff;
}
.dark {
  --on-accent: #111111;
}
```

> **Note**: `--on-accent` is a single black/white flip and does not hold for
> every hue in the wider *user-selectable* accent palette (profile badge,
> subjects, sessions, calendar) — e.g. light-mode Orange and Lime need black
> text, not the white `--on-accent` gives in light mode. Those accents use
> their own `--color-<name>-ink` token instead; see `src/lib/palette.js`
> (`inkFor`).

### Universal Green Rule
> **Rule**: ALL green elements across the entire application (Workspace `Repeat` button, top dividing rule, Calendar card accent line, active date boxes, Classes Left card, event dots, and text selection highlights) **MUST ALWAYS BE EMERALD (`#16A34A`) IN LIGHT MODE AND ACID GREEN (`#36DA45`) IN DARK MODE**:
> * **Light Mode**: `#16A34A` with white text/icon (`#ffffff` / `var(--on-accent)`).
> * **Dark Mode**: `#36DA45` with black text/icon (`#111111` / `var(--on-accent)`).
> * **Selection Rule**: Highlighted text anywhere receives `background: var(--color-present) !important; color: var(--on-accent) !important;`.

### Reactive Student Profile Identity Rule
* When a student customizes their avatar color in Profile Edit (`profile.avatarColor`), the **Student Keycard** dynamically adopts that exact color for:
  * Branch text (`COMPUTER ENGINEERING`)
  * Year chip border and text (`Y1`)
  * Hostel name (`VISVESVARAYA BHAWAN (H-10)`)
* Avatar initials automatically adapt for contrast via `inkFor()` in
  `src/lib/palette.js`: each accent (including the new Teal/Orange/Fuchsia/Lime)
  resolves to its own `--color-<name>-ink` token, and legacy raw-hex values
  saved before that token existed (`#111827`, `#E60000`, `#305CDE`, `#4f46e5`,
  `#6C3BAA`, `#36DA45`, `#F4F1E8`, `#FAF7F0`, `#FFFFFF`) fall back to a fixed
  ink so old profiles keep rendering correctly.

---

# 3. Foundational Visual Model: WORLD → INTERFACE → SIGNAL

Every visual element belongs primarily to one of three layers.

## 3.1 WORLD — Environment / Atmosphere
The World is decorative and establishes identity:
- subtle halftone dot grid (`world-halftone`),
- paper texture,
- photocopy/Xerox imperfections,
- print misregistration offsets.

**Rules:**
- World elements must stay behind the information layer.
- They must never make primary content difficult to read.
- Avoid constant high-frequency movement.

## 3.2 INTERFACE — Product / Information
The Interface contains:
- navigation & masthead,
- timetable board,
- attendance metrics,
- student tasks,
- calendar & upcoming events,
- quick glance tiles.

**Rules:**
- predictable alignment,
- consistent spacing,
- strong hierarchy,
- readable typography,
- restrained decoration.

## 3.3 SIGNAL — Attention / State
Signal is reserved for things that matter now:
- current live class session (`LIVE` badge),
- active lunch / tea breaks,
- real-time terminal status ticker,
- attendance warning,
- pulsing live indicator dots (`●`).

---

# 4. Art Direction & Paper-Cutout Language

## 4.1 Core Aesthetic
**Student Utility × Punk Print × Comic Editorial**

The website feels like a digital interface assembled from posters, zines, printed notices, cut paper, and technical labels.

## 4.2 Neobrutalist Paper-Cutout Shadows
- Standard cards use `2px solid var(--border)` with hard paper cutout offset shadows:
  - `shadow-hard-sm`: `2px 2px 0 0 var(--shadow-ink)`
  - `shadow-hard`: `4px 4px 0 0 var(--shadow-ink)`
  - `shadow-hard-lg`: `7px 7px 0 0 var(--shadow-ink)`
- Tactile hover dynamics:
  - Cards and buttons translate up-left on hover: `hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg`.
  - Buttons depress on click: `active:translate-x-0.5 active:translate-y-0.5`.

**Glassmorphism is explicitly NOT part of the design system.** Avoid frosted glass cards or giant blur effects.

---

# 5. Typography — Single Font System: Spartan

Exactly **ONE font family** is used across the entire application: **Spartan** (`League Spartan` / `Spartan`, `system-ui`, `sans-serif`).

All typographic hierarchy and texture across the UI are achieved solely through weights, sizes, and tracking:

| Voice / Class | Font Family | Weight | Purpose |
| :--- | :--- | :--- | :--- |
| **`.display`** | `Spartan` | `900` (Black) | Expressive masthead `NITKKR DESK`, huge punchy stat figures, uppercase brand headers. |
| **`.heading`** | `Spartan` | `700–800` (Bold / ExtraBold) | Clean structural card titles, timetable headers, student details, section titles. |
| **`.body`** | `Spartan` | `500–600` (Medium / SemiBold) | Readable session descriptions, event details, timetable items, and prose text. |
| **`.label`** | `Spartan` | `700` (Bold + Tracking) | Timestamps, micro badges, room numbers, chip indicators, attendance percentages. |

### Font Scale & Sizing Rules

| Typographic Level | Mobile Size (`< sm`) | Desktop Size (`lg+`) | Tailwind Class | Font Weight | Letter Spacing & Transform |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Brand Masthead** | `24px` (`1.5rem`) | `36px` (`2.25rem`) | `text-2xl lg:text-4xl` | `900` (Black) | `tracking-wide uppercase` |
| **Card / Widget Title** | `13px` (`0.8125rem`) | `16px` (`1rem`) | `text-xs sm:text-base` | `800` (ExtraBold) | `tracking-normal uppercase` |
| **Stat Figures** | `20px` (`1.25rem`) | `24px` (`1.5rem`) | `text-xl sm:text-2xl` | `800` (ExtraBold) | `tracking-tight` |
| **Live Status Text** | `12px` (`0.75rem`) | `14px` (`0.875rem`) | `text-xs sm:text-sm` | `900` (Black) | `tracking-wide uppercase` |
| **Body & Session Names**| `12px` (`0.75rem`) | `14px` (`0.875rem`) | `text-xs sm:text-sm` | `700` (Bold) | Normal case |
| **Timestamps & Sub-labels** | `11px` (`0.6875rem`)| `13px` (`0.8125rem`) | `text-[0.6875rem] sm:text-xs` | `600` (SemiBold) | `tracking-wider` |
| **Micro Badges & Chips**| `9.6px` (`0.6rem`) | `11px` (`0.7rem`) | `text-[0.6rem] sm:text-xs` | `900` (Black) | `tracking-widest uppercase` |

---

# 6. Responsive Design & Device Layout Hierarchy

The UI is decoupled into dedicated, optimized layouts for desktop and mobile devices:

## 6.1 Desktop Edition (`lg:` $\ge$ 1024px)
* **Top Header**: Classic `NITKKR DESK` title + Theme Toggle + full-width dividing rule (`<hr className="rule-ink" />`).
* **Balanced 2-Column Grid**:
  * **Left Column (`7 cols`)**:
    1. **Hero Signal Card**: Contains real-time editable status (`IN SESSION NOW ✎`), Clock, full **Cyber-Student Keycard** (`[AK ●] | Branch · Year / Hostel`), Mini Month Calendar, and Upcoming Events board.
    2. **2×2 Glance Tiles Grid**: Attendance gauge, Next Meal, Classes Left, More Tools.
  * **Right Column (`5 cols`)**:
    1. **Today's Timetable Widget** (with live active session and break banners).
    2. **Student To-Dos Widget** (with interactive task creation and checkoffs).

---

## 6.2 Mobile Edition (`< lg:`)
* **Editorial Masthead Plate**:
  ```
   [🔄] NITKKR DESK                             [AK ●] [ 🌙 ]
   ═════════════════════════════════════════════════════════════
    ● IN SESSION NOW ✎                            FRI · 4:21 PM 
   ─────────────────────────────────────────────────────────────
  ```
  * Distinct from content cards: No bulky card box enclosure or offset shadow; anchored with clean editorial double rules.
  * Minimized profile avatar icon (`AK` with live pulsing status dot `●`).
* **Priority Card Flow (Top to Bottom)**:
  1. **Today's Timetable** *(Immediate class awareness above the fold)*
  2. **Student To-Dos** *(Assignments and daily checklists)*
  3. **2×2 Grid of Glance Cards** *(Attendance gauge, Next Meal, Classes Left, Info)*
  4. **Calendar & Upcoming Events Board** *(Mini Month Calendar + Events list)*

---

# 7. Motion System & Micro-Interactions

Animation communicates **state, hierarchy, or personality** — it never forces the user to wait.

## UI Motion
- Target 150–250 ms for micro-interactions (hover translations, checkoff fades).
- Tactile hover offset lifts (`hover:-translate-x-0.5 hover:-translate-y-0.5`).
- Active click depression (`active:translate-x-0.5 active:translate-y-0.5`).

## Live Pulse Dots
Active states (live timetable session, on-campus status, live breaks) use two-layer CSS pulse dots:
- Outer: `animate-ping rounded-full bg-[var(--color-present)] opacity-75`.
- Inner: `relative rounded-full bg-[var(--color-present)] border border-[var(--surface)]`.

---

# 8. Implementation Summary

1. **Single Font**: Spartan in 4 distinct voices (`.display`, `.heading`, `.body`, `.label`).
2. **Universal Contrast Rule**: Solid accent fills always use white text in Light mode and black text in Dark mode (`--on-accent`).
3. **Universal Green Rule**: Emerald (`#16A34A`) in Light mode, Acid Green (`#36DA45`) in Dark mode.
4. **Permanent Neobrutalist Identity**: Tactile paper cutouts, crisp 2px ink borders, solid hard shadows, and disciplined information hierarchy.
