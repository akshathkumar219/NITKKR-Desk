# content/ — the data behind the site

**Everything students see comes from the markdown files in this folder.**
Nobody needs to touch any JavaScript to add a timetable, fix a mess menu, or
correct a phone number. Edit a `.md` file, save, and the site updates.

```
npm run dev            # edit a file, the page reloads with it
npm run content:check  # validate without writing anything
npm run content        # regenerate src/data/generated/*.json
```

If a file is malformed the build stops and tells you the file and line:

```
error  content/timetables/CSE-2.md:19  Could not read `start` as a time: "9ish".
       Try `9:00`, `9 am`, `2 pm`, `14:30`.
```

---

## Where things live

| Path | What it holds |
|---|---|
| `campus/branches.md` | Every branch. **Codes are permanent** — see below. |
| `campus/hostels.md` | Every hostel. Codes are permanent too. |
| `campus/landmarks.md` | Map pins. Add `Lat`/`Lng` when you can. |
| `timetables/<BRANCH>-<YEAR>.md` | One file per branch/year, e.g. `CSE-2.md` |
| `mess/<HOSTEL>.md` | One file per hostel, e.g. `CVR.md` |
| `calendar/<term>.md` | Academic calendar. Mark holidays here. |
| `exams/<term>.md` | Exam datesheet. Same format as the calendar. |
| `pyq/<session>.md` | Previous year papers, e.g. `2024-25.md` |
| `links.md` `transport.md` `helpline.md` `placements.md` `institute.md` | Flat reference tables |

A file starting with `_` is ignored, so `_draft-ECE-1.md` is a safe scratchpad.

---

## Adding a timetable

Create `timetables/<BRANCH>-<YEAR>.md`. The branch code must already exist in
`campus/branches.md`.

```markdown
---
branch: CSE
year: 2
source: Dept. noticeboard photo, 27 Jul 2026
---

# CSE · Year 2

## MON

| Start | End   | Course              | Code     | Room      | Group | Type    |
|-------|-------|---------------------|----------|-----------|-------|---------|
| 09:00 | 10:00 | Data Structures     | CSPC-201 | LT-3      |       | lecture |
| 11:00 | 13:00 | Data Structures Lab | CSPC-251 | CL-1+CL-2 | A1+A2 | lab     |
| 13:00 | 14:00 | Lunch Break         |          |           |       | break   |

## TUE

...
```

- **Start / End** — `09:00`, `9 am`, `2 pm`, `14:30` all work. 24-hour is
  clearest. `End` must be after `Start`.
- **Course** — required, except on a `break`.
- **Code / Room / Group** — optional. Use `+` for several: `CL-1+CL-2`, `A1+A2`.
- **Type** — `lecture`, `lab`, `tutorial`, `break`, or `other`. Defaults to
  `lecture`.
- **Group is what makes electives work.** A session with a group only shows up
  for students in that group; a session with a blank group shows for everyone.
  Fill it in for every lab batch and elective — an attendance percentage that
  counts classes a student never attends is worse than no percentage at all.
- One `##` heading per weekday, `MON` to `FRI`.
- `source:` is optional but please fill it in. Six months from now, "where did
  this come from?" is the only question that matters.

The build warns about overlapping sessions (unless they're different groups)
and duplicate rows. Warnings don't stop the build — read them anyway.

---

## Adding a mess menu

Create `mess/<HOSTEL>.md`:

```markdown
---
hostel: CVR
---

# C.V. Raman Mess

## MON

| Meal      | Items                                          |
|-----------|------------------------------------------------|
| breakfast | Aloo Paratha + Curd, Boiled Egg / Banana, Tea  |
| lunch     | Rajma, Jeera Rice, Chapati, Salad              |
| snacks    | Samosa, Green Chutney, Tea / Coffee            |
| dinner    | Kadhi Pakora, Plain Rice, Chapati, Gulab Jamun |
```

All four meals are required for each day, and there are seven days — this is
the single biggest data-entry job in the project. Any hostel without a file
shows another hostel's menu behind a "shared menu" warning, so a half-done
file beats no file.

---

## Marking holidays

In `calendar/<term>.md`, set `Category` to `HOLIDAYS` or `BREAKS` and fill in
a real `Date` (`YYYY-MM-DD`). Attendance uses those dates to stop counting
classes on days nobody had class:

| Label        | Value              | Category | Date       | End Date   |
|--------------|--------------------|----------|------------|------------|
| DIWALI BREAK | OCT 20 – 24, 2026  | HOLIDAYS | 2026-10-20 | 2026-10-24 |

A `Value` alone is just display text — without `Date`, attendance can't use it.

When the calendar is genuinely from the official notice, set `verified: yes`
in the front matter and the in-app placeholder warning disappears by itself.

---

## Two rules that matter more than the rest

**1. Never change a `Code` in `branches.md` or `hostels.md`.**
Students' saved profiles point at those codes. Renaming `CSE` to `CE` doesn't
migrate anyone — it just makes their branch vanish. Changing the `Name` column
is always safe; that's what the code is for.

**2. Don't worry about breaking attendance by editing a timetable.**
Session IDs are derived from `branch + year + day + start time + course`, so
moving a lab to a different room, changing a group, fixing an end time, or
reordering rows all keep every student's logged attendance intact. Changing
the **start time** or the **course code** does create a new session — which is
correct, because that genuinely is a different slot.

`npm run test:ids` proves all of this. If you change how IDs are generated,
that test fails loudly, and it should: everyone's attendance would detach and
there is no server copy to restore from.

---

## A note on accuracy

This app is unofficial. Students will plan their day around it.

- **Verify helpline numbers** against an official source before they ship. A
  wrong emergency number is worse than no number.
- **Don't invent dates.** Leave the placeholder warning on until you have the
  real notice — a visible "unverified" beats a confident wrong answer.
- **Don't host copyrighted papers.** Link to official or view-only copies.
