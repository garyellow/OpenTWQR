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
      includeAssets: ['pwa-192x192.svg', 'pwa-512x512.svg', 'pwa-maskable.svg', 'apple-touch-icon.png'],
      workbox: {
        // Ensure SPA routing works offline: any navigation request not
        // matching a precached asset falls back to index.html.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/data\//, /^\/api\//, /^\/screenshots\//],
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
        description: '產生 TWQR 個人收款 QR Code，對方用銀行 App 掃碼即可轉帳。完全免費、無需註冊。',
        start_url: '/',
        scope: '/',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        dir: 'ltr',
        lang: 'zh-TW',
        categories: ['finance', 'utilities'],
        prefer_related_applications: false,
        launch_handler: {
          client_mode: 'navigate-existing',
        },
        // Chromium 121+: prefer opening in-scope links in the installed
        // PWA instead of the browser. Browsers that don't support this
        // member will silently ignore it.
        ...({ handle_links: 'preferred' } as Record<string, unknown>),
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
          {
            name: '設定',
            short_name: '設定',
            url: '/settings',
          },
        ],
        // Web Share Target: allow users to share an OTWQR backup string
        // TO this app via the system share sheet (Chromium PWA only).
        ...({
          share_target: {
            action: '/import',
            method: 'GET',
            params: { text: 'text', title: 'title', url: 'url' },
          },
        } as Record<string, unknown>),
        screenshots: [
          {
            src: 'screenshots/receive-light.png',
            sizes: '780x1688',
            type: 'image/png',
            form_factor: 'narrow',
            label: '收款頁面',
          },
          {
            src: 'screenshots/receive-dark.png',
            sizes: '780x1688',
            type: 'image/png',
            form_factor: 'narrow',
            label: '收款頁面（深色模式）',
          },
          {
            src: 'screenshots/receive-desktop-light.png',
            sizes: '2560x1600',
            type: 'image/png',
            form_factor: 'wide',
            label: '收款頁面（桌面版）',
          },
          {
            src: 'screenshots/receive-desktop-dark.png',
            sizes: '2560x1600',
            type: 'image/png',
            form_factor: 'wide',
            label: '收款頁面（桌面版深色模式）',
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
          'vendor-router': ['react-router-dom'],
          'vendor-qr': ['qrcode.react'],
        },
      },
    },
  },
})
