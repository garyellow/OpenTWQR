/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const commitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
})()

export default defineConfig({
  define: {
    __BUILD_HASH__: JSON.stringify(commitHash),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', 'pwa-maskable.svg', 'apple-touch-icon.png'],
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
            src: 'pwa-icon.svg',
            sizes: '192x192 512x512',
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
        // Web Share Target: allow users to share OTWQR backup strings and TWQR
        // payment codes TO this app via the system share sheet (Chromium PWA only).
        ...({
          share_target: {
            action: '/share',
            method: 'GET',
            params: { text: 'text', title: 'title', url: 'url' },
          },
        } as Record<string, unknown>),
        screenshots: [
          {
            src: 'screenshots/welcome-mobile-light.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: '歡迎畫面（手機版）',
          },
          {
            src: 'screenshots/welcome-mobile-dark.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: '歡迎畫面（手機版深色模式）',
          },
          {
            src: 'screenshots/main-mobile-light.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: '主頁（手機版）',
          },
          {
            src: 'screenshots/main-mobile-dark.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: '主頁（手機版深色模式）',
          },
          {
            src: 'screenshots/welcome-desktop-light.png',
            sizes: '1440x900',
            type: 'image/png',
            form_factor: 'wide',
            label: '歡迎畫面（桌面版）',
          },
          {
            src: 'screenshots/welcome-desktop-dark.png',
            sizes: '1440x900',
            type: 'image/png',
            form_factor: 'wide',
            label: '歡迎畫面（桌面版深色模式）',
          },
          {
            src: 'screenshots/main-desktop-light.png',
            sizes: '1440x900',
            type: 'image/png',
            form_factor: 'wide',
            label: '主頁（桌面版）',
          },
          {
            src: 'screenshots/main-desktop-dark.png',
            sizes: '1440x900',
            type: 'image/png',
            form_factor: 'wide',
            label: '主頁（桌面版深色模式）',
          },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Split heavy vendor libraries into separate chunks so the browser
        // can cache them independently from application code.
        manualChunks(id) {
          if (id.includes('react-router-dom') || id.includes('react-router')) {
            return 'vendor-router'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
