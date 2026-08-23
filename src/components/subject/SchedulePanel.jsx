import { Info } from "lucide-react";
import { fmtRange } from "../../lib/time";

export default function SchedulePanel({
  data,
  updateSubjectData,
  today,
  subject,
}) {
  const sessions = subject.sessions || [];

  return (
    <section className="board board-hard bg-[var(--surface)] pad-page flex flex-col gap-4 border-l-4 border-l-[var(--color-violet)]">
      {/* CARD HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <Info
            className="icon-md text-[var(--color-violet)]"
            strokeWidth={2.5}
          />
          <h2 className="t-section">INFO</h2>
        </div>
        <span className="chip text-sm font-normal uppercase">
          {sessions.length} WEEKLY SLOT{sessions.length === 1 ? "" : "S"}
        </span>
      </div>

      {/* TWO-COLUMN SUBSECTIONS: SCHEDULE (LEFT) & FACULTY (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* SUBSECTION 1: WEEKLY SLOTS (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          <div className="pb-1 border-b border-[var(--border)]/40">
            <h3 className="t-card-title">WEEKLY SLOTS</h3>
          </div>

          {sessions.length === 0 ? (
            <div className="board pad-card bg-[var(--surface-2)] text-center py-6">
              <p className="text-sm font-normal uppercase text-[var(--muted)]">
                NO TIMETABLE SLOTS FOUND
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sessions.map((sess, idx) => {
                const isToday = sess.day === today;
                return (
                  <div
                    key={sess.id || idx}
                    className={`board pad-tight flex items-center justify-between transition-all ${
                      isToday
                        ? "border-2 border-[var(--color-acid)] bg-[var(--surface-muted)]"
                        : "bg-[var(--surface-2)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="chip text-sm font-normal bg-[var(--surface)] shrink-0">
                        {sess.day}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                          {fmtRange(sess.start, sess.end)}
                        </p>
                        <p className="text-sm font-normal uppercase text-[var(--muted)] mt-0.5 truncate">
                          ROOM: {sess.room || "TBD"}
                          {sess.group ? ` · GRP ${sess.group}` : ""}
                        </p>
                      </div>
                    </div>
                    {isToday && (
                      <span className="chip text-xs font-bold bg-[var(--color-acid)] text-[var(--on-accent)] shrink-0">
                        TODAY
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SUBSECTION 2: FACULTY & POLICIES (col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          <div className="pb-1 border-b border-[var(--border)]/40">
            <h3 className="t-card-title">FACULTY & GUIDELINES</h3>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-sm font-normal uppercase text-[var(--muted)] block mb-1">
                PROFESSOR / INSTRUCTOR NAME
              </label>
              <input
                className="field !py-1.5 !px-2.5 text-sm font-normal uppercase"
                placeholder="E.G. DR. VIKRAM SINGH"
                value={data.instructor || ""}
                onChange={(e) =>
                  updateSubjectData({ instructor: e.target.value.toUpperCase() })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-sm font-normal uppercase text-[var(--muted)] block mb-1">
                  CABIN / OFFICE ROOM
                </label>
                <input
                  className="field !py-1.5 !px-2.5 text-sm font-normal uppercase"
                  placeholder="E.G. CS-BLOCK CABIN 204"
                  value={data.cabin || ""}
                  onChange={(e) =>
                    updateSubjectData({ cabin: e.target.value.toUpperCase() })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-normal uppercase text-[var(--muted)] block mb-1">
                  EMAIL / CONSULTATION HOURS
                </label>
                <input
                  className="field !py-1.5 !px-2.5 text-sm font-normal"
                  placeholder="E.G. WED 3-5 PM"
                  value={data.hours || ""}
                  onChange={(e) => updateSubjectData({ hours: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-normal uppercase text-[var(--muted)] block mb-1">
                COURSE POLICIES & SPECIAL GUIDELINES
              </label>
              <textarea
                className="field !py-1.5 !px-2.5 text-sm font-normal leading-relaxed h-16 resize-none"
                placeholder="E.G. Submissions must be handwritten on A4 sheets. 80% attendance required for grace marks."
                value={data.guidelines || ""}
                onChange={(e) =>
                  updateSubjectData({ guidelines: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
