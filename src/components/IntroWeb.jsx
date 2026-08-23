// Spider web, drawn once and printed three times.
//
// The whole effect depends on the three plates being *identical* artwork —
// misregistration only reads as misregistration when the eye can tell the
// plates are the same drawing pulled slightly apart. So the geometry lives in
// two <g> symbols and each plate is a <use> of them. Colour, offset and motion
// are entirely CSS (.intro-plate-*, src/index.css); nothing here animates.
//
// Authored for a full-bleed crop: the web renders larger than the viewport and
// runs off every edge, so the coordinate space is deliberately bigger than
// anything that will be on screen, and the rings are packed into the band that
// is actually visible. The hub is left empty — that void is where the wordmark
// sits, dead centre of the screen.

const CX = 200
const CY = 200

// Only a small hub is left open. The wordmark does not need a clear void —
// it is an opaque paper card pasted on top (§5), so the web can stay dense
// right into the middle, which is what keeps it from looking sparse on a
// narrow phone where only the inner quarter of the radius is ever on screen.
const SPOKE_START = 12
const SPOKE_END = 210 // past the outer ring, so the silhouette is not a polygon
const ANCHOR_END = 320 // anchor threads run on past the corners of the screen

const round = (n) => Math.round(n * 100) / 100

// Deliberately uneven spokes. design.md §6 keeps imperfection in the
// decorative layer — a regular 14-spoke web reads as a logo, and this is meant
// to read as something drawn by hand. Deterministic, not random: the artwork
// has to be identical on every load.
const SPOKES = Array.from({ length: 14 }, (_, i) =>
  round(-90 + i * (360 / 14) + Math.sin(i * 1.9) * 4.5),
)

// Twelve rings packed into the band that is actually on screen. The web is
// sized in vmax, so the crop differs per aspect ratio: a 16:10 desktop sees
// out to roughly r=71 vertically, a portrait phone to roughly r=53
// horizontally. Everything past ~110 exists only for the corners.
const RINGS = Array.from({ length: 12 }, (_, i) => 18 + i * 8)

function point(deg, r) {
  const a = (deg * Math.PI) / 180
  return [round(CX + r * Math.cos(a)), round(CY + r * Math.sin(a))]
}

// A touch of wobble so no two ring segments sit at exactly the same radius.
function wobble(r, spokeIndex, ringIndex) {
  return r * (1 + 0.028 * Math.sin(spokeIndex * 2.3 + ringIndex * 1.7))
}

const RADIALS = SPOKES.map((deg) => {
  const [x1, y1] = point(deg, SPOKE_START)
  const [x2, y2] = point(deg, SPOKE_END)
  return `M${x1},${y1} L${x2},${y2}`
})

// Each ring segment sags toward the centre, the way real silk hangs between
// two anchor points. Without the sag the silhouette reads as a polygon.
const CHORDS = RINGS.flatMap((r, ringIndex) =>
  SPOKES.map((deg, i) => {
    const next = i === SPOKES.length - 1 ? SPOKES[0] + 360 : SPOKES[i + 1]
    const [x1, y1] = point(deg, wobble(r, i, ringIndex))
    const [x2, y2] = point(next, wobble(r, i + 1, ringIndex))
    const [cx, cy] = point((deg + next) / 2, wobble(r, i + 0.5, ringIndex) * 0.86)
    return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`
  }),
)

// Every other spoke keeps going, out past the corners of the screen. These are
// what make the viewport itself feel webbed rather than having a web sit inside
// it. Separate symbol so CSS can draw them last: a document stylesheet cannot
// reach into a <use> shadow tree to single out individual paths, so anything
// that needs its own timing needs its own <use>.
const ANCHORS = SPOKES.filter((_, i) => i % 2 === 1).map((deg) => {
  const [x1, y1] = point(deg, SPOKE_END - 8)
  const [x2, y2] = point(deg, ANCHOR_END)
  return `M${x1},${y1} L${x2},${y2}`
})

// Stroke weights are in user units, so they scale with the rendered size.
// Tuned for the desktop crop, where the web renders at roughly 6x these.
// Note the absence of vector-effect="non-scaling-stroke": it moves dash maths
// into screen space, which breaks the pathLength normalisation below.
const W_SPOKE = 0.45
const W_RING = 0.3
const W_ANCHOR = 0.4

const PLATES = ['mag', 'cyan', 'key']

export default function IntroWeb() {
  return (
    <svg className="intro-web" viewBox="0 0 400 400" aria-hidden focusable="false">
      <defs>
        {/* pathLength normalises every path to 100 units, so a single
            stroke-dasharray draws them all in at the same rate regardless of
            their real length. dasharray/dashoffset are inherited properties,
            which is how they reach the <use> shadow content at all. */}
        <g id="intro-web-art" fill="none" stroke="currentColor" strokeLinecap="round">
          {RADIALS.map((d) => (
            <path key={d} d={d} pathLength="100" strokeWidth={W_SPOKE} />
          ))}
          {CHORDS.map((d) => (
            <path key={d} d={d} pathLength="100" strokeWidth={W_RING} />
          ))}
        </g>
        <g id="intro-web-anchors" fill="none" stroke="currentColor" strokeLinecap="round">
          {ANCHORS.map((d) => (
            <path key={d} d={d} pathLength="100" strokeWidth={W_ANCHOR} />
          ))}
        </g>
      </defs>

      {/* Order matters: the off-plates print first, the key plate on top. */}
      {PLATES.map((plate) => (
        <g key={plate} className={`intro-plate intro-plate-${plate}`}>
          <use href="#intro-web-art" className="intro-draw" />
          <use href="#intro-web-anchors" className="intro-draw intro-draw-late" />
        </g>
      ))}
    </svg>
  )
}
