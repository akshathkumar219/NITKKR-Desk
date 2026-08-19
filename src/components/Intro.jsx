import { useCallback, useEffect, useRef, useState } from 'react'
import { KEYS, read, write } from '../lib/storage'

// How many times a returning visitor sees the entry animation before it
// retires itself. design.md §10 wants a memorable entrance; §1 says the site
// is a utility people open several times a day. Both are true — so the
// entrance is real, and then it gets out of the way for good.
const MAX_PLAYS = 5

/** True when the OS asks for reduced motion (§12). */
function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/**
 * Decides once, on mount, whether this load gets the intro — and records the
 * play immediately rather than on completion, so a visitor who reloads
 * mid-animation still burns a play and can never get stuck seeing it forever.
 */
function useShouldPlay() {
  const [play, setPlay] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const plays = Number(read(KEYS.introPlays, 0)) || 0
    if (plays >= MAX_PLAYS) return
    write(KEYS.introPlays, plays + 1)
    setPlay(true)
  }, [])

  return play
}

/**
 * Entry animation.
 *
 * Critically, this is an OVERLAY, not a gate. design.md §1.3: "Important
 * information must never require an animation to finish before it can be
 * read." The dashboard underneath is already rendered and interactive; this
 * sits on top, ignores pointer events on its decorative parts, and leaves.
 */
export default function Intro() {
  const play = useShouldPlay()
  const [gone, setGone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timers = useRef([])

  const dismiss = useCallback(() => {
    setLeaving(true)
    timers.current.push(setTimeout(() => setGone(true), 260))
  }, [])

  useEffect(() => {
    if (!play) return
    // Auto-dismiss. Total on-screen time ~1.2s.
    timers.current.push(setTimeout(dismiss, 1200))

    // §11: never block content. Any intent to interact ends it at once.
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
      // Decorative and transient. Announcing it would interrupt a screen
      // reader that is already being read the real page underneath.
      aria-hidden
    >
      <div className="world world-halftone intro-halftone" />
      <p className="display animate-settle intro-word">NITKKR</p>
      <p className="display animate-settle intro-word intro-word-2">BOARD</p>
      <span className="label intro-skip">TAP TO SKIP</span>
    </div>
  )
}
