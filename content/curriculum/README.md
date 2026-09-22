# Curriculum & Schemes (`content/curriculum/`)

This directory holds the official academic schemes, course structures, credit distributions, and detailed course syllabi for every undergraduate branch and semester at NIT Kurukshetra.

## Directory Layout

```
content/curriculum/
├── README.md               # This guide
├── pdfs/                   # Archived official source PDFs
└── <BRANCH>/               # Branch code (must match campus/branches.md)
    ├── sem-1.md            # Semester 1 subjects & syllabus
    ├── sem-2.md            # Semester 2 subjects & syllabus
    ├── sem-3.md            # Semester 3 subjects & syllabus
    └── ...
```

## Semester File Structure (`sem-<N>.md`)

Each file contains front-matter metadata, an overview course table, and a detailed syllabus for every subject:

```markdown
---
branch: CSE
semester: 3
year: 2
totalCredits: 21
contactHours: 25
batch: 2023 onwards
source: Scheme & Syllabi of B.Tech. (2nd Year) Computer Engineering
---

# Computer Engineering · Semester 3

## Courses

| Code | Title | Category | Type | L | T | P | Credits | Contact |
|---|---|---|---|---|---|---|---|---|
| MAIC 201 | Discrete Mathematics and Statistical Methods | IC | Theory | 3 | 0 | 0 | 3 | 3 |
| CSPC 201 | Design and Analysis of Algorithms | PC | Integrated | 3 | 0 | 2 | 4 | 5 |
| CSPC 203 | Computer Organization and Architecture | PC | Theory | 3 | 0 | 0 | 3 | 3 |

## Syllabi

### CSPC 201: Design and Analysis of Algorithms
- **Category**: PC
- **Credits**: 4 (L-T-P: 3-0-2)
- **Contact Hours**: 5

#### Objectives
1. Able to design, implement and analysis of standard searching and sorting algorithms.
2. Implement standard divide and conquer, Dynamic programming, Greedy and backtracking algorithms.

#### Units

##### Unit 1: Introduction
Concept of Time and space complexity, analysis of algorithms, asymptotic notation, recurrence relations...

##### Unit 2: Graph Algorithms
Graph representation & traversal (search), topological sort, strongly connected components...

#### References
1. T. H. Cormen, C. E. Leiserson, R. L. Rivest, C. Stein, "Introduction to Algorithms", MIT Press.
```

## Column Explanations
- **Code**: Institute course code (e.g. `CSPC 201`, `MAIC 201`).
- **Title**: Official course name.
- **Category**: Course category (`IC` = Institute Core, `PC` = Program Core, `PE` = Program Elective, `OE` = Open Elective, `NC` = Non-Conventional Audit/Credit Core).
- **Type**: `Theory`, `Practical`, or `Integrated` (Lecture + Lab).
- **L / T / P**: Weekly Lecture, Tutorial, and Practical contact hours.
- **Credits**: Earned credits towards degree SGPA/CGPA.
- **Contact**: Total weekly contact hours.

## Build Integration
Run the content validator and builder:
```bash
npm run content:check   # Validates markdown tables & front matter
npm run content         # Compiles into src/data/generated/curriculum.json
```
