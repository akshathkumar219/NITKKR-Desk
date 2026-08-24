/**
 * Emoji avatar metrics.
 *
 * Colour-emoji fonts do not centre themselves. Apple Color Emoji draws its ink
 * from 0.89em above the baseline to 0.14em below it, while reporting an ascent
 * of 0.70em and a descent of 0.22em — so with `line-height: 1` the glyph's
 * optical centre lands ~0.135em ABOVE the centre of its own box, and its ink is
 * 1.03x the font-size rather than 1x. Noto (Android) and Segoe (Windows) have
 * different numbers again, so any hardcoded nudge is wrong on two platforms out
 * of three.
 *
 * So measure the font actually in use, once at startup, and publish the result
 * as custom properties that `.avatar-emoji` consumes:
 *
 *   --emoji-nudge  translateY multiplier, in em, that centres the ink
 *   --emoji-scale  font-size multiplier, in cqmin, that makes the ink cover
 *                  EMOJI_INK_RATIO of the avatar box
 *
 * index.css carries Apple-tuned fallbacks so the first paint is already right
 * on the platform most of these users are on.
 */

// Fraction of the avatar box the emoji's ink should cover. Tuned against the
// ID-card avatar on /profile.
const EMOJI_INK_RATIO = 0.76

// Sampled rather than trusting one glyph: ink boxes are identical across
// Apple's set but that is not guaranteed elsewhere.
const SAMPLES = ['\u{1F480}', '\u{1F525}', '\u{1F680}', '\u{1F393}', '\u{26A1}']

const REF = 100 // measure at 100px, divide back down to em

export function applyEmojiMetrics() {
  try {
    // Read the family off a real .avatar-emoji so canvas resolves the same
    // fallback chain the DOM will paint with.
    const probe = document.createElement('span')
    probe.className = 'avatar-emoji'
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
    document.body.appendChild(probe)
    const family = getComputedStyle(probe).fontFamily
    probe.remove()

    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return
    ctx.font = `${REF}px ${family}`

    let inkAsc = 0
    let inkDesc = 0
    let fontAsc = 0
    let fontDesc = 0
    let n = 0
    for (const glyph of SAMPLES) {
      const m = ctx.measureText(glyph)
      // Older Safari omits actualBoundingBox*; skip rather than poison the mean.
      if (!(m.actualBoundingBoxAscent >= 0) || !(m.fontBoundingBoxAscent >= 0)) continue
      inkAsc += m.actualBoundingBoxAscent
      inkDesc += m.actualBoundingBoxDescent
      fontAsc += m.fontBoundingBoxAscent
      fontDesc += m.fontBoundingBoxDescent
      n += 1
    }
    if (!n) return
    inkAsc /= n * REF
    inkDesc /= n * REF
    fontAsc /= n * REF
    fontDesc /= n * REF

    const inkHeight = inkAsc + inkDesc
    // Implausible reading (blocked canvas, missing font) — keep the CSS fallback.
    if (!(inkHeight > 0.2) || !(inkHeight < 2)) return

    // With line-height: 1 the span's box is exactly 1em tall and the font's
    // content area is centred inside it, which puts the baseline here:
    const baselineFromTop = (1 - (fontAsc + fontDesc)) / 2 + fontAsc
    const inkCentreFromTop = baselineFromTop + (inkDesc - inkAsc) / 2
    const nudge = 0.5 - inkCentreFromTop

    const root = document.documentElement
    root.style.setProperty('--emoji-nudge', nudge.toFixed(4))
    root.style.setProperty('--emoji-scale', ((EMOJI_INK_RATIO / inkHeight) * 100).toFixed(2))
  } catch {
    // Canvas blocked or unavailable — the CSS fallbacks stand.
  }
}

export function initEmojiMetrics() {
  applyEmojiMetrics()
  // Re-measure once webfonts settle: until then the emoji may resolve through
  // a different fallback than the one that finally paints.
  document.fonts?.ready?.then(applyEmojiMetrics).catch(() => {})
}
