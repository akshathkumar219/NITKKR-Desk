# Student Utility Website — Design System & Art Direction

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

# 2. Theme Strategy

Use **Light / Dark** as the primary theme switch.

Do **NOT** implement a “Chaos / Zen” or equivalent visual mode as the main theme system.

The expressive style is part of the permanent brand identity. It should exist in both light and dark themes, with different surfaces/backgrounds.

## Dark theme

Dark mode should feel like:
- deep navy-black,
- ink,
- night poster,
- printed comic surface.

Recommended starting palette:

- Background: `#080D18`
- Surface: `#111A2B`
- Primary: `#6C63FF`
- Secondary: `#38BDF8`
- Disruption accent: `#FF4D6D`
- Primary text: `#F4F7FF`
- Muted text: `#93A0B5`
- Border: `#26324A`

## Light theme

Light mode should feel like:
- warm/off-white paper,
- black ink,
- printed poster,
- clean daylight version of the same world.

Recommended starting palette:

- Background: `#F4F1E8`
- Surface: `#FFFFFF`
- Primary: `#5146D8`
- Secondary: `#0284C7`
- Disruption accent: `#D92D55`
- Primary text: `#111111`
- Muted text: `#68707C`
- Border: `#D9D5CB`

These are starting tokens, not permission to introduce dozens of additional colors.

## Semantic colors

Semantic states must remain distinguishable from brand accents:

- Success: green family
- Warning: amber/orange family
- Error / shortage: red family
- Informational: blue/cyan family

Do not use the pink/red disruption accent as the default meaning for success, warning, or error unless the semantic state requires it.

---

# 3. Foundational Visual Model: WORLD → INTERFACE → SIGNAL

Every visual element belongs primarily to one of three layers.

## 3.1 WORLD — Environment / Atmosphere

The World is decorative and establishes identity.

Allowed:
- subtle paper grain,
- halftone texture,
- screen-print texture,
- photocopy/Xerox imperfections,
- comic-style lines,
- abstract shapes,
- grids,
- oversized background typography,
- layered paper-cutout shapes,
- torn-paper silhouettes,
- restrained print misregistration,
- subtle motion in non-content areas.

Rules:
- World elements must stay behind the information layer.
- They may be visually irregular.
- They must never make primary content difficult to read.
- Avoid constant high-frequency movement.
- Do not fill the entire viewport with competing textures.

## 3.2 INTERFACE — Product / Information

The Interface contains:
- navigation,
- timetable,
- attendance,
- subjects,
- forms,
- tables,
- notices,
- cards,
- filters,
- controls.

Rules:
- predictable alignment,
- consistent spacing,
- consistent interaction patterns,
- strong hierarchy,
- readable typography,
- restrained decoration.

The Interface may borrow the visual language of printed material, but it must not become physically confusing or scrapbook-like.

## 3.3 SIGNAL — Attention / State

Signal is reserved for things that matter now.

Use stronger color, motion, or visual interruption for:
- current class,
- upcoming class,
- new notice,
- attendance warning,
- exam urgency,
- selected navigation,
- successful action,
- active filters,
- important state changes.

Signal should be **rare enough that it means something**.

If everything is bright, animated, or distorted, nothing is a signal.

---

# 4. Art Direction

## 4.1 Core aesthetic

Target:

**student utility × punk print × comic editorial**

The website should feel like a digital interface assembled from:
- posters,
- zines,
- printed notices,
- cut paper,
- screen-printed graphics,
- technical labels,
- comic panels.

## 4.2 The visual inspiration is NOT literal

Do not directly reproduce:
- Spider-Verse characters,
- Spider-Man logos,
- Marvel iconography,
- movie-specific screenshots,
- exact character costumes,
- direct replicas of comic frames.

Use the underlying design language instead:
- rebellious composition,
- layered print artifacts,
- offset registration,
- bold typography,
- graphic contrast,
- visual collage,
- imperfect printing,
- kinetic transitions.

---

# 5. Paper / Cutout Language

Paper-cutout styling is preferred over glassmorphism.

**Glassmorphism is explicitly NOT part of the design system.**

Avoid:
- frosted glass everywhere,
- translucent glass cards,
- giant blur effects,
- glass buttons,
- excessive glossy gradients.

