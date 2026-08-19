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

export default function App() {
  useTheme() // keeps the <html> class and theme-color meta in sync

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RootGate />} />
        <Route path="/welcome" element={<Welcome />} />

        <Route path="/select/branch" element={<SelectBranch />} />
        <Route path="/select/hostel" element={<SelectHostel />} />
        <Route path="/select/info" element={<SelectInfo />} />

        <Route path="/home" element={<Board />} />
        <Route path="/mess" element={<Mess />} />
        <Route path="/rollcall" element={<RollCall />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/pyq" element={<Pyq />} />
        <Route path="/map" element={<CampusMap />} />
        <Route path="/campus" element={<CampusInfo />} />
        <Route path="/info" element={<InfoHub />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/about" element={<About />} />

        {/* Legacy query-tab URLs from the reference app */}
        <Route path="/attendance" element={<Navigate to="/rollcall" replace />} />
        <Route path="/freenow" element={<Navigate to="/rooms" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
