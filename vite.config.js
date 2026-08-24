import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import contentPlugin from './scripts/content/plugin.mjs'

export default defineConfig({
  plugins: [
    // Rebuilds src/data/generated/*.json from content/*.md, and reloads the
    // page when a markdown file is saved. Runs first so the JSON is on disk
    // before anything imports it.
    contentPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'NITKKR DESK',
        short_name: 'NITKKR DESK',
        description:
          'Timetable, roll call, mess board and campus info for NIT Kurukshetra',
        start_url: '/',
        display: 'standalone',
        background_color: '#FAF7F2',
        theme_color: '#12121A',
        lang: 'en',
        scope: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
