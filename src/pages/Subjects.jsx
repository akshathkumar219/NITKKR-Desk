import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import Shell from "../components/Shell";
import SubjectDetail from "../components/SubjectDetail";
import SubjectModal from "../components/SubjectModal";
import AddSubjectModal from "../components/AddSubjectModal";
import { Meter, PageHeader, Ring } from "../ui";
import { BRANCHES, branchName } from "../data/campus";
import {
  useProfile,
  useRollcallSettings,
  useAllSubjectsData,
} from "../lib/storage";
import { useBoard, coursesOf, filterSessionsByGroup } from "../lib/board";
import { useRollcall, tally, canSkip, mustAttend } from "../lib/rollcall";
import { getSubjectTheme } from "../lib/palette";
import {
  getSemesterCourses,
  getCourseCurriculum,
  getDefaultSemesterForYear,
  normalizeStr,
} from "../data/curriculum";

export default function Subjects() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const rawParam = params.subjectKey || params["*"] || searchParams.get("id");
  const urlKey = rawParam ? decodeURIComponent(rawParam) : null;
  const [selectedKey, setSelectedKey] = useState(urlKey || null);

  const { profile, year, group } = useProfile();
  const defaultSem = getDefaultSemesterForYear(year);
  const [activeSemester, setActiveSemester] = useState(defaultSem);

  useEffect(() => {
    setActiveSemester(getDefaultSemesterForYear(year));
  }, [year]);

  const { sessions, addSession, removeSession, moveSession } = useBoard(
    profile.branch,
    year,
  );
  const { adjustments, adjustSubject, marks } = useRollcall();
  const [rollcallSettings] = useRollcallSettings();
  const allSubjectsStore = useAllSubjectsData();

  // Sync selected key with URL if URL changes
  useEffect(() => {
    if (urlKey) {
      setSelectedKey(urlKey);
    } else if (!rawParam) {
      setSelectedKey(null);
    }
  }, [urlKey, rawParam]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [editingCourse, setEditingCourse] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Aggregate courses with extended stored metadata & official curriculum
  const subjects = useMemo(() => {
    const effectiveSessions = filterSessionsByGroup(sessions, group);
    const rawCourses = coursesOf(effectiveSessions);
    const officialCourses = getSemesterCourses(profile.branch, activeSemester);

    // Track matched raw courses
    const matchedRawKeys = new Set();

    // 1. Build course objects from official curriculum
    const curriculumSubjects = officialCourses.map((oc) => {
      // Find matching session in rawCourses
      const rawMatch = rawCourses.find(
        (rc) =>
          (oc.code && rc.code && normalizeStr(oc.code) === normalizeStr(rc.code)) ||
          (oc.title && rc.name && normalizeStr(oc.title) === normalizeStr(rc.name)) ||
          (rc.key && oc.code && normalizeStr(rc.key) === normalizeStr(oc.code)),
      );

      if (rawMatch) {
        matchedRawKeys.add(rawMatch.key);
      }

      const courseKey = rawMatch ? rawMatch.key : oc.code;
      const courseName = oc.title || oc.name || (rawMatch ? rawMatch.name : oc.code);
      const courseCode = oc.code || (rawMatch ? rawMatch.code : "");
      const courseSessions = rawMatch ? rawMatch.sessions : [];

      const firstSession = courseSessions[0] || {};
      const customData =
        allSubjectsStore[courseKey] ||
        allSubjectsStore[courseName] ||
        (courseCode ? allSubjectsStore[courseCode] : {}) ||
        {};

      const officialCurriculum = getCourseCurriculum(
        profile.branch,
        activeSemester,
        courseCode || courseName,
      );

      const theme = getSubjectTheme({
        ...firstSession,
        ...customData,
        name: courseName,
        code: courseCode,
        type: oc.type || firstSession.type || "theory",
        category: customData.category || oc.category || firstSession.category,
      });

      const category = (
        customData.category ||
        oc.category ||
        officialCurriculum?.category ||
        firstSession.category ||
        theme.label
      ).toUpperCase();

      const room = firstSession.room || customData.room || "TBD";
      const instructor =
        customData.instructor || firstSession.instructor || "";
      const accent =
        customData.accent || firstSession.accent || theme.accent;
      const targetCutoff =
        customData.targetCutoff || firstSession.targetCutoff || 65;
      const credits =
        customData.credits ||
        oc.credits ||
        officialCurriculum?.credits ||
        (category === "LAB" ? "2" : "4");

      const manualAdj = (adjustments || {})[courseKey] || 0;
      const stats = tally(
        marks || {},
        courseSessions,
        rollcallSettings?.trackingSince,
        manualAdj,
      );

      const safeBunks = canSkip(stats.present, stats.held, targetCutoff);
      const deficit = mustAttend(stats.present, stats.held, targetCutoff);

      const units =
        customData.units && customData.units.length > 0
          ? customData.units
          : officialCurriculum?.formattedUnits || [];

      let totalTopics = 0;
      let doneTopics = 0;
      units.forEach((u) => {
        (u.topics || []).forEach((t) => {
          totalTopics += 1;
          if (t.done) doneTopics += 1;
        });
      });
      const syllabusPct =
        totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

      const pendingTasks = (customData.tasks || []).filter(
        (t) => !t.done,
      ).length;

      return {
        key: courseKey,
        name: courseName,
        code: courseCode,
        category,
        room,
        instructor,
        accent,
        targetCutoff,
        credits,
        sessions: courseSessions,
        stats,
        safeBunks,
        deficit,
        units,
        objectives: officialCurriculum?.objectives || [],
        references: officialCurriculum?.references || [],
        syllabusPct,
        doneTopics,
        totalTopics,
        pendingTasks,
      };
    });

    // 2. Add extra courses from timetable that weren't in official curriculum
    const extraSubjects = rawCourses
      .filter((rc) => !matchedRawKeys.has(rc.key))
      .map((c) => {
        const firstSession = c.sessions[0] || {};
        const customData =
          allSubjectsStore[c.key] || allSubjectsStore[c.name] || {};
        const officialCurriculum = getCourseCurriculum(
          profile.branch,
          activeSemester,
          c.code || c.name || c.key,
        );
        const theme = getSubjectTheme({
          ...firstSession,
          ...customData,
          name: c.name,
          code: c.code,
          type: c.type,
          category: customData.category || firstSession.category,
        });
        const category = (
          customData.category ||
          officialCurriculum?.category ||
          firstSession.category ||
          theme.label
        ).toUpperCase();

        const room = firstSession.room || customData.room || "TBD";
        const instructor =
          customData.instructor || firstSession.instructor || "";
        const accent =
          customData.accent || firstSession.accent || theme.accent;
        const targetCutoff =
          customData.targetCutoff || firstSession.targetCutoff || 65;
        const credits =
          customData.credits ||
          officialCurriculum?.credits ||
          (category === "LAB" ? "2" : "4");

        const manualAdj = (adjustments || {})[c.key] || 0;
        const stats = tally(
          marks || {},
          c.sessions,
          rollcallSettings?.trackingSince,
          manualAdj,
        );

        const safeBunks = canSkip(stats.present, stats.held, targetCutoff);
        const deficit = mustAttend(stats.present, stats.held, targetCutoff);

        const units =
          customData.units && customData.units.length > 0
            ? customData.units
            : officialCurriculum?.formattedUnits || [];

        let totalTopics = 0;
        let doneTopics = 0;
        units.forEach((u) => {
          (u.topics || []).forEach((t) => {
            totalTopics += 1;
            if (t.done) doneTopics += 1;
          });
        });
        const syllabusPct =
          totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

        const pendingTasks = (customData.tasks || []).filter(
          (t) => !t.done,
        ).length;

        return {
          key: c.key,
          name: c.name,
          code: c.code || "",
          category,
          room,
          instructor,
          accent,
          targetCutoff,
          credits,
          sessions: c.sessions,
          stats,
          safeBunks,
          deficit,
          units,
          objectives: officialCurriculum?.objectives || [],
          references: officialCurriculum?.references || [],
          syllabusPct,
          doneTopics,
          totalTopics,
          pendingTasks,
        };
      });

    return [...curriculumSubjects, ...extraSubjects].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [
    sessions,
    group,
    allSubjectsStore,
    marks,
    adjustments,
    rollcallSettings,
    profile.branch,
    activeSemester,
  ]);


  // Active Selected Subject
  const { activeSubject, isNotFound } = useMemo(() => {
    const target = selectedKey || urlKey;
    if (!target) {
      return {
        activeSubject: null,
        isNotFound: false,
      };
    }

    const clean = target.trim().toUpperCase();
    let index = subjects.findIndex(
      (s) =>
        s.key.toUpperCase() === clean ||
        s.name.toUpperCase() === clean ||
        (s.code && s.code.toUpperCase() === clean),
    );

    if (index === -1) {
      index = subjects.findIndex(
        (s) =>
          s.name.toUpperCase().replace(/\s+/g, "") ===
            clean.replace(/\s+/g, "") ||
          clean.includes(s.name.toUpperCase()) ||
          s.name.toUpperCase().includes(clean),
      );
    }

    if (index !== -1) {
      return {
        activeSubject: subjects[index],
        isNotFound: false,
      };
    }

    // Fallback: search curriculum across all semesters of this branch
    const foundCurriculum = getCourseCurriculum(profile.branch, activeSemester, clean);
    if (foundCurriculum) {
      const customData =
        allSubjectsStore[foundCurriculum.code] ||
        allSubjectsStore[foundCurriculum.title] ||
        {};
      const units =
        customData.units && customData.units.length > 0
          ? customData.units
          : foundCurriculum.formattedUnits || [];
      let totalTopics = 0;
      let doneTopics = 0;
      units.forEach((u) => {
        (u.topics || []).forEach((t) => {
          totalTopics += 1;
          if (t.done) doneTopics += 1;
        });
      });
      const syllabusPct =
        totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;
      return {
        activeSubject: {
          key: foundCurriculum.code,
          name: foundCurriculum.title || foundCurriculum.name,
          code: foundCurriculum.code,
          category: foundCurriculum.category || "PC",
          credits: foundCurriculum.credits || "4",
          room: "TBD",
          instructor: "",
          accent: "var(--color-sky)",
          targetCutoff: 65,
          sessions: [],
          stats: { percent: null, present: 0, held: 0 },
          safeBunks: 0,
          deficit: 0,
          units,
          objectives: foundCurriculum.objectives || [],
          references: foundCurriculum.references || [],
          syllabusPct,
          doneTopics,
          totalTopics,
          pendingTasks: 0,
        },
        isNotFound: false,
      };
    }

    return {
      activeSubject: null,
      isNotFound: true,
    };
  }, [subjects, selectedKey, urlKey, profile.branch, activeSemester, allSubjectsStore]);

  // Navigation handlers
  const handleSelectSubject = (courseKey) => {
    setSelectedKey(courseKey);
    navigate(`/subjects/${encodeURIComponent(courseKey)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToRoster = () => {
    setSelectedKey(null);
    navigate("/subjects");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filtered Subject Cards
  // Alphabetical: a student has six or seven subjects, so finding one by name
  // beats any cleverer ordering.
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    return subjects
      .filter(
        (s) =>
          !q ||
          s.name.toUpperCase().includes(q) ||
          (s.code && s.code.toUpperCase().includes(q)) ||
          (s.instructor && s.instructor.toUpperCase().includes(q)) ||
          (s.room && s.room.toUpperCase().includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, searchQuery]);

  // Add Custom Subject Action
  const handleAddSubject = (newCourse) => {
    addSession({
      name: newCourse.name,
      code: newCourse.code,
      room: newCourse.room,
      instructor: newCourse.instructor,
      accent: newCourse.accent,
      targetCutoff: newCourse.targetCutoff,
      type: newCourse.category.toLowerCase(),
      category: newCourse.category,
      day: "MON",
      start: 9 * 60,
      end: 10 * 60,
    });
    handleSelectSubject(newCourse.code || newCourse.name);
  };

  // Edit Course Action
  const handleSaveCourseEdit = (updatedData) => {
    if (!editingCourse) return;
    const courseSessions = editingCourse.sessions || [];
    courseSessions.forEach((s) => {
      moveSession(s.id, {
        name: updatedData.name,
        code: updatedData.code,
        instructor: updatedData.instructor,
        accent: updatedData.accent,
        targetCutoff: updatedData.targetCutoff,
      });
    });
    setEditingCourse(null);
  };

  // Delete Course Action
  const handleDeleteCourse = (courseKey) => {
    const target = subjects.find((s) => s.key === courseKey);
    if (target) {
      target.sessions.forEach((s) => removeSession(s.id));
      handleBackToRoster();
    }
  };

  return (
    <Shell>
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* CASE 1: NOT FOUND DEEP LINK */}
        {isNotFound ? (
          <div className="board board-hard bg-[var(--surface)] pad-page text-center flex flex-col items-center justify-center gap-4 border-l-4 sm:border-l-[6px] border-l-[var(--disruption)] animate-flip">
            <span className="grid size-12 place-items-center rounded-full bg-[var(--disruption)]/10 text-[var(--disruption)]">
              <AlertCircle className="icon-lg" strokeWidth={2.5} />
            </span>
            <div>
              <h1 className="t-masthead">
                SUBJECT NOT FOUND
              </h1>
              <p className="t-body muted max-w-md mt-1">
                No course matching &quot;{selectedKey || urlKey}&quot; was found
                in your registered timetable for {profile.branch} Year {year}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleBackToRoster}
                className="btn !py-2 !px-4 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-hard-sm"
              >
                <ArrowLeft className="icon-micro" strokeWidth={3} />
                <span>VIEW ALL SUBJECTS</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="btn btn-go !py-2 !px-4 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-hard-sm"
              >
                <Plus className="icon-micro" strokeWidth={3} />
                <span>ENROLL THIS SUBJECT</span>
              </button>
            </div>
          </div>
        ) : activeSubject ? (
          /* CASE 2: INDIVIDUAL DEDICATED SUBJECT PAGE */
          <SubjectDetail
            subject={activeSubject}
            onBack={handleBackToRoster}
            onEditSubject={(s) => setEditingCourse(s)}
            rollcall={{ marks, adjustments }}
            rollcallSettings={rollcallSettings}
            adjustSubject={adjustSubject}
          />
        ) : (
          /* CASE 3: ALL SUBJECTS ROSTER & CARDS DIRECTORY */
          <>
            {/* HEADER */}
            <PageHeader
              icon={BookOpen}
              accent="var(--color-acid)"
              iconInk="var(--on-accent)"
              title="SUBJECTS HUB"
              actions={
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="btn btn-go !py-2 !px-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-hard-sm"
                >
                  <Plus className="icon-micro" strokeWidth={3} />
                  <span>ADD SUBJECT</span>
                </button>
              }
            />

            {/* SEMESTER PICKER TABS */}
            <div className="board board-hard bg-[var(--surface)] pad-tight flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                  const isCurrentYear = s === Number(year) * 2 - 1 || s === Number(year) * 2;
                  const isActive = activeSemester === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setActiveSemester(s)}
                      className={`btn !py-1 !px-2.5 sm:!px-3 text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                        isActive
                          ? "!bg-[var(--color-sky)] !text-[var(--on-accent)] shadow-hard-sm"
                          : isCurrentYear
                            ? "!bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]"
                            : "opacity-60 hover:opacity-100 bg-[var(--surface)] text-[var(--muted)]"
                      }`}
                    >
                      <span>SEM {s}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] font-mono font-bold text-[var(--muted)] uppercase">
                {profile.branch} · SEMESTER {activeSemester} · {subjects.length} SUBJECTS
              </div>
            </div>

            {/* CONTROLS BAR: SEARCH & CATEGORY CHIPS */}
            <div className="board board-hard bg-[var(--surface)] pad-tight flex flex-wrap items-center justify-between gap-3">
              {/* SEARCH INPUT */}
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  className="icon-micro absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                />
                <input
                  className="field !py-1.5 !pl-8 !pr-3 text-xs font-bold uppercase w-full"
                  placeholder="SEARCH SUBJECT, CODE, OR PROFESSOR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* SUBJECT CARDS GRID */}
            {filteredSubjects.length === 0 ? (
              <div className="board board-hard bg-[var(--surface)] pad-page text-center flex flex-col items-center justify-center gap-3">
                <p className="t-section">
                  {subjects.length === 0 ? "NO PUBLISHED SUBJECTS" : "NO MATCHING SUBJECTS FOUND"}
                </p>
                <p className="t-meta muted max-w-sm">
                  {subjects.length === 0
                    ? `No subjects found for ${branchName(profile.branch)} Semester ${activeSemester}.`
                    : "Try adjusting your search query, or add a custom course row."}
                </p>
                {subjects.length > 0 && searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                    }}
                    className="btn !py-1.5 !px-3 text-xs font-bold mt-2"
                  >
                    CLEAR FILTERS
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                {filteredSubjects.map((s) => {
                  const courseIdentifier = s.key || s.code || s.name;
                  const isSafe =
                    s.stats.percent === null ||
                    s.stats.percent >= s.targetCutoff;
                  const accentColor = s.accent || "var(--color-sky)";
                  const ringColor =
                    s.stats.percent === null
                      ? "var(--color-cancelled)"
                      : s.stats.percent > s.targetCutoff
                        ? "var(--color-present)"
                        : s.stats.percent >= s.targetCutoff - 10
                          ? "var(--color-amber)"
                          : "var(--color-absent)";
                  const hasInstructor = Boolean(s.instructor);

                  return (
                    <div
                      key={s.key}
                      onClick={() => handleSelectSubject(courseIdentifier)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectSubject(courseIdentifier);
                        }
                      }}
                      className="board board-hard bg-[var(--surface)] min-h-[150px] flex flex-col justify-between transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0 active:translate-y-0 cursor-pointer overflow-hidden border-2 relative group select-none"
                      style={{
                        minHeight: 150,
                        borderLeftWidth: 6,
                        borderLeftColor: accentColor,
                      }}
                    >
                      <div className="pad-card flex items-start gap-3">
                        {/* Attendance Ring or Syllabus Icon */}
                        {s.sessions.length > 0 ? (
                          <Ring
                            percent={s.stats.percent}
                            size={56}
                            strokeWidth={6}
                            textSize="text-xs font-bold"
                            color={ringColor}
                          />
                        ) : (
                          <div className="size-14 rounded-full bg-[var(--surface-2)] border-2 border-[var(--border)] grid place-items-center shrink-0">
                            <BookOpen className="size-6 text-[var(--color-sky)]" strokeWidth={2.2} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h2
                              className="font-extrabold uppercase leading-tight tracking-normal text-[var(--text)] truncate"
                              style={{ fontSize: 20 }}
                            >
                              {s.name}
                            </h2>
                            <span className="chip t-micro font-bold bg-[var(--surface-2)] shrink-0">
                              {s.credits} CREDITS
                            </span>
                          </div>

                          <p className="t-meta muted mt-1 truncate">
                            {s.code ? `${s.code} · ` : ""}
                            {s.room}
                            {hasInstructor ? ` · PROF. ${s.instructor}` : ""}
                          </p>

                          <p className="t-meta font-black mt-2">
                            {s.sessions.length === 0 ? (
                              <span className="text-[var(--color-sky)]">
                                {s.totalTopics > 0 ? `${s.totalTopics} TOPICS PRE-LOADED` : "CURRICULUM SYLLABUS"}
                              </span>
                            ) : s.stats.percent === null ? (
                              <span className="muted">UNTRACKED</span>
                            ) : isSafe ? (
                              <span style={{ color: "var(--present-ink)" }}>
                                {s.safeBunks === Infinity
                                  ? "PERFECT ATTENDANCE"
                                  : `+${s.safeBunks} SAFE SKIPS`}
                              </span>
                            ) : (
                              <span style={{ color: "var(--absent-ink)" }}>
                                NEED +{s.deficit} CLASSES
                              </span>
                            )}
                          </p>

                          {s.totalTopics > 0 ? (
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center justify-between t-micro font-bold">
                                <span className="muted">SYLLABUS PROGRESS</span>
                                <span className="text-[var(--color-sky)] font-mono">
                                  {s.syllabusPct}% ({s.doneTopics}/{s.totalTopics})
                                </span>
                              </div>
                              <Meter
                                percent={s.syllabusPct}
                                color="var(--color-sky)"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* CARD FOOTER CTA STRIP */}
                      <div className="border-t border-[var(--border)] pad-row bg-[var(--surface-2)] flex items-center justify-between text-xs font-bold">
                        <span className="t-micro font-bold opacity-80 flex items-center gap-1.5">
                          {s.pendingTasks > 0 ? (
                            <span className="text-[var(--color-amber)] font-black">
                              {s.pendingTasks} PENDING TO-DO
                              {s.pendingTasks > 1 ? "S" : ""}
                            </span>
                          ) : s.sessions.length > 0 ? (
                            <span>{s.sessions.length} SLOTS / WEEK</span>
                          ) : (
                            <span className="text-[var(--muted)]">OFFICIAL CURRICULUM</span>
                          )}
                        </span>

                        <span className="flex items-center gap-1.5 t-micro font-black text-[var(--text)] group-hover:translate-x-0.5 transition-transform">
                          <span>OPEN PAGE</span>
                          <ChevronRight className="icon-micro" strokeWidth={3} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* EDIT SUBJECT METADATA MODAL */}
      {editingCourse && (
        <SubjectModal
          open={Boolean(editingCourse)}
          onClose={() => setEditingCourse(null)}
          onSave={handleSaveCourseEdit}
          onDelete={handleDeleteCourse}
          course={editingCourse}
        />
      )}

      {/* ADD NEW SUBJECT MODAL */}
      {isAddModalOpen && (
        <AddSubjectModal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddSubject}
        />
      )}
    </Shell>
  );
}
