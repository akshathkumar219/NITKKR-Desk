import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import { Meter } from "../../ui";

export default function SyllabusPanel({
  data,
  addUnit,
  deleteUnit,
  updateUnitContent,
  syllabusSearch,
  setSyllabusSearch,
  newUnitTitle,
  setNewUnitTitle,
  showAddUnit,
  setShowAddUnit,
  syllabusMetrics,
}) {
  return (
    <section className="board board-hard bg-[var(--surface)] pad-page flex flex-col gap-4 border-l-4 border-l-[var(--color-sky)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <BookOpen
            className="icon-md text-[var(--color-sky)]"
            strokeWidth={2.5}
          />
          <h2 className="t-section">SYLLABUS</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddUnit((prev) => !prev)}
            className="btn !py-1 !px-2.5 text-xs font-normal uppercase cursor-pointer"
          >
            <Plus className="icon-micro" strokeWidth={2.5} />{" "}
            {showAddUnit ? "CANCEL" : "ADD UNIT"}
          </button>
        </div>
      </div>

      {/* OVERALL SYLLABUS PROGRESS METER */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-normal uppercase text-[var(--muted)]">
          <span>SYLLABUS COVERAGE</span>
          <span className="text-[var(--color-sky)]">
            {syllabusMetrics.pct}% COMPLETED ({syllabusMetrics.doneTopics}/{syllabusMetrics.totalTopics})
          </span>
        </div>
        <Meter percent={syllabusMetrics.pct} color="var(--color-sky)" />
      </div>

      {/* SYLLABUS TOPIC FILTER */}
      <div className="relative">
        <Search
          className="icon-micro absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
        />
        <input
          className="field !py-1 !pl-7 !pr-2 text-xs font-normal uppercase"
          placeholder="FILTER TOPICS IN SYLLABUS..."
          value={syllabusSearch}
          onChange={(e) => setSyllabusSearch(e.target.value)}
        />
      </div>

      {/* ADD NEW UNIT DRAWER */}
      {showAddUnit && (
        <div className="board board-hard pad-card bg-[var(--surface)] flex flex-wrap items-center gap-2">
          <input
            className="field !py-1.5 !px-2.5 text-xs font-normal uppercase flex-1"
            placeholder="UNIT 6"
            value={newUnitTitle}
            onChange={(e) => setNewUnitTitle(e.target.value.toUpperCase())}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              if (newUnitTitle.trim()) {
                addUnit(newUnitTitle);
                setNewUnitTitle("");
                setShowAddUnit(false);
              }
            }}
            className="btn btn-go !py-1.5 !px-3 text-xs font-normal uppercase cursor-pointer"
          >
            SAVE UNIT
          </button>
        </div>
      )}

      {/* UNIT ACCORDION LIST */}
      <div className="space-y-3">
        {(data.units || []).map((unit) => {
          const defaultContent =
            unit.content !== undefined
              ? unit.content
              : (unit.topics || [])
                  .map((t) => (t.title ? `• ${t.title}` : `• ${t}`))
                  .join("\n");

          const uTopics = unit.topics || [];
          const uTotal = uTopics.length;

          // Filter by search query if any
          if (
            syllabusSearch.trim() &&
            !unit.title.toUpperCase().includes(syllabusSearch.trim().toUpperCase()) &&
            !defaultContent.toUpperCase().includes(syllabusSearch.trim().toUpperCase())
          ) {
            return null;
          }

          return (
            <div
              key={unit.id}
              className="board board-hard pad-card flex flex-col gap-3 transition-all bg-[var(--surface)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)]/50 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="t-card-title truncate">
                    {unit.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal uppercase text-[var(--muted)] font-mono">
                    {uTotal} TOPICS
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteUnit(unit.id)}
                    className="text-red-500 opacity-60 hover:opacity-100 p-1 cursor-pointer"
                    title="Delete Unit"
                    aria-label="Delete Unit"
                  >
                    <Trash2 className="icon-micro" />
                  </button>
                </div>
              </div>

              {/* EDITABLE DOT-LISTED SYLLABUS BOX */}
              <div className="relative">
                <textarea
                  className="field !p-3 text-xs font-normal uppercase leading-relaxed font-sans min-h-[110px] resize-y"
                  placeholder="• TOPIC 1&#10;• TOPIC 2"
                  value={defaultContent}
                  onChange={(e) => updateUnitContent(unit.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const cursor = e.target.selectionStart;
                      const val = e.target.value;
                      const before = val.slice(0, cursor);
                      const after = val.slice(cursor);
                      const nextVal = before + "\n• " + after;
                      updateUnitContent(unit.id, nextVal);
                      setTimeout(() => {
                        e.target.selectionStart = e.target.selectionEnd = cursor + 3;
                      }, 0);
                    }
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
