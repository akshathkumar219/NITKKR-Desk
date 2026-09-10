import { useState, useMemo } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckSquare,
  ChevronRight,
  Copy,
  Layers,
  Pencil,
  Percent,
  Target,
} from "lucide-react";
import { Ring } from "../ui";
import { useSubjectStore } from "../lib/storage";
import { canSkip, mustAttend, tally } from "../lib/rollcall";
import { dayCode, minutesNow } from "../lib/time";
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
    addTask,
    toggleTask,
    deleteTask,
    addResource,
    deleteResource,
  } = useSubjectStore(courseKey, {
    credits: subject.category === "LAB" ? "2" : "4",
    instructor: subject.instructor || "",
    accent: subject.accent || initialTheme.accent,
    targetCutoff: String(subject.targetCutoff || "65"),
  });


  const [activeTab, setActiveTab] = useState("ALL"); // 'ALL' | 'ATTENDANCE' | 'SYLLABUS' | 'MARKS' | 'TASKS_NOTES'
  const [syllabusSearch, setSyllabusSearch] = useState("");
  const [newUnitTitle, setNewUnitTitle] = useState("");
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [newResourceLabel, setNewResourceLabel] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [showAddResource, setShowAddResource] = useState(false);
  const [targetGradeGoal, setTargetGradeGoal] = useState("A+");
  const [copiedLink, setCopiedLink] = useState(false);

  // Copy direct subject URL to clipboard
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="btn !py-1.5 !px-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-hard-sm hover:-translate-x-0.5"
            >
              <ArrowLeft className="icon-micro" strokeWidth={3} />
              <span>ALL SUBJECTS</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLiveNow && (
              <span className="chip bg-[var(--color-present)] text-[var(--on-accent)] font-black text-xs animate-pulse">
                🔴 LIVE IN CLASS NOW
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn !py-1.5 !px-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-hard-sm"
              title="Copy direct link to this subject page"
            >
              {copiedLink ? (
                <Check
                  className="icon-micro text-[var(--color-present)]"
                  strokeWidth={3}
                />
              ) : (
                <Copy className="icon-micro" />
              )}
              <span>{copiedLink ? "LINK COPIED" : "SHARE"}</span>
            </button>
          </div>
        </div>

        {/* HERO TITLE & IDENTITY GRID — a 2×2 block of fact tiles sits opposite
            the title: code, credits, professor, and the way to edit them. */}
        <div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-x-4 gap-y-3 border-t pt-3"
          style={{ borderColor: accentHairline }}
        >
          <div className="min-w-0">
            <h1 className="t-masthead">
              {subject.name}
            </h1>
            <p className="t-meta mt-1 opacity-75">
              {subject.sessions?.length || 0} WEEKLY CLASS SLOTS
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:min-w-[20rem] shrink-0">
            <FactTile
              label="SUBJECT CODE"
              value={subject.code ? `<${subject.code}>` : "—"}
              mono
            />
            <FactTile label="CREDITS" value={data.credits || "4"} />
            <FactTile
              label="PROFESSOR"
              value={data.instructor || subject.instructor || "NOT SET"}
              muted={!(data.instructor || subject.instructor)}
            />
            <button
              type="button"
              onClick={() => onEditSubject(subject)}
              className="board h-full min-h-[3.5rem] px-3 py-2 flex items-center justify-center gap-1.5 cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              <Pencil className="icon-micro" strokeWidth={2.5} />
              <span className="t-meta font-black">
                EDIT SUBJECT
              </span>
            </button>
          </div>
        </div>

        {/* WORKSPACE SECTION TABS */}
        <div
          className="flex flex-wrap items-center gap-1.5 border-t pt-3"
          style={{ borderColor: accentHairline }}
        >
          {[
            { id: "ALL", label: "OVERVIEW", icon: Layers },
            { id: "ATTENDANCE", label: "ATTENDANCE", icon: Percent },
            { id: "SYLLABUS", label: "SYLLABUS", icon: BookOpen },
            { id: "MARKS", label: "MARKS", icon: Target },
            { id: "TASKS_NOTES", label: "NOTES & TASKS", icon: CheckSquare },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`btn !py-1.5 !px-3 !text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? "ring-2 ring-black dark:ring-white scale-105 shadow-hard-sm"
                    : "opacity-80 hover:opacity-100"
                }`}
                style={
                  active
                    ? { background: "var(--text)", color: "var(--bg)" }
                    : undefined
                }
              >
                <tab.icon className="icon-micro" strokeWidth={2.5} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* OVERVIEW — a digest, not every panel stacked. Each card states the one
          number that matters for its area and opens the full tab. */}
      {activeTab === "ALL" && (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <DigestCard
            title="ATTENDANCE"
            icon={Percent}
            onOpen={() => setActiveTab("ATTENDANCE")}
            visual={
              <Ring
                percent={attendanceStats.pct}
                size={84}
                strokeWidth={10}
                color={statusColor}
                textSize="text-xl"
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
                    : `${attendanceStats.safeBunkCount} safe skips left of ${attendanceStats.held} held.`
                  : `Attend the next ${attendanceStats.mustAttendCount} to reach ${requiredCutoff}%.`
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
                ? `${Math.round(marksSummary.currentPct)}% so far · targeting ${marksSummary.targetObj.grade}.`
                : "Add mid-term and internal scores to forecast a grade."
            }
          />

          <DigestCard
            title="NOTES & TASKS"
            icon={CheckSquare}
            onOpen={() => setActiveTab("TASKS_NOTES")}
            visual={<TaskStack tasks={data.tasks || []} />}
            value={`${(data.tasks || []).filter((t) => !t.done).length} OPEN`}
            note={
              (data.tasks || []).length === 0 && !(data.notes || "").trim()
                ? "Nothing noted for this subject yet."
                : `${(data.tasks || []).length} tasks · ${(data.resources || []).length} links saved.`
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
          data={data}
          addUnit={addUnit}
          deleteUnit={deleteUnit}
          updateUnitContent={updateUnitContent}
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

/** A small fact tile in the header identity grid. */
function FactTile({ label, value, mono, muted }) {
  return (
    <div className="board bg-[var(--surface-2)] text-[var(--text)] h-full min-h-[3.5rem] px-3 py-2 flex flex-col justify-center gap-1.5">
      <p className="t-micro muted leading-none">
        {label}
      </p>
      <p
        className={`t-card-title truncate ${
          mono ? "font-mono" : ""
        } ${muted ? "text-[var(--muted)]" : ""}`}
        title={value}
      >
        {value}
      </p>
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
    <div className="grid grid-cols-4 gap-1.5 shrink-0 w-[84px]" aria-hidden>
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
          <div key={p.k} className="flex flex-col items-center gap-1.5">
            <div
              className="w-4 h-[62px] border-2 border-[var(--border)] flex flex-col justify-end overflow-hidden"
              style={{ borderRadius: 2 }}
            >
              <div style={{ height: `${pct}%`, background: accent }} />
            </div>
            <span className="t-micro muted leading-none">
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
    <div className="flex flex-col gap-2 shrink-0 w-[84px]" aria-hidden>
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
      className="board board-hard bg-[var(--surface)] text-left flex flex-col cursor-pointer transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg group"
    >
      {/* Three banded rows — label, figure, action — separated by hairlines so
          the card reads as a structure rather than four floating lines. */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)]">
        <Icon className="icon-micro text-[var(--muted)]" strokeWidth={2.5} />
        <p className="t-meta muted">{title}</p>
      </div>

      <div className="px-4 py-3.5 flex-1 flex items-center gap-4">
        {visual}
        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          <p
            className="t-stat"
            style={valueColor ? { color: valueColor } : undefined}
          >
            {value}
          </p>
          <p className="t-meta muted normal-case leading-relaxed">
            {note}
          </p>
        </div>
      </div>

      <span className="t-micro font-black px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-1.5 group-hover:translate-x-0.5 transition-transform">
        OPEN <ChevronRight className="icon-micro" strokeWidth={3} />
      </span>
    </button>
  );
}
