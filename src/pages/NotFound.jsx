import { Link } from 'react-router-dom'
import PlainShell from '../components/PlainShell'
import { Panel } from '../ui'

export default function NotFound() {
  return (
    <PlainShell back={null}>
      <Panel className="mt-16 p-8 text-center sm:p-12">
        <p className="label muted">404</p>
        <h1 className="heading mt-3 text-5xl sm:text-6xl">
          Not on
          <br />
          the board
        </h1>
        <p className="label muted mt-4">THAT ROUTE DOESN'T EXIST.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn btn-primary">
            HOME
          </Link>
          <Link to="/home" className="btn">
            TIMETABLE
          </Link>
        </div>
      </Panel>
    </PlainShell>
  )
}
