import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Landing from './pages/Landing'
import Welcome from './pages/Welcome'
import SelectBranch from './pages/SelectBranch'
import SelectHostel from './pages/SelectHostel'
import SelectInfo from './pages/SelectInfo'
import Board from './pages/Board'
import Mess from './pages/Mess'
import Attendance from './pages/Attendance'
import Tools from './pages/Tools'
import Pyq from './pages/Pyq'
import CampusMap from './pages/CampusMap'
import CampusInfo from './pages/CampusInfo'
import InfoHub from './pages/InfoHub'
import Subjects from './pages/Subjects'
import CalculatorPage from './pages/Calculator'
import Profile from './pages/Profile'
import CalendarPage from './pages/Calendar'
import Guide from './pages/Guide'
import About from './pages/About'
import NotFound from './pages/NotFound'
import ErrorBoundary from './components/ErrorBoundary'
import Intro from './components/Intro'
import ThemeBurst from './components/ThemeBurst'
import UpdatePrompt from './components/UpdatePrompt'
import { PwaProvider } from './lib/pwa'
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
    <PwaProvider>
      <ErrorBoundary>
        <ScrollToTop />
        {/* Spider-Punk themed radial transition on theme switch */}
        <ThemeBurst />
        {/* Mounted at the root, not per-page: a refresh of any route earns the
            entrance, while client-side navigation never remounts it. Returns
            null on the loads it decides to sit out. */}
        <Intro />
        {/* Floating PWA update toast when a new version is detected */}
        <UpdatePrompt />
        <Routes>
          <Route path="/" element={<RootGate />} />
          <Route path="/welcome" element={<Welcome />} />

          <Route path="/select/branch" element={<SelectBranch />} />
          <Route path="/select/hostel" element={<SelectHostel />} />
          <Route path="/select/info" element={<SelectInfo />} />

          <Route path="/home" element={<RequireWelcome><Board /></RequireWelcome>} />
          <Route path="/mess" element={<RequireWelcome><Mess /></RequireWelcome>} />
          <Route path="/attendance" element={<RequireWelcome><Attendance /></RequireWelcome>} />
          <Route path="/attendance/:tabKey" element={<RequireWelcome><Attendance /></RequireWelcome>} />
          <Route path="/attendance/*" element={<RequireWelcome><Attendance /></RequireWelcome>} />
          <Route path="/tools" element={<RequireWelcome><Tools /></RequireWelcome>} />
          <Route path="/pyq" element={<Pyq />} />
          <Route path="/map" element={<CampusMap />} />
          <Route path="/campus" element={<RequireWelcome><CampusInfo /></RequireWelcome>} />
          <Route path="/info" element={<RequireWelcome><InfoHub /></RequireWelcome>} />
          <Route path="/subjects" element={<RequireWelcome><Subjects /></RequireWelcome>} />
          <Route path="/subjects/:subjectKey" element={<RequireWelcome><Subjects /></RequireWelcome>} />
          <Route path="/subjects/*" element={<RequireWelcome><Subjects /></RequireWelcome>} />
          <Route path="/subject/:subjectKey" element={<RequireWelcome><Subjects /></RequireWelcome>} />
          <Route path="/calculator" element={<RequireWelcome><CalculatorPage /></RequireWelcome>} />
          <Route path="/profile" element={<RequireWelcome><Profile /></RequireWelcome>} />
          <Route path="/calendar" element={<RequireWelcome><CalendarPage /></RequireWelcome>} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/about" element={<About />} />

          {/* Legacy query-tab URLs from the reference app */}
          <Route path="/rollcall" element={<Navigate to="/attendance" replace />} />
          <Route path="/rollcall/:tabKey" element={<RequireWelcome><Attendance /></RequireWelcome>} />
          <Route path="/rollcall/*" element={<RequireWelcome><Attendance /></RequireWelcome>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </PwaProvider>
  )
}
