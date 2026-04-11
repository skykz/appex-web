import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/** Vite base URL (e.g. /app/ when the SPA lives at https://appex.kz/app/). Must end with /. */
function viteBase(): string {
  const raw = process.env.VITE_BASE_PATH?.trim()
  if (!raw || raw === '/') return '/'
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

// https://vite.dev/config/
export default defineConfig({
  base: viteBase(),
  plugins: [react()],
  build: {
    /** Rollup warns above 500 kB; SPA is fine — raise slightly after splitting heavy vendors. */
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('lottie')) return 'vendor-lottie'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n'
          if (id.includes('@radix-ui')) return 'vendor-radix'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
        },
      },
    },
  },
  resolve: {
    alias: {
      /**
       * Full `lottie-web` uses eval() for AE expressions → blocked by strict CSP (e.g. Vercel).
       * Light build drops expressions; fine for UI Lotties (fire.json etc.).
       * @see https://github.com/airbnb/lottie-web/issues/289#issuecomment-335456582
       */
      'lottie-web': path.resolve(
        __dirname,
        '../node_modules/lottie-web/build/player/lottie_light.min.js'
      ),
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@features': path.resolve(__dirname, './src/features'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    headers: {
      "Content-Security-Policy": "script-src 'self' 'unsafe-eval';"
    }
  }
})
