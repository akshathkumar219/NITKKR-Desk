import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Landing from './pages/Landing'
import Welcome from './pages/Welcome'
import SelectBranch from './pages/SelectBranch'
import SelectHostel from './pages/SelectHostel'
import SelectInfo from './pages/SelectInfo'
import Board from './pages/Board'
import Mess from './pages/Mess'
import RollCall from './pages/RollCall'
import Rooms from './pages/Rooms'
import Tools from './pages/Tools'
import Pyq from './pages/Pyq'
import CampusMap from './pages/CampusMap'
import CampusInfo from './pages/CampusInfo'
import InfoHub from './pages/InfoHub'
import Profile from './pages/Profile'
import About from './pages/About'
import NotFound from './pages/NotFound'
import ErrorBoundary from './components/ErrorBoundary'
import { KEYS, read, useTheme } from './lib/storage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** First run sends you to /welcome once, then never again. */
function RootGate() {
  const seen = read(KEYS.welcomed, false)
  return seen ? <Landing /> : <Navigate to="/welcome" replace />
}

/**
 * Guards the app routes the same way RootGate guards `/`.
 *
 * Without this, a deep link to /home for a brand-new visitor rendered a board
 * for DEFAULT_BRANCH/DEFAULT_YEAR — asserting a branch and year they never
 * chose, which is the same class of bug that was showing phantom "CSE · Y1"
 * chips on the landing page.
 */
function RequireWelcome({ children }) {
  const seen = read(KEYS.welcomed, false)
  return seen ? children : <Navigate to="/welcome" replace />
}

export default function App() {
  useTheme() // keeps the <html> class and theme-color meta in sync

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RootGate />} />
        <Route path="/welcome" element={<Welcome />} />

        <Route path="/select/branch" element={<SelectBranch />} />
        <Route path="/select/hostel" element={<SelectHostel />} />
        <Route path="/select/info" element={<SelectInfo />} />

        <Route path="/home" element={<RequireWelcome><Board /></RequireWelcome>} />
        <Route path="/mess" element={<RequireWelcome><Mess /></RequireWelcome>} />
        <Route path="/rollcall" element={<RequireWelcome><RollCall /></RequireWelcome>} />
        <Route path="/rooms" element={<RequireWelcome><Rooms /></RequireWelcome>} />
        <Route path="/tools" element={<RequireWelcome><Tools /></RequireWelcome>} />
        <Route path="/pyq" element={<Pyq />} />
        <Route path="/map" element={<CampusMap />} />
        <Route path="/campus" element={<RequireWelcome><CampusInfo /></RequireWelcome>} />
        <Route path="/info" element={<RequireWelcome><InfoHub /></RequireWelcome>} />
        <Route path="/profile" element={<RequireWelcome><Profile /></RequireWelcome>} />
        <Route path="/about" element={<About />} />

        {/* Legacy query-tab URLs from the reference app */}
        <Route path="/attendance" element={<Navigate to="/rollcall" replace />} />
        <Route path="/freenow" element={<Navigate to="/rooms" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  )
}
