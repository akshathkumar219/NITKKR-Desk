import { useState } from "react";
import {
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Meter } from "../../ui";

export default function SyllabusPanel({
  subject = {},
  data,
  addUnit,
  deleteUnit,
  updateUnitContent,
  toggleTopic,
  syllabusSearch,
  setSyllabusSearch,
  newUnitTitle,
  setNewUnitTitle,
  showAddUnit,
  setShowAddUnit,
  syllabusMetrics,
}) {
  // Mode per unit: toggle between interactive checklist and raw textarea
  const [editingUnits, setEditingUnits] = useState({});
  const [showObjectives, setShowObjectives] = useState(true);
  const [showReferences, setShowReferences] = useState(true);
  // Dropdown accordion state: all units closed by default
  const [expandedUnits, setExpandedUnits] = useState({});

  const toggleUnitExpand = (unitId) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleUnitEditMode = (unitId) => {
    setEditingUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const allUnitIds = (data.units || []).map((u) => u.id);
  const allExpanded =
    allUnitIds.length > 0 && allUnitIds.every((id) => Boolean(expandedUnits[id]));

  const toggleAllUnits = () => {
    if (allExpanded) {
      setExpandedUnits({});
    } else {
      const next = {};
      allUnitIds.forEach((id) => {
        next[id] = true;
      });
      setExpandedUnits(next);
    }
  };

  const objectives =
    (data.objectives && data.objectives.length > 0)
      ? data.objectives
      : (subject.objectives || []);

  const references =
    (data.references && data.references.length > 0)
      ? data.references
      : (subject.references || []);

  return (
    <section className="board board-hard bg-[var(--surface)] pad-page flex flex-col gap-4 border-l-4 border-l-[var(--color-sky)]">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <BookOpen
            className="icon-md text-[var(--color-sky)]"
            strokeWidth={2.5}
          />
          <div>
            <h2 className="t-section">SYLLABUS</h2>
            {subject.code && (
              <p className="text-[10px] font-mono font-bold uppercase text-[var(--muted)]">
                {subject.code} · {subject.category || "PC"} · {subject.credits || 4} CREDITS
              </p>
            )}
          </div>
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
          <span className="text-[var(--color-sky)] font-mono font-bold">
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
            placeholder="UNIT 6: DISTRIBUTED SYSTEMS"
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
        {(data.units || []).length > 0 && (
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-[var(--muted)] px-0.5">
            <span>UNITS ({(data.units || []).length})</span>
            <button
              type="button"
              onClick={toggleAllUnits}
              className="text-[10px] font-bold text-[var(--color-sky)] hover:underline uppercase tracking-wider cursor-pointer"
            >
              {allExpanded ? "COLLAPSE ALL" : "EXPAND ALL"}
            </button>
          </div>
        )}

        {(data.units || []).length === 0 ? (
          <div className="board board-hard pad-card text-center py-8 text-[var(--muted)]">
            <BookOpen className="icon-md mx-auto mb-2 opacity-50" />
            <p className="text-xs uppercase font-bold">NO SYLLABUS UNITS FOUND</p>
            <p className="text-[11px] mt-1">
              Click &quot;ADD UNIT&quot; above to create a unit or customize this syllabus.
            </p>
          </div>
        ) : (
          (data.units || []).map((unit) => {
            const uTopics = unit.topics || [];
            const uTotal = uTopics.length;
            const uDone = uTopics.filter((t) => t.done).length;
            const isEditing = editingUnits[unit.id] || uTotal === 0;
            // Unit is open if explicitly expanded, or if active search is filtering
            const isExpanded = Boolean(
              expandedUnits[unit.id] || (syllabusSearch && syllabusSearch.trim().length > 0)
            );

            const defaultContent =
              unit.content !== undefined
                ? unit.content
                : (unit.topics || [])
                    .map((t) => (t.title ? `• ${t.title}` : `• ${t}`))
                    .join("\n");

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
                className={`board board-hard transition-all duration-150 bg-[var(--surface)] ${
                  isExpanded
                    ? "pad-card flex flex-col gap-3 border-[var(--color-sky)]/50"
                    : "p-3 sm:p-3.5 hover:border-[var(--color-sky)]/70"
                }`}
              >
                {/* UNIT HEADER (DROPDOWN ACCORDION TRIGGER) */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => toggleUnitExpand(unit.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleUnitExpand(unit.id);
                    }
                  }}
                  className={`flex items-center justify-between gap-2 cursor-pointer select-none group ${
                    isExpanded ? "border-b border-[var(--border)]/50 pb-2.5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <ChevronDown
                      className={`icon-micro text-[var(--muted)] group-hover:text-[var(--text)] transition-transform duration-200 shrink-0 ${
                        isExpanded ? "rotate-180 text-[var(--color-sky)]" : ""
                      }`}
                      strokeWidth={2.5}
                    />
                    <span className="t-card-title truncate group-hover:text-[var(--color-sky)] transition-colors">
                      {unit.title}
                    </span>
                    {uTotal > 0 && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)] shrink-0">
                        {uDone}/{uTotal} DONE
                      </span>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {uTotal > 0 && isExpanded && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUnitEditMode(unit.id);
                        }}
                        className="btn !py-1 !px-2 text-[10px] font-normal uppercase cursor-pointer flex items-center gap-1"
                        title={isEditing ? "View checklist" : "Edit as text"}
                      >
                        {isEditing ? (
                          <>
                            <CheckSquare className="icon-micro" />
                            <span>CHECKLIST</span>
                          </>
                        ) : (
                          <>
                            <Pencil className="icon-micro" />
                            <span>EDIT TEXT</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteUnit(unit.id);
                      }}
                      className="text-red-500 opacity-60 hover:opacity-100 p-1 cursor-pointer"
                      title="Delete Unit"
                      aria-label="Delete Unit"
                    >
                      <Trash2 className="icon-micro" />
                    </button>
                  </div>
                </div>

                {/* UNIT CONTENT: VISIBLE ONLY WHEN EXPANDED */}
                {isExpanded && (
                  <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                    {isEditing ? (
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
                        <p className="text-[10px] text-[var(--muted)] mt-1">
                          Type each topic with &quot;• &quot; bullet and press Enter. Switch back to Checklist to mark topics done.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {uTopics.map((topic) => (
                          <div
                            key={topic.id}
                            onClick={() => toggleTopic && toggleTopic(unit.id, topic.id)}
                            className={`flex items-center justify-between p-2 rounded-sm border transition-all cursor-pointer ${
                              topic.done
                                ? "bg-[var(--surface-2)] border-[var(--border)]/40 opacity-75"
                                : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--color-sky)]"
                            }`}
                          >
                            <label className="flex items-center gap-2.5 text-xs font-normal cursor-pointer select-none min-w-0">
                              <input
                                type="checkbox"
                                checked={!!topic.done}
                                onChange={() => {}}
                                className="size-4 accent-[var(--color-sky)] shrink-0"
                              />
                              <span
                                className={`leading-snug ${
                                  topic.done
                                    ? "line-through text-[var(--muted)]"
                                    : "text-[var(--text)]"
                                }`}
                              >
                                {topic.title}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* COURSE OBJECTIVES SECTION (IF AVAILABLE) */}
      {objectives.length > 0 && (
        <div className="board board-hard pad-card bg-[var(--surface)] flex flex-col gap-2 mt-2">
          <div
            className="flex items-center justify-between border-b border-[var(--border)]/50 pb-2 cursor-pointer select-none"
            onClick={() => setShowObjectives((prev) => !prev)}
          >
            <div className="flex items-center gap-2">
              <FileText className="icon-micro text-[var(--color-amber)]" />
              <h3 className="t-card-title text-xs uppercase">
                COURSE LEARNING OBJECTIVES ({objectives.length})
              </h3>
            </div>
            {showObjectives ? (
              <ChevronUp className="icon-micro text-[var(--muted)]" />
            ) : (
              <ChevronDown className="icon-micro text-[var(--muted)]" />
            )}
          </div>
          {showObjectives && (
            <ol className="list-decimal list-inside space-y-1 text-xs text-[var(--muted)] leading-relaxed pt-1">
              {objectives.map((obj, i) => (
                <li key={i} className="pl-1">
                  <span className="text-[var(--text)]">{obj}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* TEXTBOOKS & REFERENCES SECTION (IF AVAILABLE) */}
      {references.length > 0 && (
        <div className="board board-hard pad-card bg-[var(--surface)] flex flex-col gap-2">
          <div
            className="flex items-center justify-between border-b border-[var(--border)]/50 pb-2 cursor-pointer select-none"
            onClick={() => setShowReferences((prev) => !prev)}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="icon-micro text-[var(--color-emerald)]" />
              <h3 className="t-card-title text-xs uppercase">
                RECOMMENDED TEXTBOOKS & REFERENCES ({references.length})
              </h3>
            </div>
            {showReferences ? (
              <ChevronUp className="icon-micro text-[var(--muted)]" />
            ) : (
              <ChevronDown className="icon-micro text-[var(--muted)]" />
            )}
          </div>
          {showReferences && (
            <ul className="list-disc list-inside space-y-1.5 text-xs text-[var(--muted)] leading-relaxed pt-1">
              {references.map((ref, i) => (
                <li key={i} className="pl-1">
                  <span className="text-[var(--text)]">{ref}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
