import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import { Panel } from '../ui'
import { HUB_TILES, tileStyle } from '../data/hubs'

export default function InfoHub() {
  return (
    <Shell>
      <Panel className="p-5 sm:p-6">
        <span className="sticker">INFO HUB</span>
        <h1 className="display mt-4 text-3xl sm:text-4xl">everything in one place</h1>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HUB_TILES.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="board board-hard block p-5 transition-transform hover:-translate-y-0.5"
            style={{ ...tileStyle(t), transitionDuration: 'var(--dur-fast)' }}
          >
            <t.icon size={22} strokeWidth={2.5} aria-hidden />
            <p className="heading mt-8 text-xl">{t.title}</p>
            <p className="label mt-1.5 opacity-70">{t.sub}</p>
          </Link>
        ))}
      </div>
    </Shell>
  )
}
