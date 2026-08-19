import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'NITKKR BOARD',
        short_name: 'KKR BOARD',
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
