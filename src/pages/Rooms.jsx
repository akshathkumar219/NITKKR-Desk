import { useEffect, useMemo, useState } from 'react'
import { DoorOpen } from 'lucide-react'
import Shell from '../components/Shell'
import { Chip, LiveBadge, PageHeader, Panel } from '../ui'
import { TIMETABLES, allRooms } from '../data/timetables'
import { dayCode, fmtRange, minutesNow } from '../lib/time'

/**
 * A room is OCCUPIED if any branch/year timetable schedules a session in it
 * right now. Everything else in the known room list is FREE.
 *
 * This reads the published timetables only — personal edits are private to
 * each device, so they cannot tell you about other people's rooms.
 */
function useRoomStatus() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  return useMemo(() => {
    const day = dayCode()
    const mins = minutesNow()
    const occupied = new Map()

    for (const [branch, byYear] of Object.entries(TIMETABLES)) {
      for (const [year, sessions] of Object.entries(byYear)) {
        for (const s of sessions) {
          if (s.day !== day || s.type === 'break' || !s.room) continue
          if (!(s.start <= mins && mins < s.end)) continue
          for (const room of s.room.split('+').map((r) => r.trim())) {
            if (!occupied.has(room)) {
              occupied.set(room, { room, session: s, branch, year })
            }
          }
        }
      }
    }

    const rooms = allRooms()
    return {
      day,
      mins,
      occupied: [...occupied.values()].sort((a, b) => a.room.localeCompare(b.room)),
      free: rooms.filter((r) => !occupied.has(r)),
      total: rooms.length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])
}

export default function Rooms() {
  const { occupied, free, total, day } = useRoomStatus()
  const clock = new Date()
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    .toUpperCase()

  return (
    <Shell>
      <PageHeader
        icon={DoorOpen}
        accent="var(--color-teal)"
        eyebrow="OPEN ROOMS"
        title="FREE NOW"
        sub={`${day} · ${clock} · ${total} TRACKED ROOMS`}
        actions={<LiveBadge>LIVE · EVERY MINUTE</LiveBadge>}
      />

      {total === 0 ? (
        <Panel className="p-8 text-center">
          <p className="heading text-xl">NO ROOMS TRACKED YET</p>
          <p className="label muted mx-auto mt-3 max-w-md">
            OPEN ROOMS READS ROOM NAMES OFF THE PUBLISHED TIMETABLES. ADD REAL
            TIMETABLE DATA IN CONTENT/TIMETABLES/ AND THIS FILLS IN AUTOMATICALLY.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)] px-4 py-3">
              <p className="heading text-lg">OCCUPIED</p>
              <Chip tone="var(--color-coral)">{occupied.length} ROOMS</Chip>
            </div>
            <div className="p-4">
              {occupied.length === 0 ? (
                <p className="label muted py-10 text-center">
                  NO CLASSES RIGHT NOW — EVERY TRACKED ROOM IS FREE
                </p>
              ) : (
                <ul className="space-y-2">
                  {occupied.map((o) => (
                    <li
                      key={o.room}
                      className="board flex flex-wrap items-center justify-between gap-2 p-3"
                    >
                      <div className="min-w-0">
                        <p className="heading text-base">{o.room}</p>
                        <p className="label muted mt-0.5 truncate">
                          {o.session.name} · {o.branch} Y{o.year}
                        </p>
                      </div>
                      <Chip>{fmtRange(o.session.start, o.session.end)}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)] px-4 py-3">
              <p className="heading text-lg">FREE NOW</p>
              <Chip tone="var(--color-acid)">{free.length} ROOMS</Chip>
            </div>
            <div className="p-4">
              {free.length === 0 ? (
                <p className="label muted py-10 text-center">
                  EVERY TRACKED ROOM IS IN USE
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {free.map((r) => (
                    <span key={r} className="chip" style={{ fontSize: '0.7rem', padding: '0.35rem 0.6rem' }}>
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      <p className="label muted">
        BASED ON PUBLISHED TIMETABLES ONLY. A ROOM CAN STILL BE BOOKED FOR
        SOMETHING THAT ISN'T ON A CLASS TIMETABLE — CHECK BEFORE YOU SETTLE IN.
      </p>
    </Shell>
  )
}
