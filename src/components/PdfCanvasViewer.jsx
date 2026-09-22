import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { ZoomIn, ZoomOut, RotateCcw, AlertTriangle, ExternalLink, Download, Loader2 } from 'lucide-react'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

function PageCanvas({ page, scale }) {
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (!page || !canvasRef.current) return

    // Cancel any ongoing render task on this page
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel()
      } catch (e) {}
    }

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const viewport = page.getViewport({ scale })

    // Use device pixel ratio for razor-sharp rendering on Retina/mobile screens
    const pixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
    canvas.width = Math.floor(viewport.width * pixelRatio)
    canvas.height = Math.floor(viewport.height * pixelRatio)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`

    const transform = pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : null

    const renderContext = {
      canvasContext: context,
      transform,
      viewport,
    }

    const task = page.render(renderContext)
    renderTaskRef.current = task

    task.promise
      .then(() => {
        setRendered(true)
      })
      .catch((err) => {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${page.pageNumber}:`, err)
        }
      })

    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch (e) {}
      }
    }
  }, [page, scale])

  return (
    <div className="relative flex flex-col items-center max-w-full">
      <div className="relative overflow-hidden bg-white shadow-hard-md border-2 border-[var(--border-strong)] rounded max-w-full">
        <canvas ref={canvasRef} className="block max-w-full" />
        {!rendered && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <Loader2 className="icon-sm animate-spin text-[var(--text)]" />
          </div>
        )}
      </div>
      <span className="mt-2 text-[10px] font-mono font-bold tracking-wider uppercase text-[var(--muted)]">
        PAGE {page.pageNumber}
      </span>
    </div>
  )
}

export default function PdfCanvasViewer({ url, title, downloadFilename }) {
  const containerRef = useRef(null)
  const [doc, setDoc] = useState(null)
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scale, setScale] = useState(1.0)
  const [baseWidth, setBaseWidth] = useState(null)

  // Load PDF document
  useEffect(() => {
    if (!url) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setDoc(null)
    setPages([])

    const loadingTask = pdfjsLib.getDocument(url)

    loadingTask.promise
      .then(async (loadedDoc) => {
        if (cancelled) return
        setDoc(loadedDoc)

        // Load all page proxies
        const pagePromises = []
        for (let i = 1; i <= loadedDoc.numPages; i++) {
          pagePromises.push(loadedDoc.getPage(i))
        }
        const loadedPages = await Promise.all(pagePromises)
        if (cancelled) return
        setPages(loadedPages)

        // Calculate initial scale to fit container width nicely on mobile/desktop
        if (loadedPages.length > 0 && containerRef.current) {
          const firstPage = loadedPages[0]
          const defaultViewport = firstPage.getViewport({ scale: 1.0 })
          setBaseWidth(defaultViewport.width)

          const containerWidth = containerRef.current.clientWidth - 32 // padding
          const targetScale = containerWidth > 0 ? Math.min(1.4, Math.max(0.5, containerWidth / defaultViewport.width)) : 1.0
          setScale(targetScale)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to load PDF:', err)
        setError(err.message || 'Unable to open PDF')
        setLoading(false)
      })

    return () => {
      cancelled = true
      try {
        loadingTask.destroy()
      } catch (e) {}
    }
  }, [url])

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(2.5, +(s + 0.15).toFixed(2)))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(0.4, +(s - 0.15).toFixed(2)))
  }, [])

  const handleResetZoom = useCallback(() => {
    if (baseWidth && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 32
      const targetScale = Math.min(1.4, Math.max(0.5, containerWidth / baseWidth))
      setScale(targetScale)
    } else {
      setScale(1.0)
    }
  }, [baseWidth])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center h-full w-full">
        <div className="relative flex items-center justify-center p-4 bg-[var(--surface-2)] border-2 border-[var(--border)] rounded shadow-hard-sm">
          <Loader2 className="icon-md sm:icon-lg animate-spin text-[var(--color-fuchsia)] mr-3" />
          <span className="t-card-title text-xs sm:text-sm uppercase tracking-wider font-extrabold text-[var(--text)]">
            LOADING QUESTION PAPER...
          </span>
        </div>
        <p className="t-meta muted mt-3 normal-case">
          Rendering pages for mobile and desktop...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto bg-[var(--surface)] border-2 border-[var(--border)] rounded shadow-hard-md">
        <AlertTriangle className="icon-lg text-[var(--color-coral)] mb-2" />
        <p className="t-card-title text-sm sm:text-base uppercase font-bold text-[var(--text)]">
          UNABLE TO DISPLAY PAPER IN VIEWER
        </p>
        <p className="t-body muted mt-2 text-xs sm:text-sm normal-case">
          {error}. You can open it directly in a new browser tab or download the file.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-go !py-2 !px-4 text-xs font-bold uppercase flex items-center gap-1.5"
          >
            <ExternalLink className="icon-micro" /> OPEN IN TAB
          </a>
          <a
            href={url}
            download={downloadFilename || 'question_paper.pdf'}
            className="btn !py-2 !px-4 text-xs font-bold uppercase flex items-center gap-1.5 bg-[var(--surface-2)] border-2 border-[var(--border)]"
          >
            <Download className="icon-micro" /> DOWNLOAD PDF
          </a>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex flex-col h-full w-full overflow-hidden">
      {/* Floating Zoom / Page Controls Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-1.5 bg-[var(--surface)]/95 backdrop-blur-md border-b-2 border-[var(--border)] shadow-xs shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]">
            {pages.length} {pages.length === 1 ? 'PAGE' : 'PAGES'}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.4}
            className="btn !py-1 !px-2 text-xs font-bold cursor-pointer disabled:opacity-40"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="icon-micro" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="btn !py-1 !px-2 text-xs font-mono font-bold cursor-pointer"
            title="Fit to Width"
            aria-label="Fit to Width"
          >
            <span className="hidden sm:inline mr-1">FIT</span>
            <span>{Math.round(scale * 100)}%</span>
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 2.5}
            className="btn !py-1 !px-2 text-xs font-bold cursor-pointer disabled:opacity-40"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="icon-micro" />
          </button>
        </div>
      </div>

      {/* Scrollable Document Pages Container */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 space-y-4 sm:space-y-6 flex flex-col items-center">
        {pages.map((p) => (
          <PageCanvas key={p.pageNumber} page={p} scale={scale} />
        ))}
      </div>
    </div>
  )
}