Instead, use:
- opaque or near-opaque surfaces,
- paper-like blocks,
- subtle texture,
- cutout layers,
- thin ink-like borders,
- offset shadows,
- pasted-label effects,
- clipped/overlapping decorative shapes.

### Important restraint

Not every card should look like physical paper.

Paper/cutout styling is a **decorative language**, not a mandatory component shape.

Functional components must remain structurally consistent.

---

# 6. Controlled Imperfection

The visual style may break convention, but only in the decorative layer.

Good:
- slightly offset decorative labels,
- occasional squared corners,
- occasional clipped corner,
- overlapping stickers,
- small print-registration offsets,
- asymmetrical hero composition.

Bad:
- random alignment of important content,
- inconsistent form controls,
- intentionally awkward table layout,
- different interaction patterns on every card,
- decorative overlap covering text.

**Composition can be rebellious. Information architecture cannot.**

---

# 7. Typography

## 7.1 Primary display — Tan Daisy

Use **Tan Daisy** for expressive, high-impact text:
- hero title,
- major page headings,
- selected section headings,
- giant numbers where appropriate,
- callouts,
- playful empty states,
- decorative labels,
- Easter eggs.

Tan Daisy should feel like the website’s **voice**.

Do not use Tan Daisy for:
- long paragraphs,
- dense tables,
- form labels,
- navigation text,
- small metadata,
- body copy.

Do not make every heading Tan Daisy. Use it selectively so it retains impact.

## 7.2 Primary UI/body — Spartan

Use **Spartan** for:
- navigation,
- body text,
- timetable entries,
- attendance details,
- course names,
- dates/times,
- buttons,
- forms,
- notices,
- helper text,
- tooltips,
- metadata.

Spartan is the website’s **information voice**.

## 7.3 Typographic hierarchy

Use three functional voices without needing a third font:

1. **Display:** Tan Daisy — expressive.
2. **UI:** Spartan — readable.
3. **Technical metadata:** Spartan with uppercase, tighter sizing, and controlled letter spacing.

Example:

`SYNC // ONLINE`

`WED · 19 AUG`

`ROOM 204`

Technical labels should be visually distinct through typography, not through unnecessary extra colors.

---

# 8. Component Styling

## Navigation

- clean and predictable,
- strong active state,
- restrained decorative treatment,
- expressive visual touches may appear in the logo/brand area,
- do not make navigation difficult to scan.

## Cards

Cards are functional containers, not decorations.

Use:
- strong hierarchy,
- modest border radius or selective square corners,
- clear internal spacing,
- subtle borders/shadows,
- optional paper texture on selected featured cards.

Avoid:
- every card having a different shape,
- excessive shadows,
- excessive rounded pills,
- glass treatment.

## Buttons

Buttons must look like controls.

Primary actions may use the main accent color.

Use expressive styling primarily for:
- hover,
- focus,
- active state,
- selected actions.

Do not make every button look like a poster sticker.

## Tables / Timetables

These are high-priority usability surfaces.

They should be among the cleanest parts of the website.

Use expressive styling mainly for:
- current class,
- current time indicator,
- selected day,
- important status.

Do not add decorative textures behind every row.

---

# 9. Motion System

Animation should communicate **state, hierarchy, or personality**.

It should not exist solely because animation is possible.

## Normal UI motion

Target approximately:
- 150–250 ms for small interactions,
- 250–450 ms for meaningful transitions.

Use:
- opacity,
- small translation,
- subtle scale,
- border/accent transitions.

Avoid unnecessarily slow UI animations.

## Expressive motion

Reserve stronger motion for:
- landing/entry experience,
- important transitions,
- current-class state,
- meaningful data changes,
- notifications,
- loading/sync states,
- Easter eggs.

## Glitch / RGB effects

Use sparingly.

Good examples:
- tiny registration shift on page entry,
- brief RGB separation when a state changes,
- short glitch on an Easter egg,
- restrained distortion during a transition.

Bad:
- continuous glitching,
- repeated screen shake,
- aggressive chromatic aberration behind text,
- animated distortion on dense information.

### Critical rule

If an animation causes the user to wait before reading information, the animation is too strong or in the wrong place.

---

# 10. Intensity by Page

The site should not have one uniform intensity level.

## Landing / entry

**High personality.**

Approximate balance:
- 70–80% visual personality
- 20–30% utility

This is where the site can feel “cool as hell.”

