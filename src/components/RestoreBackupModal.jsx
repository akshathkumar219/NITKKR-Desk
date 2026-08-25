import { useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Hash,
  Home,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Modal } from '../ui'
import { branchName, hostelName } from '../data/campus'
import { initialsOf } from '../lib/storage'
import { inkFor } from '../lib/palette'

const TXT = { fontSize: 14 }

export default function RestoreBackupModal({
  open,
  onClose,
  backupData,
  onConfirmRestore,
}) {
  const [restoring, setRestoring] = useState(false)

  if (!open || !backupData) return null

  const { summary } = backupData
  const previewAvatar = summary.avatarEmoji || initialsOf(summary.name)
  const effectiveAvatarBg =
    summary.avatarColor === '#111827'
      ? 'var(--text)'
      : summary.avatarColor || 'var(--color-amber)'
  const avatarTextColor =
    effectiveAvatarBg === 'var(--text)' ? 'var(--bg)' : inkFor(effectiveAvatarBg)

  const formattedDate = summary.exportedAt
    ? new Date(summary.exportedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown Date'

  async function handleConfirm() {
    setRestoring(true)
    try {
      await onConfirmRestore(backupData.raw)
    } catch {
      setRestoring(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={restoring ? () => {} : onClose}
      title="RESTORE BACKUP PREVIEW"
      sub="CONFIRM STUDENT DATA RESTORATION FOR THIS DEVICE"
      subStyle={TXT}
      showCloseButton={!restoring}
      closeOnBackdrop={!restoring}
      closeOnEscape={!restoring}
      footer={
        <>
          <button
            type="button"
            className="btn cursor-pointer font-bold uppercase tracking-wider"
            style={TXT}
            onClick={onClose}
            disabled={restoring}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={restoring}
            className="btn btn-go cursor-pointer font-black uppercase tracking-wider shadow-hard-sm flex items-center gap-1.5"
            style={{ ...TXT, background: 'var(--color-violet)', color: 'var(--on-accent)' }}
          >
            {restoring ? (
              <>
                <RefreshCw className="icon-micro animate-spin" strokeWidth={2.5} />
                <span>RESTORING...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="icon-micro" strokeWidth={2.5} />
                <span>CONFIRM & RESTORE</span>
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* WARNING ALERT */}
        <div className="p-3 rounded border-2 border-[var(--color-amber)] bg-[var(--color-amber)]/10 text-[var(--text)] flex items-start gap-2.5">
          <AlertTriangle className="icon-sm text-[var(--color-amber)] shrink-0 mt-0.5" strokeWidth={2.5} />
          <div className="text-xs leading-relaxed">
            <span className="font-bold block text-[var(--color-amber)]">RESTORING WILL REPLACE LOCAL DATA</span>
            This action will overwrite your current device's local profile, subjects, attendance, CGPA, and to-dos with the backup file data.
          </div>
        </div>

        {/* STUDENT PROFILE IDENTITY PREVIEW */}
        <div className="p-3.5 rounded border-2 border-[var(--border-strong)] bg-[var(--surface-2)] flex items-center gap-3.5 shadow-hard-sm">
          <div
            className={`flex items-center justify-center size-14 shrink-0 ${
              summary.avatarEmoji ? 'text-2xl' : 'text-xl'
            } font-black border-2 border-[var(--border-strong)] shadow-hard-sm overflow-hidden`}
            style={{
              background: effectiveAvatarBg,
              color: avatarTextColor,
              borderRadius: 'var(--radius-board)',
            }}
          >
            {previewAvatar}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="t-card-title truncate">
                {summary.name || 'STUDENT'}
              </h4>
              {summary.rollNo && (
                <span className="chip !py-0.5 !px-2 border text-[0.625rem] font-mono font-bold">
                  <Hash className="icon-micro inline mr-0.5" />
                  {summary.rollNo}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[0.6875rem]">
              <span className="chip !py-0.5 !px-2 font-bold border" style={{ borderColor: 'var(--color-sky)' }}>
                {branchName(summary.branch)} · YEAR {summary.year}{summary.group ? ` (${summary.group})` : ''}
              </span>
              <span className="chip !py-0.5 !px-2 font-bold border" style={{ borderColor: 'var(--color-coral)' }}>
                <Home className="icon-micro inline mr-1 text-[var(--color-coral)]" />
                {hostelName(summary.hostel)}
              </span>
            </div>
          </div>
        </div>

        {/* DATA METRICS BREAKDOWN */}
        <div className="space-y-2">
          <span className="t-meta muted block">BACKUP INCLUDES</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded border border-[var(--border)] bg-[var(--surface)] text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-sky)] mb-0.5">
                <BookOpen className="icon-micro" />
                <span className="t-micro font-bold">SUBJECTS</span>
              </div>
              <span className="t-section text-base font-black">{summary.subjectsCount}</span>
            </div>

            <div className="p-2.5 rounded border border-[var(--border)] bg-[var(--surface)] text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-teal)] mb-0.5">
                <Calendar className="icon-micro" />
                <span className="t-micro font-bold">ATTENDANCE</span>
              </div>
              <span className="t-section text-base font-black">{summary.attendanceDays} <span className="text-[0.6875rem] font-normal muted">days</span></span>
            </div>

            <div className="p-2.5 rounded border border-[var(--border)] bg-[var(--surface)] text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-amber)] mb-0.5">
                <GraduationCap className="icon-micro" />
                <span className="t-micro font-bold">CGPA / GRADES</span>
              </div>
              <span className="t-section text-base font-black">{summary.cgpaSemestersCount || summary.gradesCount} <span className="text-[0.6875rem] font-normal muted">sems</span></span>
            </div>

            <div className="p-2.5 rounded border border-[var(--border)] bg-[var(--surface)] text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-present)] mb-0.5">
                <CheckCircle2 className="icon-micro" />
                <span className="t-micro font-bold">TO-DOS</span>
              </div>
              <span className="t-section text-base font-black">{summary.todosCount}</span>
            </div>

            <div className="p-2.5 rounded border border-[var(--border)] bg-[var(--surface)] text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-coral)] mb-0.5">
                <Clock className="icon-micro" />
                <span className="t-micro font-bold">EVENTS</span>
              </div>
              <span className="t-section text-base font-black">{summary.eventsCount}</span>
            </div>

            <div className="p-2.5 rounded border border-[var(--border)] bg-[var(--surface)] text-center">
              <div className="flex items-center justify-center gap-1 text-[var(--color-violet)] mb-0.5">
                <Sparkles className="icon-micro" />
                <span className="t-micro font-bold">MODULES</span>
              </div>
              <span className="t-section text-base font-black">{summary.totalKeys}</span>
            </div>
          </div>

          {/* MULTI-BRANCH DATA INDICATOR */}
          {summary.configuredBranches && summary.configuredBranches.length > 1 && (
            <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-xs space-y-1">
              <span className="t-meta text-[var(--color-sky)] block font-bold">
                MULTI-BRANCH DATA PRESERVED
              </span>
              <p className="text-[var(--text-muted)] text-[0.6875rem]">
                Backup includes stored attendance & timetables for:{' '}
                {summary.configuredBranches
                  .map((b) => `${b.branch} Y${b.year}${b.active ? ' (Active)' : ''}`)
                  .join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* METADATA FOOTER */}
        <div className="flex items-center justify-between text-[0.6875rem] text-[var(--text-muted)] border-t border-[var(--border)] pt-2.5">
          <span>Exported: {formattedDate}</span>
          <span className="chip !py-0.5 !px-2 text-[0.625rem]">Format v{summary.version}</span>
        </div>
      </div>
    </Modal>
  )
}
