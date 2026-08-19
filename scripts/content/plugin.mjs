// ---------------------------------------------------------------------------
// Vite plugin: regenerate src/data/generated/*.json whenever content/ changes.
//
// The point of the whole pipeline is that editing a markdown file is the only
// step. Save a timetable, the browser reloads with it. No command to remember,
// no stale JSON, no code change.
// ---------------------------------------------------------------------------

import { fileURLToPath } from 'node:url'
import { buildContent, writeContent } from './build.mjs'

const CONTENT_DIR = fileURLToPath(new URL('../../content/', import.meta.url))

export default function contentPlugin() {
  let server = null

  function run(label) {
    const { errors, warnings, data } = buildContent()

    for (const w of warnings) console.warn(`  \x1b[33mwarn\x1b[0m  ${w}`)

    if (errors.length) {
      const message =
        `${errors.length} content error${errors.length > 1 ? 's' : ''}:\n\n` +
        errors.map((e) => `  ${e}`).join('\n')
      console.error(`\n\x1b[31m${message}\x1b[0m\n`)
      // In dev, surface it as an overlay rather than killing the server — the
      // author is mid-edit and wants to see the message, not restart.
      if (server) {
        server.ws.send({
          type: 'error',
          err: { message, stack: '', plugin: 'content', id: 'content' },
        })
        return false
      }
      throw new Error(message)
    }

    const written = writeContent(data)
    if (written.length && label !== 'startup') {
      console.log(`  \x1b[32mcontent\x1b[0m  rebuilt ${written.join(', ')}`)
    }
    return true
  }

  return {
    name: 'nitkkr-content',
    enforce: 'pre',

    buildStart() {
      run('startup')
    },

    configureServer(s) {
      server = s
      s.watcher.add(CONTENT_DIR)
      s.watcher.on('all', (_event, file) => {
        if (!file.startsWith(CONTENT_DIR) || !file.endsWith('.md')) return
        if (run('change')) {
          s.ws.send({ type: 'full-reload' })
        }
      })
    },
  }
}