Allowed:
- expressive typography,
- collage,
- animated textures,
- print effects,
- stronger transitions,
- illustrated elements,
- Easter eggs.

## Dashboard

**Medium personality.**

Approximate balance:
- 30% personality
- 70% utility

## Timetable / attendance

**Low-to-medium personality.**

Approximate balance:
- 15–20% personality
- 80–85% utility.

These pages should prioritize rapid scanning.

## Settings / forms / data entry

**Low personality.**

Approximate balance:
- 5–10% personality
- 90–95% utility.

## Easter eggs / 404 / empty states

**High personality.**

These are safe places to be deliberately ridiculous.

---

# 11. Easter Eggs

Easter eggs are encouraged, but they must be optional and non-blocking.

Examples:
- subtle logo hover behavior,
- hidden comic panels,
- unusual 404 page,
- playful empty state,
- tiny system messages,
- occasional illustrated reactions,
- secret visual interactions.

Rules:
- never hide core navigation,
- never block content,
- never require an Easter egg to understand the interface,
- never make core functionality dependent on a joke.

---

# 12. Accessibility / Motion

The website must support reduced-motion preferences.

When reduced motion is active:
- remove large transforms,
- remove prolonged transitions,
- minimize glitch effects,
- minimize parallax,
- avoid decorative movement that can distract.

The information architecture and state communication must remain understandable without animation.

Do not use color alone to communicate critical status.

---

# 13. Responsive Design

Design mobile-first at the interaction level even if the desktop design is visually richer.

On mobile:
- preserve large tap targets,
- prioritize the next class and key attendance information,
- simplify decorative composition,
- reduce background effects,
- prevent horizontal overflow,
- keep text readable without zooming.

Decorative complexity may decrease on smaller screens; the brand identity must not disappear.

---

# 14. Performance Rules

Visual effects must never create noticeable UI lag.

Prefer:
- CSS transforms,
- opacity transitions,
- SVG graphics,
- lightweight textures,
- static or low-cost decorative layers.

Avoid:
- heavy continuously running canvas effects without clear need,
- excessive blur,
- dozens of independent animated DOM elements,
- large unoptimized images,
- animation on every component simultaneously.

The site should still feel fast on a normal student laptop and phone.

---

# 15. Anti-Patterns — DO NOT DO THESE

### Do not turn the website into:
- a Marvel/Spider-Man fan site,
- a generic SaaS dashboard,
- a glassmorphism showcase,
- a permanently glitching screen,
- a neon cyberpunk UI,
- a scrapbook where information is hard to find,
- a collection of unrelated card styles.

### Avoid:
- too many colors,
- too many fonts,
- excessive gradients,
- excessive blur,
- constant animation,
- random asymmetry in functional content,
- decorative noise behind text,
- every component trying to be memorable.

The goal is **controlled visual disruption**, not visual chaos.

---

# 16. Design Decision Test

Before adding any visual effect, ask:

1. Does it reinforce the comic/punk print identity?
2. Does it improve hierarchy, state communication, or personality?
3. Can the user still understand the information immediately?
4. Does it remain attractive after repeated daily use?
5. Does it work in both light and dark themes?
6. Does it remain acceptable with reduced motion?
7. Is the effect better than simply leaving the component clean?

If the answer to several of these is “no,” remove the effect.

---

# 17. Implementation Summary

Build a **single cohesive visual system**, not separate Chaos and Zen interfaces.

### Permanent identity
- comic/editorial/punk print influence,
- paper-cutout language,
- controlled imperfection,
- expressive display typography,
- restrained motion,
- selective visual disruption.

### Theme switch
- Light ↔ Dark.

### Typography
- Tan Daisy = expressive display.
- Spartan = UI/body/functional content.

### Visual hierarchy
- WORLD = atmosphere.
- INTERFACE = information.
- SIGNAL = attention/state.

### Aesthetic principle

> **The world can be loud. The interface must stay clear.**

### Product principle

> **Make the entrance memorable. Make the daily use effortless.**

---

# 18. Final Quality Bar

A successful implementation should feel like:

**a beautifully designed student utility built by someone with strong visual taste, not a student portal with random Spider-Verse effects added on top.**

Every visual decision should feel like it belongs to the same world.

When in doubt:

**Remove effects before adding more.**

The design should be recognizable from a screenshot even with the text removed — but the user should still be able to understand the actual product in seconds.
