import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  Compass,
  Crosshair,
  Maximize2,
  Minimize2,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
} from 'lucide-react'
import campusMapSvg from '../assets/nitkkr_campus_map.svg?raw'
import landmarkCoords from '../data/landmark_map_coords.json'

const MAP_WIDTH = 1200
const MAP_HEIGHT = 1080
const MIN_SCALE = 0.2
const MAX_SCALE = 4.0

// Content bounds for centering the campus map with balanced margins
const CAMPUS_BOUNDS = {
  minX: 85,
  maxX: 1165,
  minY: 55,
  maxY: 1065,
}
const CAMPUS_WIDTH = CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX
const CAMPUS_HEIGHT = CAMPUS_BOUNDS.maxY - CAMPUS_BOUNDS.minY
const CAMPUS_CENTER_X = (CAMPUS_BOUNDS.minX + CAMPUS_BOUNDS.maxX) / 2 // 625
const CAMPUS_CENTER_Y = 575 // Optical center giving equal breathing room top and bottom

export default function InteractiveMapViewer({
  selectedId = null,
  onSelect,
  landmarks = [],
  className = '',
}) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const mapUniqueId = useId().replace(/[:]/g, '')

  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1.0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Dragging & gesture tracking refs
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const startPanRef = useRef({ x: 0, y: 0 })
  const didDragRef = useRef(false)
  const touchStartDistRef = useRef(0)
  const touchStartScaleRef = useRef(1)
  const touchCenterRef = useRef({ x: 0, y: 0 })
  const transitionTimeoutRef = useRef(null)

  // Track the last centered id to prevent re-centering loops during user zoom-out
  const lastCenteredIdRef = useRef(null)
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  // Current landmark meta
  const selectedMeta = landmarks.find((l) => l.id === selectedId)
  const activeCoords = selectedId ? landmarkCoords[selectedId] : null

  // Trigger smooth transition
  const triggerTransition = useCallback(() => {
    setIsTransitioning(true)
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false)
    }, 400)
  }, [])

  // Calculate default view to fit campus comfortably and centered
  const getFitView = useCallback(() => {
    if (!containerRef.current) return { pan: { x: 0, y: 0 }, scale: 1.0 }
    const { clientWidth: w, clientHeight: h } = containerRef.current

    // Padding inside container so edges don't hug borders
    const paddingX = Math.min(36, w * 0.04)
    const paddingY = Math.min(32, h * 0.05)
    const availableW = w - paddingX * 2
    const availableH = h - paddingY * 2

    const s = Math.min(availableW / CAMPUS_WIDTH, availableH / CAMPUS_HEIGHT, 1.2)
    const scaleVal = Number(s.toFixed(3))

    const px = Math.round(w / 2 - CAMPUS_CENTER_X * scaleVal)
    const py = Math.round(h / 2 - CAMPUS_CENTER_Y * scaleVal)

    return { pan: { x: px, y: py }, scale: scaleVal }
  }, [])

  // Calculate minimum scale locked to campus overview
  const getMinScale = useCallback(() => {
    return getFitView().scale
  }, [getFitView])

  // Clamp panning boundaries so users cannot lose the map
  const clampPan = useCallback(
    (px, py, s) => {
      if (!containerRef.current) return { x: px, y: py }
      const { clientWidth: w, clientHeight: h } = containerRef.current
      const fit = getFitView()

      // At or near minimum overview scale, lock to centered fit view
      if (s <= fit.scale + 0.01) {
        return fit.pan
      }

      const mapW = MAP_WIDTH * s
      const mapH = MAP_HEIGHT * s

      let cx = px
      let cy = py

      if (mapW <= w) {
        cx = (w - mapW) / 2
      } else {
        const buffer = 40
        const minX = w - mapW - buffer
        const maxX = buffer
        cx = Math.min(maxX, Math.max(minX, px))
      }

      if (mapH <= h) {
        cy = (h - mapH) / 2
      } else {
        const buffer = 40
        const minY = h - mapH - buffer
        const maxY = buffer
        cy = Math.min(maxY, Math.max(minY, py))
      }

      return { x: Math.round(cx), y: Math.round(cy) }
    },
    [getFitView],
  )

  // Reset to default overview
  const handleResetView = useCallback(() => {
    triggerTransition()
    const fit = getFitView()
    setPan(fit.pan)
    setScale(fit.scale)
  }, [getFitView, triggerTransition])

  // Center on coordinates without tying to scale state in dependency array
  const centerOnPoint = useCallback(
    (cx, cy, targetScale = null) => {
      if (!containerRef.current) return
      const { clientWidth: w, clientHeight: h } = containerRef.current
      const currentScale = scaleRef.current
      const nextScale = targetScale || (currentScale < 1.5 ? 1.9 : currentScale)
      const px = Math.round(w / 2 - cx * nextScale)
      const py = Math.round(h / 2 - cy * nextScale)

      triggerTransition()
      setScale(nextScale)
      setPan({ x: px, y: py })
    },
    [triggerTransition],
  )

  // Fit initial view on mount and on resize (only if no landmark selected)
  useEffect(() => {
    const handleResize = () => {
      if (!lastCenteredIdRef.current) {
        const fit = getFitView()
        setPan(fit.pan)
        setScale(fit.scale)
      }
    }
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [getFitView])

  // Auto-center ONLY when selectedId actually changes (fixes the zoom-out bug!)
  useEffect(() => {
    if (selectedId !== lastCenteredIdRef.current) {
      lastCenteredIdRef.current = selectedId
      if (selectedId && landmarkCoords[selectedId]) {
        const { cx, cy } = landmarkCoords[selectedId]
        centerOnPoint(cx, cy)
      }
    }

    // Sync SVG `.selected` class
    if (contentRef.current) {
      const prev = contentRef.current.querySelectorAll('.bldg-group.selected')
      prev.forEach((el) => el.classList.remove('selected'))

      if (selectedId) {
        const el =
          contentRef.current.querySelector(`[data-id="${selectedId}"]`) ||
          contentRef.current.querySelector(`#bldg-${selectedId}`)
        if (el) el.classList.add('selected')
      }
    }
  }, [selectedId, centerOnPoint])

  // Clean transition timer
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    }
  }, [])

  // Zoom centered on container center or specific focal point
  const zoomBy = useCallback(
    (factor, focalPoint = null) => {
      if (!containerRef.current) return
      const { clientWidth: w, clientHeight: h } = containerRef.current
      const currentScale = scaleRef.current
      const minScale = getMinScale()

      // If zooming out and already at or near overview, snap to full overview
      if (factor < 1 && currentScale <= minScale + 0.008) {
        const fit = getFitView()
        triggerTransition()
        setScale(fit.scale)
        setPan(fit.pan)
        return
      }

      const rawScale = currentScale * factor
      const newScale = Math.max(minScale, Math.min(MAX_SCALE, rawScale))
      if (Math.abs(newScale - currentScale) < 0.001) return

      const fx = focalPoint ? focalPoint.x : w / 2
      const fy = focalPoint ? focalPoint.y : h / 2

      let newPanX = fx - (fx - pan.x) * (newScale / currentScale)
      let newPanY = fy - (fy - pan.y) * (newScale / currentScale)

      const clamped = clampPan(newPanX, newPanY, newScale)

      triggerTransition()
      setScale(Number(newScale.toFixed(3)))
      setPan(clamped)
    },
    [pan, triggerTransition, getMinScale, getFitView, clampPan],
  )

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault()
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const focal = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
      const factor = e.deltaY < 0 ? 1.15 : 0.85
      zoomBy(factor, focal)
    },
    [zoomBy],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Mouse Drag Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    isDraggingRef.current = true
    didDragRef.current = false
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    startPanRef.current = { ...pan }
    setIsTransitioning(false)
  }

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      if (Math.hypot(dx, dy) > 4) {
        didDragRef.current = true
      }
      const clamped = clampPan(
        startPanRef.current.x + dx,
        startPanRef.current.y + dy,
        scaleRef.current,
      )
      setPan(clamped)
    },
    [clampPan],
  )

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // Touch handlers (Single touch = Pan, Two touches = Pinch-to-zoom)
  const handleTouchStart = (e) => {
    setIsTransitioning(false)
    if (e.touches.length === 1) {
      isDraggingRef.current = true
      didDragRef.current = false
      const t = e.touches[0]
      dragStartRef.current = { x: t.clientX, y: t.clientY }
      startPanRef.current = { ...pan }
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      touchStartDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      touchStartScaleRef.current = scaleRef.current
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        touchCenterRef.current = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        }
      }
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const t = e.touches[0]
      const dx = t.clientX - dragStartRef.current.x
      const dy = t.clientY - dragStartRef.current.y
      if (Math.hypot(dx, dy) > 5) {
        didDragRef.current = true
      }
      const clamped = clampPan(
        startPanRef.current.x + dx,
        startPanRef.current.y + dy,
        scaleRef.current,
      )
      setPan(clamped)
    } else if (e.touches.length === 2 && touchStartDistRef.current > 0) {
      e.preventDefault()
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const ratio = dist / touchStartDistRef.current
      const currentScale = scaleRef.current
      const minScale = getMinScale()
      const newScale = Math.max(
        minScale,
        Math.min(MAX_SCALE, touchStartScaleRef.current * ratio),
      )

      const fx = touchCenterRef.current.x
      const fy = touchCenterRef.current.y
      const newPanX = fx - (fx - pan.x) * (newScale / currentScale)
      const newPanY = fy - (fy - pan.y) * (newScale / currentScale)
      const clamped = clampPan(newPanX, newPanY, newScale)

      setScale(Number(newScale.toFixed(3)))
      setPan(clamped)
    }
  }

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      isDraggingRef.current = false
      touchStartDistRef.current = 0
    } else if (e.touches.length === 1) {
      const t = e.touches[0]
      dragStartRef.current = { x: t.clientX, y: t.clientY }
      startPanRef.current = { ...pan }
      isDraggingRef.current = true
    }
  }

  // Double click to zoom into point
  const handleDoubleClick = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const focal = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    zoomBy(1.4, focal)
  }

  // Click delegation inside SVG
  const handleContainerClick = (e) => {
    if (didDragRef.current) {
      didDragRef.current = false
      return
    }

    const targetEl =
      e.target.closest('[data-target]') ||
      e.target.closest('.bldg-group') ||
      e.target.closest('[data-id]')

    if (targetEl) {
      const id = targetEl.getAttribute('data-target') || targetEl.getAttribute('data-id')
      if (id && onSelect) {
        onSelect(id)
        return
      }
    }

    // Clicked empty background
    if (
      e.target.tagName === 'svg' ||
      e.target.id === 'nitkkr-campus-map' ||
      e.target.getAttribute('fill') === '#f8fafc'
    ) {
      if (onSelect) onSelect(null)
    }
  }

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
      if (e.key === 'ArrowUp') setPan((p) => ({ ...p, y: p.y + 50 }))
      if (e.key === 'ArrowDown') setPan((p) => ({ ...p, y: p.y - 50 }))
      if (e.key === 'ArrowLeft') setPan((p) => ({ ...p, x: p.x + 50 }))
      if (e.key === 'ArrowRight') setPan((p) => ({ ...p, x: p.x - 50 }))
      if (e.key === '+' || e.key === '=') zoomBy(1.2)
      if (e.key === '-') zoomBy(0.8)
      if (e.key === '0') handleResetView()
      if (e.key === 'Escape' && onSelect) onSelect(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoomBy, handleResetView, onSelect])

  const minScale = getMinScale()
  const isMinZoom = scale <= minScale + 0.01
  const zoomTier =
    scale < 1.15 ? 'zoom-overview' : scale < 2.2 ? 'zoom-medium' : 'zoom-detailed'

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden touch-none select-none bg-[#f8fafc] border-2 border-[var(--border)] rounded-md cursor-grab active:cursor-grabbing ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      onClick={handleContainerClick}
      aria-label="NIT Kurukshetra Campus Map"
      role="region"
      tabIndex={0}
    >
      {/* SVG Canvas Content Layer */}
      <div
        ref={contentRef}
        className="relative origin-top-left pointer-events-auto"
        style={{
          width: `${MAP_WIDTH}px`,
          height: `${MAP_HEIGHT}px`,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          transition: isTransitioning
            ? 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'none',
          willChange: 'transform',
        }}
      >
        {/* Render base Light Mode SVG content */}
        <div
          id={`map-svg-root-${mapUniqueId}`}
          className={`w-full h-full ${zoomTier}`}
          dangerouslySetInnerHTML={{ __html: campusMapSvg }}
        />

        {/* Selected Landmark Clean 2D Pin & Indicator */}
        {activeCoords && (
          <div
            className="absolute pointer-events-none z-30 transition-all duration-200"
            style={{
              left: `${activeCoords.cx}px`,
              top: `${activeCoords.cy}px`,
              transform: `translate(-50%, -100%) scale(${Math.max(0.65, 1 / Math.sqrt(scale))})`,
              transformOrigin: 'bottom center',
            }}
          >
            {/* Subtle radar ripple */}
            <div className="absolute -bottom-2 -left-2 w-7 h-7 rounded-full bg-sky-400/40 animate-ping" />
            <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-sky-600 border border-white" />
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-white" />

            {/* Clean Light Badge */}
            <div className="flex flex-col items-center -translate-y-2">
              <div className="bg-white/95 text-slate-900 border-2 border-sky-600 rounded-md px-2.5 py-1 shadow-md flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0" />
                <span className="text-[11px] font-extrabold tracking-wide uppercase max-w-[200px] truncate">
                  {selectedMeta?.name || selectedId}
                </span>
              </div>
              {/* Pointer Triangle */}
              <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[7px] border-t-sky-600" />
            </div>
          </div>
        )}
      </div>

      {/* FLOATING MAP CONTROLS (Top Right) */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            zoomBy(1.3)
          }}
          className="p-2 bg-white/95 hover:bg-slate-100 text-slate-800 border-2 border-[var(--border)] rounded shadow-xs transition-colors flex items-center justify-center cursor-pointer"
          title="Zoom In (+)"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4 text-slate-800" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          disabled={isMinZoom}
          onClick={(e) => {
            e.stopPropagation()
            zoomBy(0.77)
          }}
          className={`p-2 bg-white/95 text-slate-800 border-2 border-[var(--border)] rounded shadow-xs transition-colors flex items-center justify-center ${
            isMinZoom
              ? 'opacity-40 cursor-not-allowed bg-slate-100'
              : 'hover:bg-slate-100 cursor-pointer'
          }`}
          title={isMinZoom ? 'Maximum zoomed out overview' : 'Zoom Out (-)'}
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4 text-slate-800" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleResetView()
          }}
          className="p-2 bg-white/95 hover:bg-slate-100 text-slate-800 border-2 border-[var(--border)] rounded shadow-xs transition-colors flex items-center justify-center cursor-pointer"
          title="Fit Campus Overview (0)"
          aria-label="Fit Campus Overview"
        >
          <RotateCcw className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
        </button>

        {selectedId && activeCoords && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              centerOnPoint(activeCoords.cx, activeCoords.cy)
            }}
            className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border-2 border-sky-600 rounded shadow-xs transition-colors flex items-center justify-center cursor-pointer"
            title="Focus Selected Landmark"
            aria-label="Focus Selected Landmark"
          >
            <Crosshair className="w-4 h-4 text-sky-700" strokeWidth={2.5} />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleFullscreen()
          }}
          className="p-2 bg-white/95 hover:bg-slate-100 text-slate-800 border-2 border-[var(--border)] rounded shadow-xs transition-colors flex items-center justify-center cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
          ) : (
            <Maximize2 className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* STATUS & ZOOM BAR (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-white/95 border border-slate-300 text-slate-700 text-[11px] font-bold shadow-xs">
          <Compass className="w-3.5 h-3.5 text-red-600" strokeWidth={2.5} />
          <span className="text-slate-500">ZOOM</span>
          <span className="text-sky-700 font-mono">{Math.round(scale * 100)}%</span>
        </div>

        {selectedMeta && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-50 border border-sky-400 text-sky-900 text-[11px] font-bold shadow-xs">
            <Navigation className="w-3.5 h-3.5 text-sky-600 fill-sky-600" />
            <span className="truncate max-w-[180px] sm:max-w-[300px] uppercase">
              {selectedMeta.name}
            </span>
          </div>
        )}
      </div>

      {/* QUICK PAN/ZOOM HINT (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-none hidden sm:block">
        <div className="text-[10px] uppercase font-mono tracking-wider text-slate-600 bg-white/90 px-2.5 py-1 rounded border border-slate-300 shadow-2xs">
          Drag to Pan · Scroll / Pinch to Zoom
        </div>
      </div>
    </div>
  )
}
