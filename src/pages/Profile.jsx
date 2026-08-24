import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Check,
  ChevronRight,
  Database,
  Download,
  Hash,
  Home,
  Upload,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react'
import Shell from '../components/Shell'
import { PageHeader } from '../ui'
import {
  initialsOf,
  exportSnapshot,
  importSnapshot,
  useCustomStatus,
  useEvents,
  useProfile,
  useTodos,
} from '../lib/storage'
import { branchName, hostelName } from '../data/campus'
import { todayISO } from '../lib/time'
import { ACCENTS, inkFor } from '../lib/palette'

const EMOJI_PRESETS = ['⚡', '🚀', '🎸', '🕷️', '💀', '🔥']

const COLOR_PRESETS = [
  ...ACCENTS.map((a) => ({ label: a.label, value: a.value, text: a.ink })),
  { label: 'Black / White', value: 'var(--text)', text: 'var(--bg)' },
]

export default function Profile() {
  const { profile, year, group, update } = useProfile()
  const { todos } = useTodos()
  const { events } = useEvents()
  const [customStatus] = useCustomStatus()

  const storageKB = useMemo(() => {
    try {
      let total = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          total += (localStorage.getItem(key) || '').length + key.length
        }
      }
      return Math.max(1, Math.round((total / 1024) * 10) / 10)
    } catch {
      return 12
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, events])

  const [name, setName] = useState(profile.name || '')
  const [rollNo, setRollNo] = useState(profile.rollNo || '')
  const [avatarEmoji, setAvatarEmoji] = useState(profile.avatarEmoji || '')
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || 'var(--color-amber)')
  const [customEmojiInput, setCustomEmojiInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [backupStatus, setBackupStatus] = useState(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    setName(profile.name || '')
    setRollNo(profile.rollNo || '')
    setAvatarEmoji(profile.avatarEmoji || '')
    setAvatarColor(profile.avatarColor || 'var(--color-amber)')
  }, [profile.name, profile.rollNo, profile.avatarEmoji, profile.avatarColor])

  function saveProfile(e) {
    if (e) e.preventDefault()
    const cleanName = name.trim().toUpperCase()
    update({
      name: cleanName,
      rollNo: rollNo.trim().toUpperCase(),
      avatarEmoji,
      avatarColor,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleEmojiPick(emoji) {
    if (avatarEmoji === emoji) {
      handleClearEmoji()
    } else {
      setAvatarEmoji(emoji)
      setCustomEmojiInput('')
      update({ avatarEmoji: emoji })
    }
  }

  function handleColorPick(color) {
    setAvatarColor(color)
    update({ avatarColor: color })
  }

  function handleClearEmoji() {
    setAvatarEmoji('')
    setCustomEmojiInput('')
    update({ avatarEmoji: '' })
  }

  function exportJsonBackup() {
    const data = exportSnapshot()
    const activeName = (name.trim() || profile.name || 'STUDENT').toUpperCase().replace(/\s+/g, '_')
    const dateStr = todayISO()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `NITKKR_DESK_${activeName}_BACKUP_${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)

    const n = data.summary?.modules ?? Object.keys(data.data || {}).length
    setBackupStatus({ ok: true, text: `Backup downloaded — ${n} data module${n === 1 ? '' : 's'} saved.` })
    setTimeout(() => setBackupStatus(null), 4000)
  }

  async function importJsonBackup(file) {
    try {
      const text = await file.text()
      let parsed = null
      try {
        parsed = JSON.parse(text)
      } catch {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch && jsonMatch[1]) {
          parsed = JSON.parse(jsonMatch[1])
        } else {
          throw new Error('Invalid JSON file format.')
        }
      }
      const count = importSnapshot(parsed)
      setBackupStatus({ ok: true, text: `Successfully restored ${count} data modules!` })
      setTimeout(() => setBackupStatus(null), 5000)
    } catch (err) {
      setBackupStatus({ ok: false, text: err.message || 'Could not import that backup file.' })
      setTimeout(() => setBackupStatus(null), 5000)
    }
  }

  function handleResetData() {
    if (
      window.confirm(
        '⚠️ Are you sure you want to reset all your local student data? This will clear your to-dos, timetable overrides, and roll call marks. This cannot be undone.'
      )
    ) {
      localStorage.clear()
      window.location.reload()
    }
  }

  const previewAvatar = avatarEmoji || initialsOf(name || profile.name)

  return (
    <Shell>
      <div className="space-y-4">
        <PageHeader
          icon={User}
          accent="var(--color-amber)"
          iconInk="var(--on-accent)"
          title="STUDENT PROFILE"
        />

        {/* HERO CARD: LARGE OFFICIAL STUDENT ID PASS */}
        <section className="board board-hard relative pad-page bg-[var(--surface)] border-l-6 border-l-[var(--color-amber)] transition-all hover:shadow-hard-lg space-y-4">
          {/* TOP CARD HEADER RIBBON */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--border)] pb-4">
            <div>
              <span className="t-meta text-[var(--color-amber)] block">
                NATIONAL INSTITUTE OF TECHNOLOGY KURUKSHETRA
              </span>
              <h2 className="t-section mt-0.5">
                UNOFFICIAL STUDENT ID
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="chip !px-2.5 !py-1 text-[0.625rem] border-2 border-[var(--border-strong)] font-bold"
                style={{ background: 'var(--color-present)', color: 'var(--on-accent)' }}
              >
                ● VERIFIED LOCAL PASS
              </span>
            </div>
          </div>

          {/* MAIN ID PASS DISPLAY */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-4">
            {/* AVATAR BOX DIRECT (CLEAN STAMP) */}
            <div className="shrink-0">
              {(() => {
                const effectiveAvatarBg = avatarColor === '#111827' ? 'var(--text)' : (avatarColor || 'var(--color-sky)')
                const avatarTextColor = effectiveAvatarBg === 'var(--text)' ? 'var(--bg)' : inkFor(effectiveAvatarBg)

                return (
                  <div
                    className={`flex items-center justify-center size-22 sm:size-24 ${avatarEmoji ? 'avatar-emoji-box' : 'text-3xl sm:text-4xl'} font-black border-3 border-[var(--border-strong)] shadow-hard transition-transform hover:scale-105 overflow-hidden`}
                    style={{
                      background: effectiveAvatarBg,
                      color: avatarTextColor,
                      borderRadius: 'var(--radius-board)',
                    }}
                  >
                    <span
                      className={
                        avatarEmoji
                          ? 'avatar-emoji'
                          : 'inline-flex items-center justify-center leading-none select-none'
                      }
                    >
                      {previewAvatar}
                    </span>
                  </div>
                )
              })()}
            </div>

            {/* STUDENT DETAILS */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <span className="t-meta text-[var(--color-amber)] block">
                  STUDENT NAME
                </span>
                <h3 className="t-section">
                  {name.trim() || profile.name ? (
                    name.trim() || profile.name
                  ) : (
                    <span className="muted opacity-60">NO NAME SET</span>
                  )}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {rollNo ? (
                  <div className="chip !py-1 !px-2.5 border-2 border-[var(--border)] text-[0.6875rem] font-bold">
                    <Hash className="icon-micro inline mr-1 text-[var(--color-amber)]" />
                    ROLL: <span className="text-[var(--text)] ml-1 font-bold">{rollNo}</span>
                  </div>
                ) : null}

                {(() => {
                  const effectiveAvatarBg = avatarColor === '#111827' ? 'var(--text)' : (avatarColor || 'var(--color-sky)')
                  return (
                    <>
                      <div
                        className="chip !py-1 !px-2.5 border-2 text-[0.6875rem] font-bold"
                        style={{
                          borderColor: effectiveAvatarBg,
                          color: effectiveAvatarBg,
                          backgroundColor: 'transparent',
                        }}
                      >
                        <span>
                          {branchName(profile.branch)} · YEAR {year}{group ? ` (${group})` : ''}
                        </span>
                      </div>

                      <div
                        className="chip !py-1 !px-2.5 border-2 text-[0.6875rem] font-bold"
                        style={{
                          borderColor: effectiveAvatarBg,
                          color: effectiveAvatarBg,
                          backgroundColor: 'transparent',
                        }}
                      >
                        <span>
                          {hostelName(profile.hostel)}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>

              {customStatus ? (
                <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--border)] text-xs">
                  <span className="t-meta text-[var(--color-amber)] block mb-0.5">
                    CUSTOM STATUS MESSAGE
                  </span>
                  <p className="italic text-[var(--text)]">"{customStatus}"</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* EDIT FORM & AVATAR CUSTOMIZER DRAWER */}
          <div className="border-t-2 border-[var(--border)] pt-5 space-y-4">
            <div>
              <h4 className="t-card-title text-[var(--color-amber)]">
                CUSTOMIZE YOUR PASS & IDENTITY
              </h4>
            </div>

            {/* ROW 1: NAME & ROLL NUMBER (AUTO-CAPITALIZED) */}
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="t-meta muted block mb-1.5">
                  DISPLAY NAME
                </label>
                <input
                  type="text"
                  className="field text-sm uppercase tracking-wider !py-2 !px-3 font-bold"
                  value={name}
                  maxLength={30}
                  placeholder="E.G. AKSHATH"
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="t-meta muted block mb-1.5">
                  ROLL NO. (OPTIONAL)
                </label>
                <input
                  type="text"
                  className="field text-sm uppercase tracking-wider !py-2 !px-3 font-bold"
                  value={rollNo}
                  maxLength={20}
                  placeholder="E.G. 125102069"
                  onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                />
              </div>
            </form>

            {/* ROW 2: AVATAR COLOR PALETTE */}
            <div>
              <label className="t-meta muted block mb-2">
                BADGE ACCENT COLOR
              </label>
              <div className="w-fit inline-flex flex-wrap items-center gap-2 p-1.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                {COLOR_PRESETS.map((c) => {
                  const active =
                    avatarColor === c.value ||
                    (c.value === 'var(--text)' && (avatarColor === '#111827' || avatarColor === 'var(--text)'))
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => handleColorPick(c.value)}
                      className={`grid size-8.5 place-items-center rounded border-2 cursor-pointer transition-all hover:scale-110 ${
                        active ? 'border-white ring-2 ring-black dark:ring-white scale-105' : 'border-black/30'
                      }`}
                      style={{ background: c.value }}
                      title={c.label}
                      aria-label={c.label}
                    >
                      {active ? (
                        <Check className="icon-micro" strokeWidth={2.5} style={{ color: c.text }} />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ROW 3: EMOJI STICKER SELECTOR */}
            <div>
              <label className="t-meta muted block mb-2">
                CHOOSE AVATAR EMOJI
              </label>

              <div className="w-fit inline-flex flex-wrap items-center gap-2 p-1.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                {/* INITIALS TILE */}
                <button
                  type="button"
                  onClick={handleClearEmoji}
                  className={`h-8.5 px-3.5 text-xs rounded border-2 cursor-pointer transition-all flex items-center justify-center font-bold ${
                    !avatarEmoji
                      ? 'border-[var(--color-present)] bg-[var(--surface)] ring-2 ring-[var(--color-present)] text-[var(--color-present)] scale-105'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)]'
                  }`}
                  title="Use Name Initials instead of an emoji"
                >
                  <span className="text-xs font-bold uppercase tracking-wider">INITIALS</span>
                </button>

                {EMOJI_PRESETS.map((emo) => {
                  const active = avatarEmoji === emo
                  return (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => handleEmojiPick(emo)}
                      className={`size-8.5 text-base grid place-items-center rounded border cursor-pointer transition-all hover:scale-120 ${
                        active
                          ? 'border-[var(--color-sky)] bg-[var(--surface)] ring-2 ring-[var(--color-sky)] scale-110'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'
                      }`}
                      aria-label={`Select emoji ${emo}`}
                      title={active ? `Click to remove emoji ${emo}` : `Set emoji ${emo}`}
                    >
                      {emo}
                    </button>
                  )
                })}
              </div>

              {/* CUSTOM EMOJI WRITE-IN */}
              <div className="mt-2.5 flex items-center gap-2 max-w-xs">
                <input
                  type="text"
                  className="field text-sm !py-1.5 !px-3 font-medium"
                  placeholder="Paste custom emoji..."
                  value={customEmojiInput}
                  maxLength={4}
                  onChange={(e) => {
                    const val = e.target.value
                    setCustomEmojiInput(val)
                    if (val.trim()) {
                      handleEmojiPick(val.trim())
                    } else {
                      handleClearEmoji()
                    }
                  }}
                />
              </div>
            </div>

            {/* SAVE ACTION BUTTON */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={saveProfile}
                className="btn btn-go text-xs px-6 py-2.5 cursor-pointer shadow-hard"
              >
                SAVE PASS CHANGES
              </button>
              {saved && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-present)] font-bold">
                  <Check className="icon-sm" strokeWidth={2.5} /> PASS UPDATED & SAVED IN LOCAL BROWSER!
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ACADEMIC & CAMPUS SETUP CARDS */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* BRANCH CARD */}
          <div className="board board-hard pad-page bg-[var(--surface)] border-l-4 border-l-[var(--color-sky)] flex flex-col justify-between transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="t-meta text-[var(--color-sky)]">
                  ACADEMIC BRANCH
                </span>
                <BookOpen className="icon-sm text-[var(--color-sky)]" />
              </div>
              <h3 className="t-card-title mt-3">
                {branchName(profile.branch)}
              </h3>
              <p className="t-meta muted mt-1">
                ACADEMIC YEAR {year}{group ? ` · SUBSECTION ${group}` : ''}
              </p>
            </div>

            <button
              type="button"
              className="btn mt-5 w-full justify-between text-xs font-bold cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
              onClick={() => navigate('/select/branch', { state: { from: '/profile' } })}
            >
              <span>CHANGE BRANCH / YEAR</span>
              <ChevronRight className="icon-sm" />
            </button>
          </div>

          {/* HOSTEL CARD */}
          <div className="board board-hard pad-page bg-[var(--surface)] border-l-4 border-l-[var(--color-coral)] flex flex-col justify-between transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="t-meta text-[var(--color-coral)]">
                  HOSTEL RESIDENCE
                </span>
                <Home className="icon-sm text-[var(--color-coral)]" />
              </div>
              <h3 className="t-card-title mt-3">
                {hostelName(profile.hostel)}
              </h3>
              <p className="t-meta muted mt-1">CAMPUS MESS & ROOM ALLOCATION</p>
            </div>

            <button
              type="button"
              className="btn mt-5 w-full justify-between text-xs font-bold cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
              onClick={() => navigate('/select/hostel', { state: { from: '/profile' } })}
            >
              <span>CHANGE HOSTEL</span>
              <ChevronRight className="icon-sm" />
            </button>
          </div>
        </div>

        {/* LOCAL STORAGE & BACKUP CONTROL CENTER */}
        <section className="board board-hard pad-page bg-[var(--surface)] border-l-4 border-l-[var(--color-violet)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <Database className="icon-md shrink-0 text-[var(--color-violet)]" />
              <h3 className="t-card-title text-[var(--color-violet)]">
                LOCAL DATA & STORAGE
              </h3>
            </div>
            <span className="t-meta text-[var(--color-present)] flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="icon-micro shrink-0" /> 100% PRIVATE · ON THIS DEVICE
            </span>
          </div>

          {/* DATA STATS GRID (3 STATS) */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface-2)]">
              <span className="t-stat block">{todos.length}</span>
              <span className="t-meta muted block mt-0.5">TO-DOS ACTIVE</span>
            </div>
            <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface-2)]">
              <span className="t-stat block">{events.length}</span>
              <span className="t-meta muted block mt-0.5">EVENTS SAVED</span>
            </div>
            <div className="p-3 rounded border border-[var(--border)] bg-[var(--surface-2)]">
              <span className="t-stat block">~{storageKB} KB</span>
              <span className="t-meta muted block mt-0.5">STORAGE USED</span>
            </div>
          </div>

          {/* BACKUP & RESET ACTIONS */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn text-xs font-bold !py-2.5 !px-4 cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-hard-sm flex items-center gap-1.5"
                style={{ background: 'var(--color-violet)', color: 'var(--on-accent)' }}
                onClick={exportJsonBackup}
              >
                <Download className="icon-sm" strokeWidth={2.5} /> EXPORT BACKUP
              </button>

              <button
                type="button"
                className="btn text-xs font-bold !py-2.5 !px-4 cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-hard-sm flex items-center gap-1.5"
                style={{ background: 'var(--color-sky)', color: 'var(--on-accent)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="icon-sm" strokeWidth={2.5} /> RESTORE BACKUP
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json,.md"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importJsonBackup(f)
                  e.target.value = ''
                }}
              />

              {backupStatus && (
                <span
                  className={`t-meta flex items-center gap-1.5 py-1.5 px-2.5 rounded border ${
                    backupStatus.ok
                      ? 'text-[var(--color-present)] border-[var(--color-present)] bg-[var(--color-present)]/10'
                      : 'text-[var(--color-absent)] border-[var(--color-absent)] bg-[var(--color-absent)]/10'
                  }`}
                >
                  <Check className="icon-micro" strokeWidth={3} /> {backupStatus.text}
                </span>
              )}
            </div>

            <button
              type="button"
              className="btn text-xs font-bold !py-2.5 !px-3.5 border-2 border-[var(--border)] hover:border-[var(--color-coral)] hover:text-[var(--color-coral)] cursor-pointer shadow-hard-sm flex items-center gap-1.5"
              style={{ background: 'var(--surface)', color: 'var(--text)' }}
              onClick={handleResetData}
            >
              <RefreshCw className="icon-micro" strokeWidth={2.5} /> RESET ALL DATA
            </button>
          </div>
        </section>

        <footer className="pt-2 text-center">
          <p className="t-meta muted">
            EVERYTHING LIVES IN YOUR BROWSER · NO CLOUD ACCOUNTS · UNOFFICIAL TOOL FOR NIT KURUKSHETRA
          </p>
        </footer>
      </div>
    </Shell>
  )
}
