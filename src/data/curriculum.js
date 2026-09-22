import curriculumData from './generated/curriculum.json' with { type: 'json' }

export const CURRICULUM = curriculumData

/**
 * Returns the default active semester for an academic year.
 * NIT Kurukshetra operates odd semesters in autumn (1, 3, 5, 7).
 */
export function getDefaultSemesterForYear(year) {
  const y = parseInt(year, 10)
  if (Number.isNaN(y) || y < 1) return 1
  return Math.min(8, y * 2 - 1)
}

/**
 * Get all curriculum data for a given branch and semester.
 */
export function getCurriculum(branch, semester) {
  if (!branch) return null
  const b = branch.toUpperCase()
  const s = String(semester)
  return CURRICULUM[b]?.[s] || null
}

/**
 * Get the list of courses for a branch and semester.
 */
export function getSemesterCourses(branch, semester) {
  const semData = getCurriculum(branch, semester)
  return semData?.courses || []
}

/**
 * Get total official credits for a branch and semester.
 */
export function getTotalSemesterCredits(branch, semester) {
  const semData = getCurriculum(branch, semester)
  if (!semData) return 20
  const parsed = parseFloat(semData.totalCredits)
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : 20
}

/**
 * Strips whitespace and special characters for fuzzy matching.
 */
export function normalizeStr(str) {
  return (str || '')
    .toUpperCase()
    .replace(/&/g, 'AND')
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Format raw units into useSubjectStore compatible structure:
 * { id, title, content, topics: [{ id, title, done: false }] }
 */
export function formatCurriculumUnits(rawUnits = []) {
  return (rawUnits || []).map((u, uIdx) => {
    const uId = `u_${uIdx + 1}`
    const rawTopics = u.topics || []
    const topics = rawTopics.map((t, tIdx) => {
      const title = typeof t === 'string' ? t : (t.title || '')
      return {
        id: `t_${uId}_${tIdx}`,
        title,
        done: false,
      }
    })
    const content = topics.map((t) => `• ${t.title}`).join('\n')
    return {
      id: uId,
      title: u.title || `UNIT ${uIdx + 1}`,
      content,
      topics,
      completed: false,
    }
  })
}

/**
 * Finds syllabus and metadata for a course in a given branch & semester (or branch across all sems).
 */
export function getCourseCurriculum(branch, semester, courseIdentifier) {
  if (!courseIdentifier) return null
  const semData = getCurriculum(branch, semester)
  const normId = normalizeStr(courseIdentifier)

  const matchInSem = (data, b, s) => {
    if (!data) return null
    // 1. Match in courses list first (has official credits, category, type, contact)
    for (const c of data.courses || []) {
      if (normalizeStr(c.code) === normId || normalizeStr(c.title) === normId || normalizeStr(c.name) === normId) {
        const syl = data.syllabi?.[c.code] || {}
        return {
          code: c.code,
          title: c.title || c.name || syl.title,
          category: c.category || syl.category || 'PC',
          credits: c.credits || '4',
          type: c.type || 'Theory',
          ...syl,
          branch: b,
          semester: s,
          formattedUnits: formatCurriculumUnits(syl.units),
        }
      }
    }
    // 2. Match in syllabi dictionary by code or title
    for (const [code, syl] of Object.entries(data.syllabi || {})) {
      if (normalizeStr(code) === normId || normalizeStr(syl.title) === normId) {
        const courseEntry = (data.courses || []).find((c) => normalizeStr(c.code) === normalizeStr(code))
        return {
          code,
          title: syl.title || courseEntry?.title || code,
          category: courseEntry?.category || syl.category || 'PC',
          credits: courseEntry?.credits || syl.credits || '4',
          type: courseEntry?.type || 'Theory',
          ...syl,
          branch: b,
          semester: s,
          formattedUnits: formatCurriculumUnits(syl.units),
        }
      }
    }
    return null
  }

  // 1. Specified semester
  const exact = matchInSem(semData, branch, semester)
  if (exact) return exact

  // 2. Across all semesters of the branch
  const branchData = CURRICULUM[branch?.toUpperCase()]
  if (branchData) {
    for (const [s, semObj] of Object.entries(branchData)) {
      if (String(s) === String(semester)) continue
      const res = matchInSem(semObj, branch, s)
      if (res) return res
    }
  }

  // 3. Across all branches (e.g. common 1st year subjects or common math/humanities)
  for (const [br, branchObj] of Object.entries(CURRICULUM)) {
    if (br === branch?.toUpperCase()) continue
    for (const [s, semObj] of Object.entries(branchObj)) {
      const res = matchInSem(semObj, br, s)
      if (res) return res
    }
  }

  return null
}
