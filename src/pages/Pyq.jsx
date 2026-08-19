import { useState } from 'react'
import { FileText, X } from 'lucide-react'
import PlainShell from '../components/PlainShell'
import { Chip, Eyebrow, Panel } from '../ui'
import { PYQ_PAPERS, PYQ_YEARS } from '../data/pyq'

function Viewer({ paper, onClose }) {
  if (!paper) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div
        className="flex items-center justify-between gap-4 border-b-2 border-[var(--border)] px-4 py-3"
        style={{ background: 'var(--color-acid)' }}
      >
        <div className="flex items-center gap-3">
          <button type="button" className="btn !py-1.5" onClick={onClose}>
            <X size={14} strokeWidth={2.5} /> CLOSE
          </button>
          <p className="heading text-sm" style={{ color: 'var(--color-ink)' }}>
            {paper.code} · {paper.title}
          </p>
        </div>
        <p className="label" style={{ color: 'var(--color-ink)' }}>
          VIEW ONLY
        </p>
      </div>

      <div className="grid flex-1 place-items-center p-6">
        {paper.url ? (
          <iframe
            title={`${paper.code} paper`}
            src={paper.url}
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="max-w-md text-center text-white">
            <p className="heading text-2xl">NO FILE ATTACHED</p>
            <p className="label mt-3 opacity-70">
              THIS ENTRY HAS NO URL YET. HOST THE SCAN (A DRIVE "VIEW ONLY" PREVIEW LINK
              WORKS WELL) AND PUT IT ON THE PAPER IN SRC/DATA/PYQ.JS
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Pyq() {
  const [year, setYear] = useState(null)
  const [paper, setPaper] = useState(null)
  const papers = year ? (PYQ_PAPERS[year] ?? []) : []

  return (
    <PlainShell back="/info" backLabel="BACK TO INFO">
      <Eyebrow icon={FileText}>PYQ ARCHIVE</Eyebrow>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <h1 className="display text-5xl sm:text-7xl">
          previous
          <br />
          year
          <br />
          questions
        </h1>
        <p className="label muted max-w-xs sm:text-right">
          PICK A SESSION TO BROWSE PAST PAPERS.
        </p>
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Chip tone="var(--text)" style={{ color: 'var(--bg)' }}>
            STEP 01
          </Chip>
          <span className="label muted">SELECT SESSION</span>
        </div>

        <div className="flex flex-wrap gap-3">
          {PYQ_YEARS.map((y) => {
            const active = year === y.id
            return (
              <button
                key={y.id}
                type="button"
                disabled={!y.available}
                onClick={() => setYear(active ? null : y.id)}
                className="board board-hard w-40 p-4 text-left disabled:opacity-45"
                style={{
                  ...(active ? { background: 'var(--color-acid)', color: 'var(--color-ink)' } : null),
                  ...(y.available ? null : { borderStyle: 'dashed', boxShadow: 'none' }),
                }}
              >
                <p className="heading text-2xl">{y.label}</p>
                <p className="label mt-2 opacity-70">{y.sub}</p>
              </button>
            )
          })}
        </div>
      </section>

      {year ? (
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <Chip tone="var(--text)" style={{ color: 'var(--bg)' }}>
              STEP 02
            </Chip>
            <span className="label muted">PAPERS — {year}</span>
          </div>

          {papers.length === 0 ? (
            <Panel className="p-8 text-center">
              <p className="heading text-lg">NO PAPERS FOR THIS SESSION YET</p>
            </Panel>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {papers.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setPaper(p)}
                  className="board board-hard p-4 text-left transition-transform hover:-translate-y-0.5"
                >
                  <Chip tone="var(--color-sky)">{p.code}</Chip>
                  <p className="heading mt-3 text-base">{p.title}</p>
                  <p className="label muted mt-1.5">
                    {year} · {p.sem}
                  </p>
                  <p className="label mt-4 flex items-center justify-between">
                    <span>VIEW PAPER →</span>
                    {!p.url ? <span className="muted">NO FILE</span> : null}
                  </p>
                </button>
              ))}
            </div>
          )}

          <p className="label muted mt-6">
            * PAPERS OPEN IN A VIEW-ONLY VIEWER. ONLY HOST SCANS YOU HAVE PERMISSION
            TO SHARE.
          </p>
        </section>
      ) : null}

      <Viewer paper={paper} onClose={() => setPaper(null)} />
    </PlainShell>
  )
}
