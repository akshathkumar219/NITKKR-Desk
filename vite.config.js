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
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'NITKKR DESK',
        short_name: 'DESK',
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
          // PNGs first: Android's launcher ignores SVG icons, which is why the
          // installed app fell back to a generated placeholder.
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Full-bleed gradient, so it survives any launcher mask shape.
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
