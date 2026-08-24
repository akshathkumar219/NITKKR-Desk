import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

const PwaContext = createContext({
  needRefresh: false,
  offlineReady: false,
  checkStatus: 'idle', // 'idle' | 'checking' | 'updated' | 'up-to-date' | 'offline'
  updateApp: () => {},
  dismissUpdate: () => {},
  checkForUpdates: async () => {},
})

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function PwaProvider({ children }) {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [checkStatus, setCheckStatus] = useState('idle')

  const updateSWRef = useRef(null)
  const registrationRef = useRef(null)

  useEffect(() => {
    // Register the service worker
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true)
        setDismissed(false)
        setCheckStatus('updated')
      },
      onOfflineReady() {
        setOfflineReady(true)
      },
      onRegisteredSW(swUrl, r) {
        if (!r) return
        registrationRef.current = r

        // 1. Check on daily interval (once a day / 24 hours)
        const intervalId = setInterval(async () => {
          if (navigator.onLine && registrationRef.current) {
            try {
              await registrationRef.current.update()
            } catch (err) {
              console.warn('[PWA] Daily update check error:', err)
            }
          }
        }, ONE_DAY_MS)

        // 2. Check on app resume / focus
        const handleResume = async () => {
          if (document.visibilityState === 'visible' && navigator.onLine && registrationRef.current) {
            try {
              await registrationRef.current.update()
            } catch (err) {
              console.warn('[PWA] Resume update check error:', err)
            }
          }
        }

        document.addEventListener('visibilitychange', handleResume)
        window.addEventListener('focus', handleResume)
        window.addEventListener('online', handleResume)

        return () => {
          clearInterval(intervalId)
          document.removeEventListener('visibilitychange', handleResume)
          window.removeEventListener('focus', handleResume)
          window.removeEventListener('online', handleResume)
        }
      },
      onRegisterError(error) {
        console.error('[PWA] Registration error:', error)
      },
    })

    updateSWRef.current = updateSW
  }, [])

  const updateApp = () => {
    if (updateSWRef.current) {
      updateSWRef.current(true)
    } else {
      window.location.reload()
    }
  }

  const dismissUpdate = () => {
    setDismissed(true)
  }

  const checkForUpdates = async () => {
    if (!navigator.onLine) {
      setCheckStatus('offline')
      setTimeout(() => setCheckStatus('idle'), 3500)
      return 'offline'
    }

    setCheckStatus('checking')

    try {
      const reg = registrationRef.current
      if (reg) {
        await reg.update()
        // If there's an installing or waiting worker, needRefresh will be set by onNeedRefresh
        setTimeout(() => {
          if (reg.waiting || reg.installing) {
            setNeedRefresh(true)
            setDismissed(false)
            setCheckStatus('updated')
          } else {
            setCheckStatus('up-to-date')
            setTimeout(() => setCheckStatus('idle'), 3500)
          }
        }, 600)
      } else {
        setTimeout(() => {
          setCheckStatus('up-to-date')
          setTimeout(() => setCheckStatus('idle'), 3500)
        }, 600)
      }
    } catch (err) {
      console.error('[PWA] Check update error:', err)
      setCheckStatus('idle')
    }
  }

  return (
    <PwaContext.Provider
      value={{
        needRefresh: needRefresh && !dismissed,
        offlineReady,
        checkStatus,
        updateApp,
        dismissUpdate,
        checkForUpdates,
      }}
    >
      {children}
    </PwaContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePwa() {
  return useContext(PwaContext)
}
