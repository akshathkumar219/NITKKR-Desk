import { useState, useEffect } from 'react'
import { Compass, ChevronLeft, ChevronRight } from 'lucide-react'
import Shell from '../components/Shell'
import { PageHeader } from '../ui'

const GUIDE_CARDS = [
  {
    id: 'storage',
    heading: 'DATA & STORAGE',
    subheading: 'Your data remains stored locally on your device.',
    accentColor: 'var(--color-amber, #F59E0B)',
    bullets: [
      {
        title: 'Local Storage',
        text: "All data, schedules, and preferences entered are stored directly inside your browser's local storage."
      },
      {
        title: 'Privacy Focused',
        text: 'No personal data or usage metrics are transmitted to external servers or third-party databases.'
      },
      {
        title: 'No Sync',
        text: 'Because data is saved locally in your current browser, it will not automatically sync across different browsers or separate devices unless exported and transferred manually.'
      }
    ]
  },
  {
    id: 'warnings',
    heading: 'WHAT NOT TO DO',
    subheading: 'Prevent accidental data loss and reset issues.',
    accentColor: 'var(--color-coral, #EF4444)',
    bullets: [
      {
        title: 'Do Not Clear Browser Site Data',
        text: 'Clearing your browser cache, cookies, or website storage will permanently delete all saved entries and configurations.'
      },
      {
        title: 'Avoid Private or Incognito Mode',
        text: 'Browsers automatically purge all local storage as soon as an incognito or private window is closed.'
      },
      {
        title: 'Do Not Switch Browsers Without a Backup',
        text: 'Data entered in one browser (such as Chrome) is isolated and will not appear in another browser (such as Safari or Firefox).'
      }
    ]
  },
  {
    id: 'tips',
    heading: 'PRO TIPS',
    subheading: 'Recommendations for reliable usage.',
    accentColor: 'var(--color-lime, #84CC16)',
    bullets: [
      {
        title: 'Create Regular Backups',
        text: 'Use the export function periodically to save a backup file to your device storage.'
      },
      {
        title: 'Install as Web App',
        text: 'Use your mobile browser\'s "Add to Home Screen" option to run the page in fullscreen mode without address bars.'
      },
      {
        title: 'Offline Functionality',
        text: 'After loading the page once, core features remain accessible and operational even without an active internet connection.'
      }
    ]
  },
  {
    id: 'suggestions',
    heading: 'SUGGESTIONS',
    subheading: 'Help improve accuracy and usability.',
    accentColor: 'var(--color-sky, #3B82F6)',
    bullets: [
      {
        title: 'Feature Requests',
        text: 'If you have suggestions for new tools, calculators, or layout improvements, submit your ideas on my Insta (In about page).'
      },
      {
        title: 'Report Inaccurate Information',
        text: 'If notice incorrect course details, outdated dates, or broken elements, report them for immediate review and correction.'
      },
      {
        title: 'Feedback Channels',
        text: 'Use the direct communication links provided in About Page to reach out.'
      }
    ]
  }
]

export default function Guide() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const minSwipeDistance = 40

  const handleTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentIndex < GUIDE_CARDS.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => Math.min(prev + 1, GUIDE_CARDS.length - 1))
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(prev - 1, 0))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Shell>
      <PageHeader
        icon={Compass}
        accent="var(--color-lime)"
        iconInk="var(--on-accent)"
        title="HOW DOES THIS WORK?"
        sub="ESSENTIAL GUIDELINES, STORAGE RULES, AND USAGE BEST PRACTICES"
      />

      {/* Desktop View: 2x2 Grid (>= 768px) */}
      <div className="hidden md:grid md:grid-cols-2 gap-4 lg:gap-5">
        {GUIDE_CARDS.map((card) => (
          <div
            key={card.id}
            className="board board-hard flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
            style={{
              borderLeftWidth: 6,
              borderLeftColor: card.accentColor,
            }}
          >
            <div className="pad-page flex flex-col">
              <h2
                className="font-bold tracking-tight mb-1 text-[28px] leading-tight"
                style={{ color: card.accentColor }}
              >
                {card.heading}
              </h2>

              <p className="t-meta muted normal-case text-[15px] mb-4">
                {card.subheading}
              </p>

              <ul className="space-y-3.5 mt-1">
                {card.bullets.map((item) => (
                  <li key={item.title} className="text-[16px] leading-relaxed text-[var(--muted)] flex items-start gap-2.5">
                    <span
                      className="font-bold shrink-0 text-lg leading-tight select-none"
                      style={{ color: card.accentColor }}
                    >
                      •
                    </span>
                    <span>
                      <strong className="text-[var(--text)] font-semibold">{item.title}: </strong>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile View: Swipeable Carousel (< 768px) */}
      <div className="md:hidden flex flex-col space-y-3">
        <div
          className="overflow-hidden w-full touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
            }}
          >
            {GUIDE_CARDS.map((card) => (
              <div key={card.id} className="w-full shrink-0 px-0.5 box-border">
                <div
                  className="board board-hard flex flex-col"
                  style={{
                    borderLeftWidth: 6,
                    borderLeftColor: card.accentColor,
                  }}
                >
                  <div className="pad-page flex flex-col">
                    <h2
                      className="font-bold tracking-tight mb-1 text-[22px] leading-tight"
                      style={{ color: card.accentColor }}
                    >
                      {card.heading}
                    </h2>

                    <p className="t-meta muted normal-case text-[13px] mb-3">
                      {card.subheading}
                    </p>

                    <ul className="space-y-2.5 mt-1">
                      {card.bullets.map((item) => (
                        <li key={item.title} className="text-[14px] leading-snug text-[var(--muted)] flex items-start gap-2">
                          <span
                            className="font-bold shrink-0 text-base leading-tight select-none"
                            style={{ color: card.accentColor }}
                          >
                            •
                          </span>
                          <span>
                            <strong className="text-[var(--text)] font-semibold">{item.title}: </strong>
                            {item.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Navigation Controls */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentIndex === 0}
            className="btn !py-1.5 !px-3 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} strokeWidth={2.5} />
            PREV
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-2" role="tablist" aria-label="Card pagination">
            {GUIDE_CARDS.map((card, idx) => (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={idx === currentIndex}
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setCurrentIndex(idx)}
                className="h-2 rounded-full transition-all duration-200 cursor-pointer"
                style={{
                  width: idx === currentIndex ? '22px' : '8px',
                  backgroundColor:
                    idx === currentIndex
                      ? card.accentColor
                      : 'var(--border)',
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, GUIDE_CARDS.length - 1))}
            disabled={currentIndex === GUIDE_CARDS.length - 1}
            className="btn !py-1.5 !px-3 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            NEXT
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </Shell>
  )
}
