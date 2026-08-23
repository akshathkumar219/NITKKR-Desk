import { useEffect, useState } from 'react'

/**
 * Spider-Punk "Zine Collage Glitch-In / Glitch-Out" Theme Transition
 *
 * Distinct ripped paper pieces (acid green halftone, disruption pink hatch,
 * dark halftone, and black jagged "X" lightning slash) rapidly pop, flicker,
 * and glitch in and out of existence across stop-motion frames (steps(1)).
 */
export default function ThemeBurst() {
  const [active, setActive] = useState(null)

  useEffect(() => {
    let timer = null

    const handleBurst = (e) => {
      if (timer) clearTimeout(timer)

      setActive({
        id: Date.now(),
        nextTheme: e.detail?.nextTheme,
      })

      timer = setTimeout(() => {
        setActive(null)
      }, 640)
    }

    window.addEventListener('nitkkr:theme-burst', handleBurst)
    return () => {
      window.removeEventListener('nitkkr:theme-burst', handleBurst)
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!active) return null

  return (
    <div
      key={active.id}
      className="fixed inset-0 pointer-events-none z-[70] overflow-hidden select-none punk-collage-container"
      aria-hidden="true"
    >
      {/* 1. Xerox Inversion Flash for initial impact */}
      <div className="absolute inset-0 punk-xerox-strobe" />

      {/* 2. Full-Screen CMYK Glitch Jitter Layer */}
      <div className="absolute inset-0 punk-cmyk-glitch-layer" />

      {/* 3. The Stop-Motion Zine Paper Pieces Glitching in & out of existence */}
      <svg
        className="fixed inset-0 w-full h-full punk-collage-svg"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Ben-Day Halftone Dot Screen */}
          <pattern
            id="punk-dot-pattern"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="8" cy="8" r="4.2" fill="currentColor" />
          </pattern>

          {/* Diagonal Hatch Lines Screen */}
          <pattern
            id="punk-hatch-pattern"
            width="18"
            height="18"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="18" stroke="currentColor" strokeWidth="3.5" />
          </pattern>
        </defs>

        {/* ========================================================
            PIECE 1: Top-Left Acid Green Polka-Dot Sheet
            ======================================================== */}
        <g className="punk-piece-acid-tl">
          {/* Cyan/Magenta Misregistration Offset */}
          <path
            d="M -50 -50 L 1020 -50 L 820 160 L 580 80 L 360 270 L 140 230 L -50 340 Z"
            fill="var(--secondary)"
            opacity="0.8"
            transform="translate(-8, 6)"
          />
          <path
            d="M -50 -50 L 1020 -50 L 820 160 L 580 80 L 360 270 L 140 230 L -50 340 Z"
            fill="var(--color-sky)"
            stroke="#111111"
            strokeWidth="5"
          />
          <path
            d="M -50 -50 L 1020 -50 L 820 160 L 580 80 L 360 270 L 140 230 L -50 340 Z"
            fill="url(#punk-dot-pattern)"
            className="text-[#111111] opacity-30"
          />
        </g>

        {/* ========================================================
            PIECE 2: Top-Right Disruption Pink Hatch Sheet
            ======================================================== */}
        <g className="punk-piece-pink-tr">
          {/* Magenta Misregistration Offset */}
          <path
            d="M 1970 -50 L 960 -50 L 1120 150 L 1380 60 L 1600 260 L 1820 210 L 1970 350 Z"
            fill="var(--disruption)"
            opacity="0.85"
            transform="translate(8, -6)"
          />
          <path
            d="M 1970 -50 L 960 -50 L 1120 150 L 1380 60 L 1600 260 L 1820 210 L 1970 350 Z"
            fill="var(--disruption)"
            stroke="#111111"
            strokeWidth="5"
          />
          <path
            d="M 1970 -50 L 960 -50 L 1120 150 L 1380 60 L 1600 260 L 1820 210 L 1970 350 Z"
            fill="url(#punk-hatch-pattern)"
            className="text-[#111111] opacity-25"
          />
        </g>

        {/* ========================================================
            PIECE 3: Mid-Left Dark Halftone Texture Sheet
            ======================================================== */}
        <g className="punk-piece-dark-ml">
          <path
            d="M -50 260 L 420 210 L 540 380 L 910 240 L 980 430 L 460 590 L 180 520 L -50 640 Z"
            fill="#111827"
            stroke="var(--secondary)"
            strokeWidth="4"
          />
          <path
            d="M -50 260 L 420 210 L 540 380 L 910 240 L 980 430 L 460 590 L 180 520 L -50 640 Z"
            fill="url(#punk-dot-pattern)"
            className="text-white opacity-40"
          />
        </g>

        {/* ========================================================
            PIECE 4: Mid-Right Dark Halftone Texture Sheet
            ======================================================== */}
        <g className="punk-piece-dark-mr">
          <path
            d="M 1970 270 L 1520 220 L 1400 390 L 1020 260 L 950 450 L 1470 600 L 1760 530 L 1970 650 Z"
            fill="#111827"
            stroke="var(--disruption)"
            strokeWidth="4"
          />
          <path
            d="M 1970 270 L 1520 220 L 1400 390 L 1020 260 L 950 450 L 1470 600 L 1760 530 L 1970 650 Z"
            fill="url(#punk-dot-pattern)"
            className="text-white opacity-40"
          />
        </g>

        {/* ========================================================
            PIECE 5: Bottom-Left Disruption Pink Serrated Sheet
            ======================================================== */}
        <g className="punk-piece-pink-bl">
          <path
            d="M -50 620 L 280 580 L 490 770 L 780 630 L 970 820 L 1040 1130 L -50 1130 Z"
            fill="var(--disruption)"
            stroke="#111111"
            strokeWidth="5"
          />
          <path
            d="M -50 620 L 280 580 L 490 770 L 780 630 L 970 820 L 1040 1130 L -50 1130 Z"
            fill="url(#punk-hatch-pattern)"
            className="text-[#111111] opacity-25"
          />
        </g>

        {/* ========================================================
            PIECE 6: Bottom-Right Acid Green Polka-Dot Sheet
            ======================================================== */}
        <g className="punk-piece-acid-br">
          <path
            d="M 1970 630 L 1650 590 L 1440 780 L 1150 640 L 960 830 L 890 1130 L 1970 1130 Z"
            fill="var(--color-sky)"
            stroke="#111111"
            strokeWidth="5"
          />
          <path
            d="M 1970 630 L 1650 590 L 1440 780 L 1150 640 L 960 830 L 890 1130 L 1970 1130 Z"
            fill="url(#punk-dot-pattern)"
            className="text-[#111111] opacity-30"
          />
        </g>

        {/* ========================================================
            PIECE 7: Giant Black Jagged Center "X" / Spider-Lightning Slash
            ======================================================== */}
        <g className="punk-piece-lightning-x">
          {/* Cyan Glow Shadow */}
          <path
            d="M 100 -50 L 380 180 L 520 140 L 860 380 L 960 330 L 1060 380 L 1400 140 L 1540 180 L 1820 -50 L 1970 100 L 1580 410 L 1680 470 L 1380 720 L 1480 790 L 1820 1130 L 1540 1130 L 1260 880 L 1120 930 L 960 760 L 800 930 L 660 880 L 380 1130 L 100 1130 L 440 790 L 540 720 L 240 470 L 340 410 L -50 100 Z"
            fill="var(--secondary)"
            opacity="0.8"
            transform="translate(-6, 6)"
          />
          {/* Magenta Glow Shadow */}
          <path
            d="M 100 -50 L 380 180 L 520 140 L 860 380 L 960 330 L 1060 380 L 1400 140 L 1540 180 L 1820 -50 L 1970 100 L 1580 410 L 1680 470 L 1380 720 L 1480 790 L 1820 1130 L 1540 1130 L 1260 880 L 1120 930 L 960 760 L 800 930 L 660 880 L 380 1130 L 100 1130 L 440 790 L 540 720 L 240 470 L 340 410 L -50 100 Z"
            fill="var(--disruption)"
            opacity="0.8"
            transform="translate(6, -6)"
          />
          {/* Main Ink Black Giant Lightning Slash */}
          <path
            d="M 100 -50 L 380 180 L 520 140 L 860 380 L 960 330 L 1060 380 L 1400 140 L 1540 180 L 1820 -50 L 1970 100 L 1580 410 L 1680 470 L 1380 720 L 1480 790 L 1820 1130 L 1540 1130 L 1260 880 L 1120 930 L 960 760 L 800 930 L 660 880 L 380 1130 L 100 1130 L 440 790 L 540 720 L 240 470 L 340 410 L -50 100 Z"
            fill="#080D18"
            stroke="var(--color-sky)"
            strokeWidth="4"
          />
        </g>
      </svg>
    </div>
  )
}
