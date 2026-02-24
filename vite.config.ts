import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.svg', 'pwa-512x512.svg', 'pwa-maskable.svg', 'apple-touch-icon.png'],
      workbox: {
        // Ensure SPA routing works offline: any navigation request not
        // matching a precached asset falls back to index.html.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/data\//, /^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/data\/banks\.latest\.json/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'banks-data',
              expiration: { maxEntries: 1, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            // Cache PWA icon assets long-term (they're content-hashed or
            // change infrequently).
            urlPattern: /\.(?:png|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        id: '/',
        name: 'OpenTWQR',
        short_name: 'OpenTWQR',
        description: '在裝置本地安全產生台灣 Pay（TWQR）個人收款 QR Code。',
        start_url: '/',
        scope: '/',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'portrait',
        lang: 'zh-TW',
        categories: ['finance', 'utilities'],
        prefer_related_applications: false,
        launch_handler: {
          client_mode: 'navigate-existing',
        },
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: '帳戶管理',
            short_name: '帳戶',
            url: '/accounts',
          },
        ],
        screenshots: [
          {
            src: 'screenshots/receive-light.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: '收款頁面',
          },
          {
            src: 'screenshots/receive-dark.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: '收款頁面（深色模式）',
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into separate chunks so the browser
        // can cache them independently from application code.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-qr': ['qrcode.react'],
        },
      },
    },
  },
})
