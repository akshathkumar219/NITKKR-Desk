import { Percent, RotateCcw } from "lucide-react";

export default function AttendancePanel({
  requiredCutoff,
  attendanceStats,
  courseKey,
  adjustSubject,
  manualAdj,
}) {
  const isSafe =
    attendanceStats.pct === null || attendanceStats.pct >= requiredCutoff;
  const statusInk =
    attendanceStats.pct === null
      ? "var(--muted)"
      : isSafe
        ? "var(--present-ink)"
        : "var(--absent-ink)";

  return (
    <section className="board board-hard bg-[var(--surface)] pad-page flex flex-col gap-4 border-l-4 border-l-[var(--color-acid)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <Percent
            className="icon-md text-[var(--color-acid)]"
            strokeWidth={2.5}
          />
          <h2 className="t-section">ATTENDANCE</h2>
        </div>
        <span className="t-meta muted">
          TARGET CUTOFF:{" "}
          <strong className="text-[var(--text)]">{requiredCutoff}%</strong>
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p
            className="t-meta"
            style={{ color: statusInk }}
          >
            {attendanceStats.pct === null
              ? "UNTRACKED"
              : isSafe
                ? "ON TRACK"
                : "BELOW CUTOFF"}
          </p>
          <p
            className="t-stat mt-1"
            style={{ color: statusInk }}
          >
            {attendanceStats.pct === null
              ? "NO CLASSES LOGGED"
              : isSafe
                ? attendanceStats.safeBunkCount === Infinity
                  ? "PERFECT ATTENDANCE"
                  : `${attendanceStats.safeBunkCount} SAFE SKIPS REMAINING`
                : `MUST ATTEND NEXT ${attendanceStats.mustAttendCount} CLASSES`}
          </p>
          <p className="t-meta muted normal-case mt-1.5 leading-relaxed">
            {attendanceStats.present} present of {attendanceStats.held} held ·{" "}
            {attendanceStats.absent} missed · cutoff {requiredCutoff}%
          </p>
        </div>

        {/* QUICK MANUAL LOGGING CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-2 board pad-card bg-[var(--surface-muted)]">
          <span className="t-meta muted">
            QUICK ADJUST COUNT:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustSubject(courseKey, 1)}
              className="btn btn-go !py-1 !px-2.5 text-xs font-black cursor-pointer"
            >
              +1 PRESENT
            </button>
            <button
              type="button"
              onClick={() => adjustSubject(courseKey, -1)}
              className="btn !py-1 !px-2.5 text-xs font-bold text-red-500 hover:border-red-500 cursor-pointer"
            >
              -1 ATTENDED
            </button>
            {manualAdj !== 0 && (
              <button
                type="button"
                onClick={() => adjustSubject(courseKey, -manualAdj)}
                className="btn !py-1 !px-2 text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer"
                title="Reset manual adjustments"
              >
                <RotateCcw className="icon-micro" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
