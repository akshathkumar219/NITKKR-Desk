import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckSquare,
  ChevronRight,
  Pencil,
  Percent,
  Target,
} from "lucide-react";
import { Ring } from "../ui";
import { useSubjectStore } from "../lib/storage";
import { canSkip, mustAttend, tally } from "../lib/rollcall";
import { DAY_NAMES, dayCode, fmtRange, minutesNow } from "../lib/time";
import AttendancePanel from "./subject/AttendancePanel";
import SyllabusPanel from "./subject/SyllabusPanel";
import MarksPanel from "./subject/MarksPanel";
import SchedulePanel from "./subject/SchedulePanel";
import NotesPanel from "./subject/NotesPanel";
import { GRADE_TARGET_THRESHOLDS } from "./subject/grades";
import { getSubjectTheme } from "../lib/palette";

export default function SubjectDetail({
  subject,
  onBack,
  onEditSubject,
  rollcall,
  rollcallSettings,
  adjustSubject,
}) {
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const initialTab = useMemo(() => {
    if (rawTab) {
      const clean = rawTab.trim().toUpperCase();
      if (clean === "INFO" || clean === "ALL") return "ALL";
      if (clean === "NOTES" || clean === "TASKS_NOTES") return "TASKS_NOTES";
      if (["ATTENDANCE", "SYLLABUS", "MARKS"].includes(clean)) {
        return clean;
      }
    }
    return "ALL";
  }, [rawTab]);

  const courseKey = subject.key || subject.code || subject.name;
  const initialTheme = useMemo(() => getSubjectTheme(subject), [subject]);

  const {
    data,
    updateSubjectData,
    updateNotes,
    updateMarks,
    addUnit,
    deleteUnit,
    updateUnitContent,
    toggleTopic,
    addTask,
    toggleTask,
    deleteTask,
    addResource,
    deleteResource,
  } = useSubjectStore(courseKey, {
    credits: subject.credits || (subject.category === "LAB" ? "2" : "4"),
    category: subject.category || "PC",
    instructor: subject.instructor || "",
    accent: subject.accent || initialTheme.accent,
    targetCutoff: String(subject.targetCutoff || "65"),
    units: subject.units || [],
    objectives: subject.objectives || [],
    references: subject.references || [],
  });

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (rawTab) {
      const clean = rawTab.trim().toUpperCase();
      if (clean === "INFO" || clean === "ALL") {
        setActiveTab("ALL");
      } else if (clean === "NOTES" || clean === "TASKS_NOTES") {
        setActiveTab("TASKS_NOTES");
      } else if (["ATTENDANCE", "SYLLABUS", "MARKS"].includes(clean)) {
        setActiveTab(clean);
      }
    }
  }, [rawTab]);
  const [syllabusSearch, setSyllabusSearch] = useState("");
  const [newUnitTitle, setNewUnitTitle] = useState("");
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [newResourceLabel, setNewResourceLabel] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [showAddResource, setShowAddResource] = useState(false);
  const [targetGradeGoal, setTargetGradeGoal] = useState("A+");

  // Effective Cutoff
  const requiredCutoff =
    Number(data.targetCutoff) || Number(rollcallSettings?.required) || 65;


  const manualAdj = (rollcall.adjustments || {})[courseKey] || 0;

  // No baseAttendance here — that's a single semester-wide catch-up figure
  // (see Attendance.jsx's Settings), not attributable to any one subject,
  // and Attendance.jsx's own per-subject rows don't apply it either. Passing
  // it here double counted it into every subject's figure.
  const attendanceStats = useMemo(() => {
    const res = tally(
      rollcall.marks || {},
      subject.sessions || [],
      rollcallSettings?.trackingSince,
      manualAdj,
    );
    const pct = res.percent;
    const safeBunkCount = canSkip(res.present, res.held, requiredCutoff);
    const mustAttendCount = mustAttend(res.present, res.held, requiredCutoff);
    return { ...res, pct, safeBunkCount, mustAttendCount };
  }, [rollcall.marks, subject.sessions, rollcallSettings, manualAdj, requiredCutoff]);

  // Syllabus completion metrics
  const syllabusMetrics = useMemo(() => {
    const units = data.units || [];
    let totalTopics = 0;
    let doneTopics = 0;
    units.forEach((u) => {
      (u.topics || []).forEach((t) => {
        totalTopics += 1;
        if (t.done) doneTopics += 1;
      });
    });
    const pct =
      totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;
    return { totalTopics, doneTopics, pct };
  }, [data.units]);

  // Marks & End-Sem forecaster calculations
  const marksSummary = useMemo(() => {
    const m = data.marks || {};
    const mid1 = parseFloat(m.mid1) || 0;
    const mid1Max = parseFloat(m.mid1Max) || 15;
    const mid2 = parseFloat(m.mid2) || 0;
    const mid2Max = parseFloat(m.mid2Max) || 15;
    const internal = parseFloat(m.internal) || 0;
    const internalMax = parseFloat(m.internalMax) || 20;
    const endSem = parseFloat(m.endSem) || 0;
    const endSemMax = parseFloat(m.endSemMax) || 50;

    const internalsScored = mid1 + mid2 + internal;
    const internalsMax = mid1Max + mid2Max + internalMax;
    const totalMax = internalsMax + endSemMax;
    const currentScored = internalsScored + (m.endSem !== "" ? endSem : 0);
    const currentPct = totalMax > 0 ? (currentScored / totalMax) * 100 : 0;

    // Target Grade Simulator
    const targetObj =
      GRADE_TARGET_THRESHOLDS.find((g) => g.grade === targetGradeGoal) ||
      GRADE_TARGET_THRESHOLDS[0];
    const requiredTotalMarks = (targetObj.minPct / 100) * totalMax;
    const neededInEndSem = requiredTotalMarks - internalsScored;

    return {
      mid1,
      mid1Max,
      mid2,
      mid2Max,
      internal,
      internalMax,
      endSem,
      endSemMax,
      internalsScored,
      internalsMax,
      totalMax,
      currentScored,
      currentPct,
      targetObj,
      neededInEndSem,
      isEndSemPossible: neededInEndSem <= endSemMax,
    };
  }, [data.marks, targetGradeGoal]);

  // Active Live schedule status
  const today = dayCode();
  const nowMins = minutesNow();
  const todaySlots = useMemo(
    () => (subject.sessions || []).filter((s) => s.day === today),
    [subject.sessions, today],
  );
  const isLiveNow = todaySlots.some(
    (s) => s.start <= nowMins && nowMins < s.end,
  );

  const accentColor = data.accent || subject.accent || initialTheme.accent || "var(--color-sky)";
  const accentHairline = "color-mix(in srgb, currentColor 22%, transparent)";

  const category = (
    data.category ||
    subject.category ||
    initialTheme.label ||
    (subject.type === "lab" ? "LAB" : "THEORY")
  ).toUpperCase();
  const instructor = data.instructor || subject.instructor || "";
  const sessions = subject.sessions || [];
  const room = (sessions[0]?.room) || data.room || subject.room || "";

  const isSafe =
    attendanceStats.pct === null || attendanceStats.pct >= requiredCutoff;
  const statusColor =
    attendanceStats.pct === null
      ? "var(--color-cancelled)"
      : isSafe
        ? "var(--color-present)"
        : "var(--color-absent)";
  const statusInk =
    attendanceStats.pct === null
      ? "var(--muted)"
      : isSafe
        ? "var(--present-ink)"
        : "var(--absent-ink)";

  return (
    <div className="flex flex-col gap-3 sm:gap-4 animate-flip">
      {/* TOP HEADER & BREADCRUMB COMMAND BAR */}
      <header
        className="board board-hard pad-page flex flex-col gap-3"
        style={{ background: accentColor, color: "var(--on-accent)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="btn !py-1.5 !px-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-hard-sm hover:-translate-x-0.5"
          >
            <ArrowLeft className="icon-micro" strokeWidth={3} />
            <span>ALL SUBJECTS</span>
          </button>

          <div className="flex items-center gap-2">
            {isLiveNow && (
              <span className="chip bg-[var(--color-present)] text-[var(--on-accent)] font-black text-xs animate-pulse">
                🔴 LIVE
              </span>
            )}
            <button
              type="button"
              onClick={() => onEditSubject(subject)}
              className="btn !py-1.5 !px-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-hard-sm hover:-translate-y-0.5"
              title="Edit subject details"
            >
              <Pencil className="icon-micro" strokeWidth={2.5} />
              <span>EDIT</span>
            </button>
          </div>
        </div>

        {/* HERO TITLE & METADATA — Vibe matches attendance cards with full info */}
        <div
          className="flex flex-col gap-2 border-t pt-3"
          style={{ borderColor: accentHairline }}
        >
          {/* Metadata smaller text badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {subject.code ? (
              <span className="font-mono font-black text-[0.625rem] sm:text-xs px-2 py-0.5 rounded border border-current/25 bg-current/10 tracking-wider">
                {subject.code}
              </span>
            ) : null}
            <span className="font-black text-[0.6rem] sm:text-xs px-2 py-0.5 rounded border border-current/25 bg-current/10 tracking-wider uppercase">
              {category}
            </span>
            <span className="font-black text-[0.6rem] sm:text-xs px-2 py-0.5 rounded border border-current/25 bg-current/10 tracking-wider uppercase">
              {data.credits || (category === "LAB" ? "2" : "4")} CREDITS
            </span>
            {room && room !== "TBD" ? (
              <span className="font-bold text-[0.6rem] sm:text-xs px-2 py-0.5 rounded border border-current/25 bg-current/10 tracking-wider uppercase">
                ROOM {room}
              </span>
            ) : null}
          </div>

          {/* Subject Title & Instructor */}
          <div className="min-w-0">
            <h1 className="t-masthead text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight uppercase break-words">
              {subject.name}
            </h1>
            {instructor ? (
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wider opacity-90 mt-1">
                {instructor}
              </p>
            ) : null}
          </div>

          {/* Weekly Slots labeled: e.g. "Thursday at 9–10 AM" */}
          <div className="flex flex-col gap-1.5 pt-1">
            <p className="text-[0.65rem] sm:text-xs font-black uppercase tracking-wider opacity-80">
              {sessions.length} WEEKLY CLASS SLOT{sessions.length === 1 ? "" : "S"}:
            </p>
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {sessions.length > 0 ? (
                sessions.map((sess, idx) => {
                  const fullDay = DAY_NAMES[sess.day] || sess.day;
                  const timeStr = fmtRange(sess.start, sess.end);
                  const roomStr = sess.room ? ` · Room ${sess.room}` : "";
                  return (
                    <span
                      key={sess.id || idx}
                      className="text-[0.65rem] sm:text-xs font-bold px-2 py-1 rounded border border-current/25 bg-current/10 tracking-wide inline-flex items-center shrink-0"
                    >
                      {fullDay} at {timeStr}{roomStr}
                    </span>
                  );
                })
              ) : (
                <span className="text-[0.65rem] sm:text-xs opacity-75 italic">
                  No scheduled timetable slots
                </span>
              )}
            </div>
          </div>
        </div>

        {/* WORKSPACE SECTION TABS — 2 structured rows: 2 cols on row 1, 3 cols on row 2 */}
        <div
          className="flex flex-col gap-1.5 border-t pt-3"
          style={{ borderColor: accentHairline }}
        >
          {/* Row 1: INFO (50%) & ATTENDANCE (50%) */}
          <div className="grid grid-cols-2 gap-1.5 w-full">
            {[
              { id: "ALL", label: "INFO" },
              { id: "ATTENDANCE", label: "ATTENDANCE" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn !py-2 !px-2 text-xs sm:text-sm font-black tracking-wider uppercase transition-all cursor-pointer text-center justify-center w-full ${
                    active
                      ? "ring-2 ring-black dark:ring-white shadow-hard-sm"
                      : "opacity-80 hover:opacity-100"
                  }`}
                  style={
                    active
                      ? { background: "var(--text)", color: "var(--bg)" }
                      : undefined
                  }
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: SYLLABUS (33.3%), MARKS (33.3%), NOTES (33.3%) */}
          <div className="grid grid-cols-3 gap-1.5 w-full">
            {[
              { id: "SYLLABUS", label: "SYLLABUS" },
              { id: "MARKS", label: "MARKS" },
              { id: "TASKS_NOTES", label: "NOTES" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn !py-2 !px-2 text-xs sm:text-sm font-black tracking-wider uppercase transition-all cursor-pointer text-center justify-center w-full ${
                    active
                      ? "ring-2 ring-black dark:ring-white shadow-hard-sm"
                      : "opacity-80 hover:opacity-100"
                  }`}
                  style={
                    active
                      ? { background: "var(--text)", color: "var(--bg)" }
                      : undefined
                  }
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* INFO / DIGEST GRID — 4 cards in a 2×2 grid (50% width each) */}
      {activeTab === "ALL" && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
          <DigestCard
            title="ATTENDANCE"
            icon={Percent}
            onOpen={() => setActiveTab("ATTENDANCE")}
            visual={
              <Ring
                percent={attendanceStats.pct}
                size={54}
                strokeWidth={6}
                color={statusColor}
                textSize="text-xs sm:text-sm font-black"
              />
            }
            value={
              attendanceStats.pct === null
                ? "UNTRACKED"
                : isSafe
                  ? "ON TRACK"
                  : "AT RISK"
            }
            valueSmall
            valueColor={statusInk}
            note={
              attendanceStats.pct === null
                ? "No classes logged yet."
                : isSafe
                  ? attendanceStats.safeBunkCount === Infinity
                    ? `Perfect record across ${attendanceStats.held} classes.`
                    : `${attendanceStats.safeBunkCount} safe skips left.`
                  : `Attend next ${attendanceStats.mustAttendCount} classes.`
            }
          />

          <DigestCard
            title="SYLLABUS"
            icon={BookOpen}
            onOpen={() => setActiveTab("SYLLABUS")}
            visual={
              <TopicGrid
                total={syllabusMetrics.totalTopics}
                done={syllabusMetrics.doneTopics}
              />
            }
            value={`${syllabusMetrics.doneTopics} / ${syllabusMetrics.totalTopics}`}
            note={
              syllabusMetrics.totalTopics === 0
                ? "No units added yet."
                : `${syllabusMetrics.pct}% of topics ticked off.`
            }
          />

          <DigestCard
            title="MARKS"
            icon={Target}
            onOpen={() => setActiveTab("MARKS")}
            visual={<MarksBars s={marksSummary} accent={accentColor} />}
            value={
              marksSummary.currentScored > 0
                ? `${marksSummary.currentScored} / ${marksSummary.totalMax}`
                : "NOT ENTERED"
            }
            note={
              marksSummary.currentScored > 0
                ? `${Math.round(marksSummary.currentPct)}% · Target ${marksSummary.targetObj.grade}`
                : "Add scores to forecast a grade."
            }
          />

          <DigestCard
            title="NOTES"
            icon={CheckSquare}
            onOpen={() => setActiveTab("TASKS_NOTES")}
            visual={<TaskStack tasks={data.tasks || []} />}
            value={`${(data.tasks || []).filter((t) => !t.done).length} OPEN`}
            note={
              (data.tasks || []).length === 0 && !(data.notes || "").trim()
                ? "Nothing noted yet."
                : `${(data.tasks || []).length} tasks · ${(data.resources || []).length} links.`
            }
          />
        </div>
      )}

      {activeTab === "ATTENDANCE" && (
        <AttendancePanel
          requiredCutoff={requiredCutoff}
          attendanceStats={attendanceStats}
          courseKey={courseKey}
          adjustSubject={adjustSubject}
          manualAdj={manualAdj}
        />
      )}

      {activeTab === "SYLLABUS" && (
        <SyllabusPanel
          subject={subject}
          data={data}
          addUnit={addUnit}
          deleteUnit={deleteUnit}
          updateUnitContent={updateUnitContent}
          toggleTopic={toggleTopic}
          syllabusSearch={syllabusSearch}
          setSyllabusSearch={setSyllabusSearch}
          newUnitTitle={newUnitTitle}
          setNewUnitTitle={setNewUnitTitle}
          showAddUnit={showAddUnit}
          setShowAddUnit={setShowAddUnit}
          syllabusMetrics={syllabusMetrics}
        />
      )}

      {activeTab === "MARKS" && (
        <MarksPanel
          data={data}
          updateMarks={updateMarks}
          targetGradeGoal={targetGradeGoal}
          setTargetGradeGoal={setTargetGradeGoal}
          marksSummary={marksSummary}
        />
      )}

      {activeTab === "TASKS_NOTES" && (
        <>
          <SchedulePanel
            data={data}
            updateSubjectData={updateSubjectData}
            today={today}
            subject={subject}
          />
          <NotesPanel
            data={data}
            updateNotes={updateNotes}
            addTask={addTask}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            addResource={addResource}
            deleteResource={deleteResource}
            newTaskInput={newTaskInput}
            setNewTaskInput={setNewTaskInput}
            newResourceLabel={newResourceLabel}
            setNewResourceLabel={setNewResourceLabel}
            newResourceUrl={newResourceUrl}
            setNewResourceUrl={setNewResourceUrl}
            showAddResource={showAddResource}
            setShowAddResource={setShowAddResource}
            subject={subject}
          />
        </>
      )}
    </div>
  );
}

/** Syllabus: one hard-edged cell per topic, filled as topics are ticked off. */
function TopicGrid({ total, done }) {
  const CAP = 20;
  const cells = total > 0 ? Math.min(total, CAP) : 8;
  const filled =
    total > 0 ? Math.round((done / total) * cells) : 0;
  return (
    <div className="grid grid-cols-4 gap-1.5 shrink-0 w-[80px]" aria-hidden>
      {Array.from({ length: cells }).map((_, i) => (
        <span
          key={i}
          className="aspect-square border-2 border-[var(--border)]"
          style={{
            borderRadius: 2,
            background: i < filled ? "var(--color-sky)" : "transparent",
            opacity: total > 0 ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

/** Marks: four vertical bars, one per assessment component. */
function MarksBars({ s, accent }) {
  const parts = [
    { k: "M1", v: s.mid1, max: s.mid1Max },
    { k: "M2", v: s.mid2, max: s.mid2Max },
    { k: "INT", v: s.internal, max: s.internalMax },
    { k: "END", v: s.endSem, max: s.endSemMax },
  ];
  return (
    <div className="flex items-end gap-1.5 shrink-0" aria-hidden>
      {parts.map((p) => {
        const pct =
          p.max > 0 ? Math.min(100, Math.max(0, (p.v / p.max) * 100)) : 0;
        return (
          <div key={p.k} className="flex flex-col items-center gap-1">
            <div
              className="w-3.5 sm:w-4 h-[50px] sm:h-[58px] border-2 border-[var(--border)] flex flex-col justify-end overflow-hidden"
              style={{ borderRadius: 2 }}
            >
              <div style={{ height: `${pct}%`, background: accent }} />
            </div>
            <span className="text-[0.55rem] sm:t-micro muted leading-none">
              {p.k}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Tasks: a miniature checklist — checked rows for done, empty for open. */
function TaskStack({ tasks }) {
  const ordered = [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done),
  );
  const rows = ordered.slice(0, 4);
  const pad = Math.max(0, 4 - rows.length);
  return (
    <div className="flex flex-col gap-1.5 shrink-0 w-[80px]" aria-hidden>
      {rows.map((t, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 shrink-0 border-2 border-[var(--border)] grid place-items-center"
            style={{
              borderRadius: 2,
              background: t.done ? "var(--color-present)" : "transparent",
            }}
          >
            {t.done ? (
              <Check size={9} strokeWidth={4} className="text-[var(--on-accent)]" />
            ) : null}
          </span>
          <span
            className="h-1.5 flex-1 bg-[var(--border)]"
            style={{ borderRadius: 1, opacity: t.done ? 0.35 : 0.8 }}
          />
        </span>
      ))}
      {Array.from({ length: pad }).map((_, i) => (
        <span key={`pad-${i}`} className="flex items-center gap-1.5 opacity-25">
          <span
            className="w-3.5 h-3.5 shrink-0 border-2 border-dashed border-[var(--border)]"
            style={{ borderRadius: 2 }}
          />
          <span
            className="h-1.5 flex-1 bg-[var(--border)]"
            style={{ borderRadius: 1 }}
          />
        </span>
      ))}
    </div>
  );
}

/** One tile on the overview: a visual, a headline, a sentence, and a way in. */
function DigestCard({
  title,
  icon: Icon,
  value,
  valueColor,
  visual,
  note,
  onOpen,
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="board board-hard bg-[var(--surface)] text-left flex flex-col justify-between cursor-pointer transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md group min-h-[165px] sm:min-h-[185px] w-full overflow-hidden"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-1 px-2.5 py-2 sm:px-3.5 sm:py-2.5 border-b border-[var(--border)] w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="size-3 sm:icon-micro text-[var(--muted)] shrink-0" strokeWidth={2.5} />
          <p className="text-[0.65rem] sm:text-xs font-black uppercase tracking-wider truncate">{title}</p>
        </div>
        <ChevronRight className="size-3 text-[var(--muted)] opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={3} />
      </div>

      {/* Card Body — vertically stacked & centered on mobile 50% cards */}
      <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col items-center text-center justify-center gap-2 w-full">
        <div className="shrink-0 grid place-items-center">
          {visual}
        </div>
        <div className="min-w-0 w-full flex flex-col items-center gap-0.5">
          <p
            className="text-xs sm:text-sm md:text-base font-black tracking-tight uppercase leading-tight truncate w-full"
            style={valueColor ? { color: valueColor } : undefined}
          >
            {value}
          </p>
          <p className="text-[0.6rem] sm:text-[0.6875rem] text-[var(--muted)] normal-case leading-snug line-clamp-2 w-full">
            {note}
          </p>
        </div>
      </div>

      {/* Card Footer */}
      <div className="text-[0.55rem] sm:text-[0.65rem] font-black px-2.5 py-1.5 sm:px-3.5 sm:py-2 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between group-hover:bg-[var(--surface-muted)] transition-colors w-full">
        <span>OPEN</span>
        <ChevronRight className="size-3 shrink-0 group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
      </div>
    </button>
  );
}
