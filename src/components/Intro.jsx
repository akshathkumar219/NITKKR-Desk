import { useCallback, useEffect, useRef, useState } from 'react'
import { SESSION_KEYS, readSession, writeSession } from '../lib/storage'
import IntroWeb from './IntroWeb'

// How many times a tab replays the entrance before it goes quiet.
const MAX_PLAYS = 5

// Fixed choreography, matched to the keyframes in src/index.css:
//   0-150     web scale-slam + corner collage shards pop in
//   0-500     web draws in
//   250-650   anchor threads draw
//   500-850   multiverse plate glitch drift + collage shards flicker on steps()
//   850-900   SNAP into register, overlay impact, halftone strobe flash
//   850-1080  the wordmark card + sticker backing stamp on with chromatic jitter
//   950-1350  "NITKKR DESK" wordmark prints in with CMYK staccato vibration
//   1350-1800 clean hold
//   1800      smooth fade-out
const HOLD_MS = 1800
const FADE_MS = 220

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

let decided = false
let decision = false

function useShouldPlay() {
  const [play, setPlay] = useState(false)

  useEffect(() => {
    if (!decided) {
      decided = true
      const plays = Number(readSession(SESSION_KEYS.introPlays, 0)) || 0
      if (!prefersReducedMotion() && plays < MAX_PLAYS) {
        writeSession(SESSION_KEYS.introPlays, plays + 1)
        decision = true
      }
    }
    if (decision) setPlay(true)
  }, [])

  return play
}

export default function Intro() {
  const play = useShouldPlay()
  const [gone, setGone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timers = useRef([])

  const dismiss = useCallback(() => {
    setLeaving(true)
    timers.current.push(setTimeout(() => setGone(true), FADE_MS))
  }, [])

  useEffect(() => {
    if (!play) return
    timers.current.push(setTimeout(dismiss, HOLD_MS))

    // Skip on any intent to interact
    const skip = () => dismiss()
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)
    window.addEventListener('wheel', skip, { passive: true })
    window.addEventListener('touchstart', skip, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('wheel', skip)
      window.removeEventListener('touchstart', skip)
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [play, dismiss])

  if (!play || gone) return null

  return (
    <div
      className="intro-overlay"
      data-leaving={leaving ? '' : undefined}
      aria-hidden
    >
      <div className="world world-halftone intro-halftone" />

      {/* Spider-Punk Multiverse Web Artwork */}
      <IntroWeb />

      {/* Corner Zine Collage Paper Shards flickering around web anchors */}
      <svg
        className="intro-shards-svg fixed inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="intro-shard-dots"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="7" cy="7" r="3.5" fill="currentColor" />
          </pattern>
          <pattern
            id="intro-shard-hatch"
            width="16"
            height="16"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="16" stroke="currentColor" strokeWidth="3" />
          </pattern>
        </defs>

        {/* Top-Left Acid Green Polka-Dot Shard */}
        <g className="intro-shard-tl">
          <path
            d="M -30 -30 L 420 -30 L 320 140 L 160 80 L -30 220 Z"
            fill="var(--color-sky)"
            stroke="#111111"
            strokeWidth="4"
          />
          <path
            d="M -30 -30 L 420 -30 L 320 140 L 160 80 L -30 220 Z"
            fill="url(#intro-shard-dots)"
            className="text-[#111111] opacity-30"
          />
        </g>

        {/* Top-Right Disruption Pink Hatch Shard */}
        <g className="intro-shard-tr">
          <path
            d="M 1950 -30 L 1540 -30 L 1640 120 L 1800 60 L 1950 190 Z"
            fill="var(--disruption)"
            stroke="#111111"
            strokeWidth="4"
          />
          <path
            d="M 1950 -30 L 1540 -30 L 1640 120 L 1800 60 L 1950 190 Z"
            fill="url(#intro-shard-hatch)"
            className="text-[#111111] opacity-25"
          />
        </g>

        {/* Bottom-Left Disruption Pink Shard */}
        <g className="intro-shard-bl">
          <path
            d="M -30 880 L 220 840 L 360 990 L -30 1110 Z"
            fill="var(--disruption)"
            stroke="#111111"
            strokeWidth="4"
          />
          <path
            d="M -30 880 L 220 840 L 360 990 L -30 1110 Z"
            fill="url(#intro-shard-hatch)"
            className="text-[#111111] opacity-25"
          />
        </g>

        {/* Bottom-Right Acid Green Polka-Dot Shard */}
        <g className="intro-shard-br">
          <path
            d="M 1950 860 L 1680 820 L 1540 980 L 1820 1020 L 1950 1110 Z"
            fill="var(--color-sky)"
            stroke="#111111"
            strokeWidth="4"
          />
          <path
            d="M 1950 860 L 1680 820 L 1540 980 L 1820 1020 L 1950 1110 Z"
            fill="url(#intro-shard-dots)"
            className="text-[#111111] opacity-30"
          />
        </g>
      </svg>

      {/* Wordmark Center Card with Backing Sticker Layer */}
      <div className="intro-words-container">
        {/* Jagged Disruption/Acid Sticker Backing Trim */}
        <div className="intro-words-sticker" aria-hidden="true" />
        <div className="intro-words">
          <p className="display intro-word">NITKKR</p>
          <p className="display intro-word intro-word-2">DESK</p>
        </div>
      </div>

      <span className="label intro-skip">TAP TO SKIP</span>
    </div>
  )
}
