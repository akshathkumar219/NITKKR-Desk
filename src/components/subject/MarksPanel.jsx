import { GraduationCap, Target } from "lucide-react";
import { GRADE_TARGET_THRESHOLDS } from "./grades";

export default function MarksPanel({
  data,
  updateMarks,
  targetGradeGoal,
  setTargetGradeGoal,
  marksSummary,
}) {
  return (
    <section className="board board-hard bg-[var(--surface)] pad-page flex flex-col gap-4 border-l-4 border-l-[var(--color-amber)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <Target
            className="icon-md text-[var(--color-amber)]"
            strokeWidth={2.5}
          />
          <h2 className="t-section">MARKS</h2>
        </div>
        <span className="t-meta muted">
          NITKKR EVALUATION SCHEME · 100 TOTAL MARKS
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* LEFT: MARKS INPUT GRID (col-span-7) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* MID-TERM 1 */}
          <div className="board board-hard pad-card bg-[var(--surface-muted)] flex flex-col justify-between">
            <span className="t-meta muted">
              MID-TERM 1 (15)
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                type="number"
                min={0}
                max={marksSummary.mid1Max}
                step={0.5}
                placeholder="0"
                value={data.marks?.mid1 || ""}
                onChange={(e) => updateMarks({ mid1: e.target.value })}
                className="field !py-1 !px-2 text-sm font-black text-center"
              />
              <span className="t-meta muted font-mono">
                /{marksSummary.mid1Max}
              </span>
            </div>
          </div>

          {/* MID-TERM 2 */}
          <div className="board board-hard pad-card bg-[var(--surface-muted)] flex flex-col justify-between">
            <span className="t-meta muted">
              MID-TERM 2 (15)
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                type="number"
                min={0}
                max={marksSummary.mid2Max}
                step={0.5}
                placeholder="0"
                value={data.marks?.mid2 || ""}
                onChange={(e) => updateMarks({ mid2: e.target.value })}
                className="field !py-1 !px-2 text-sm font-black text-center"
              />
              <span className="t-meta muted font-mono">
                /{marksSummary.mid2Max}
              </span>
            </div>
          </div>

          {/* INTERNAL ASSIGNMENTS / LAB */}
          <div className="board board-hard pad-card bg-[var(--surface-muted)] flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="t-meta muted">
              INTERNALS (20)
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                type="number"
                min={0}
                max={marksSummary.internalMax}
                step={0.5}
                placeholder="0"
                value={data.marks?.internal || ""}
                onChange={(e) => updateMarks({ internal: e.target.value })}
                className="field !py-1 !px-2 text-sm font-black text-center"
              />
              <span className="t-meta muted font-mono">
                /{marksSummary.internalMax}
              </span>
            </div>
          </div>

          {/* END-TERM EXAM */}
          <div className="board board-hard pad-card bg-[var(--surface-muted)] flex flex-col justify-between col-span-2 sm:col-span-3">
            <div className="flex items-center justify-between">
              <span className="t-meta muted">
                END-SEMESTER EXAM (50 MARKS)
              </span>
              <span className="t-micro text-[var(--color-amber)] font-mono">
                50% FINAL WEIGHTAGE
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="number"
                min={0}
                max={marksSummary.endSemMax}
                step={0.5}
                placeholder="Actual score or leave empty to simulate"
                value={data.marks?.endSem || ""}
                onChange={(e) => updateMarks({ endSem: e.target.value })}
                className="field !py-1.5 !px-2.5 text-sm font-black"
              />
              <span className="t-meta muted font-mono shrink-0">
                /{marksSummary.endSemMax}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: TARGET SIMULATOR & PREDICTOR (col-span-5) */}
        <div className="lg:col-span-5 board board-hard pad-card bg-[var(--surface-muted)] flex flex-col justify-between gap-3 h-full">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="t-card-title flex items-center gap-1.5">
                <GraduationCap className="icon-micro text-[var(--color-amber)]" />
                END-SEM GOAL TARGET
              </span>
              <select
                value={targetGradeGoal}
                onChange={(e) => setTargetGradeGoal(e.target.value)}
                className="field !py-1 !pl-2.5 !pr-8 text-xs font-bold min-w-[155px] w-auto cursor-pointer"
              >
                {GRADE_TARGET_THRESHOLDS.map((g) => (
                  <option key={g.grade} value={g.grade}>
                    Target {g.grade} ({g.minPct}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3">
              <p className="t-meta muted">
                REQUIRED IN END-TERM EXAM:
              </p>
              <p className="t-stat mt-1 text-[var(--color-amber)]">
                {marksSummary.isEndSemPossible
                  ? `${Math.max(0, marksSummary.neededInEndSem).toFixed(1)} / 50`
                  : "UNATTAINABLE"}
              </p>
              <p className="text-sm font-normal muted mt-1.5 leading-relaxed">
                {marksSummary.isEndSemPossible ? (
                  <>
                    With {marksSummary.internalsScored.toFixed(1)}/50 currently
                    scored in sessionals & internals, you need at least{" "}
                    {Math.max(0, marksSummary.neededInEndSem).toFixed(1)} marks
                    in the End-Sem paper to secure{" "}
                    {marksSummary.targetObj.label}.
                  </>
                ) : (
                  <>
                    Sessional scores are too low to reach {targetGradeGoal} (
                    {marksSummary.targetObj.minPct}%) even with full 50/50 in
                    End-Sem. Try targeting the next grade tier.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
