import {
  ExternalLink,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";

export default function NotesPanel({
  data,
  updateNotes,
  addTask,
  toggleTask,
  deleteTask,
  addResource,
  deleteResource,
  newTaskInput,
  setNewTaskInput,
  newResourceLabel,
  setNewResourceLabel,
  newResourceUrl,
  setNewResourceUrl,
  showAddResource,
  setShowAddResource,
}) {
  const pendingTasks = (data.tasks || []).filter((t) => !t.done).length;
  const resources = data.resources || [];

  return (
    <section className="board board-hard bg-[var(--surface)] pad-page flex flex-col gap-4 border-l-4 border-l-[var(--color-coral)]">
      {/* CARD HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <FileText
            className="icon-md text-[var(--color-coral)]"
            strokeWidth={2.5}
          />
          <h2 className="t-section">NOTES</h2>
        </div>
        <div className="flex items-center gap-2">
          {pendingTasks > 0 && (
            <span className="chip text-sm font-normal uppercase bg-[var(--color-amber)] text-[var(--on-accent)]">
              {pendingTasks} PENDING TASK{pendingTasks === 1 ? "" : "S"}
            </span>
          )}
          <span className="text-sm font-normal uppercase text-[var(--muted)] font-mono">
            AUTO-SAVED
          </span>
        </div>
      </div>

      {/* TWO-COLUMN SUBSECTIONS: NOTEPAD (LEFT) & TASKS + LINKS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* SUBSECTION 1: STUDENT NOTEPAD (col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-2.5 h-full">
          <div className="pb-1 border-b border-[var(--border)]/40">
            <h3 className="t-card-title">STUDENT NOTEPAD</h3>
          </div>

          <textarea
            className="field !p-3 text-sm font-normal leading-relaxed font-sans min-h-[220px] lg:min-h-[280px] resize-y flex-1"
            placeholder="Write your personal subject notes, exam tips, lecture summaries, formula cheat sheets, or hints directly here..."
            value={data.notes || ""}
            onChange={(e) => updateNotes(e.target.value)}
          />
        </div>

        {/* SUBSECTION 2: TASKS & LINKS (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* TASKS SUBSECTION */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]/40">
              <h3 className="t-card-title">TASKS</h3>
              <span className="chip text-sm font-normal uppercase">
                {pendingTasks} PENDING
              </span>
            </div>

            {/* QUICK TASK ADDER */}
            <div className="flex items-center gap-1.5">
              <input
                className="field !py-1.5 !px-2.5 text-sm font-normal flex-1"
                placeholder="+ Add assignment / lab task..."
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTaskInput.trim()) {
                    addTask(newTaskInput);
                    setNewTaskInput("");
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newTaskInput.trim()) {
                    addTask(newTaskInput);
                    setNewTaskInput("");
                  }
                }}
                className="btn btn-go !py-1.5 !px-3 text-sm font-normal uppercase cursor-pointer"
              >
                ADD
              </button>
            </div>

            {/* TASK ITEMS LIST */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {(data.tasks || []).length === 0 ? (
                <p className="text-sm font-normal uppercase text-[var(--muted)] py-3 text-center">
                  NO ACTIVE TASKS
                </p>
              ) : (
                (data.tasks || []).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => toggleTask(t.id)}
                    className={`flex items-center justify-between p-2 rounded-sm border transition-all cursor-pointer ${
                      t.done
                        ? "bg-[var(--surface-2)] border-[var(--border)]/30 opacity-70"
                        : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--color-acid)]"
                    }`}
                  >
                    <label className="flex items-center gap-2 text-sm font-normal cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => {}}
                        className="size-4 accent-[var(--color-acid)]"
                      />
                      <span className={t.done ? "line-through opacity-70" : ""}>
                        {t.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(t.id);
                      }}
                      className="opacity-40 hover:opacity-100 text-red-500 p-1 cursor-pointer"
                      title="Delete task"
                      aria-label="Delete task"
                    >
                      <Trash2 className="icon-micro" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RESOURCES & LINKS SUBSECTION */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--border)]/40">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]/40">
              <h3 className="t-card-title">LINKS</h3>
              <button
                type="button"
                onClick={() => setShowAddResource((prev) => !prev)}
                className="btn !py-1 !px-2.5 text-sm font-normal uppercase cursor-pointer"
              >
                <Plus className="icon-micro" />{" "}
                {showAddResource ? "CANCEL" : "ADD LINK"}
              </button>
            </div>

            {showAddResource && (
              <div className="board pad-tight bg-[var(--surface-2)] flex flex-col gap-2">
                <input
                  className="field !py-1.5 !px-2.5 text-sm font-normal"
                  placeholder="Link Label (e.g. Drive Slides / NPTEL)"
                  value={newResourceLabel}
                  onChange={(e) => setNewResourceLabel(e.target.value)}
                />
                <input
                  className="field !py-1.5 !px-2.5 text-sm font-normal font-mono"
                  placeholder="URL (https://...)"
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newResourceLabel.trim()) {
                      addResource(newResourceLabel, newResourceUrl);
                      setNewResourceLabel("");
                      setNewResourceUrl("");
                      setShowAddResource(false);
                    }
                  }}
                  className="btn btn-go !py-1.5 !px-3 text-sm font-normal uppercase cursor-pointer"
                >
                  SAVE RESOURCE
                </button>
              </div>
            )}

            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {resources.length === 0 ? (
                <p className="text-sm font-normal uppercase text-[var(--muted)] py-2 text-center">
                  NO LINKS SAVED
                </p>
              ) : (
                resources.map((r) => (
                  <div
                    key={r.id}
                    className="board pad-tight flex items-center justify-between bg-[var(--surface)] text-sm font-normal"
                  >
                    <a
                      href={r.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-[var(--color-sky)] truncate"
                    >
                      <ExternalLink className="icon-micro shrink-0" />
                      <span className="truncate">{r.label}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => deleteResource(r.id)}
                      className="text-red-500 opacity-40 hover:opacity-100 p-1 cursor-pointer"
                      title="Delete link"
                      aria-label="Delete link"
                    >
                      <Trash2 className="icon-micro" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
