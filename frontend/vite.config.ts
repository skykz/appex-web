import path from 'path'
import type { ServerResponse } from 'http'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }; 
import { sentryVitePlugin } from "@sentry/vite-plugin"

/** CSP for local dev / preview only — allows Vite HMR + React refresh inline scripts. */
const DEV_CSP =
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: http: https: data:; img-src 'self' data: blob: https:; font-src 'self' data:;"

const CSP_PATCHED = Symbol('viteDevCspPatched')

/**
 * Wraps `setHeader` / `appendHeader` / `writeHead` so any `Content-Security-Policy`
 * (e.g. strict `script-src 'self' 'unsafe-eval'` from another layer) is replaced
 * with DEV_CSP during `vite` and `vite preview`.
 */
function installDevCspHeaderPatch(res: ServerResponse): void {
  const marked = res as ServerResponse & { [CSP_PATCHED]?: boolean }
  if (marked[CSP_PATCHED]) return
  marked[CSP_PATCHED] = true

  const origSetHeader = res.setHeader.bind(res)
  res.setHeader = (name, value) => {
    if (String(name).toLowerCase() === 'content-security-policy') {
      return origSetHeader('Content-Security-Policy', DEV_CSP)
    }
    return origSetHeader(name, value)
  }

  const origAppendHeader = res.appendHeader?.bind(res)
  if (origAppendHeader) {
    res.appendHeader = (name, value) => {
      if (String(name).toLowerCase() === 'content-security-policy') {
        return origSetHeader('Content-Security-Policy', DEV_CSP)
      }
      return origAppendHeader(name, value)
    }
  }

  const origWriteHead = res.writeHead.bind(res)
  res.writeHead = function writeHeadPatched(
    this: ServerResponse,
    ...args: unknown[]
  ): ServerResponse {
    const last = args[args.length - 1]
    if (
      last &&
      typeof last === 'object' &&
      !Array.isArray(last) &&
      !(last instanceof Buffer)
    ) {
      const headers = last as Record<string, string | number | string[] | undefined>
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'content-security-policy') {
          delete headers[key]
        }
      }
      headers['Content-Security-Policy'] = DEV_CSP
    }
    return origWriteHead.apply(this, args as Parameters<typeof origWriteHead>) as ServerResponse
  }
}

/**
 * Vite plugin: runs before the request is handled so every response can be patched.
 */
function devCspOverridePlugin(): Plugin {
  return {
    name: 'dev-csp-override',
    /** `vite` and `vite preview` both use `command === 'serve'`. */
    apply: (_, { command }) => command === 'serve',
    configureServer(server) {
      server.httpServer?.prependListener('request', (_req, res) => {
        installDevCspHeaderPatch(res)
      })
    },
    configurePreviewServer(server) {
      server.httpServer?.prependListener('request', (_req, res) => {
        installDevCspHeaderPatch(res)
      })
    },
  }
}

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
  plugins: [
    devCspOverridePlugin(),
    react({
      jsxRuntime: 'automatic',
    }),
    sentryVitePlugin({
      org: "Appex", // Замените на slug организации из настроек Sentry
      project: "javascript-react",          // Замените на slug проекта из настроек Sentry
    }),
  ],
  define: {    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version),},
  build: {
    /** Rollup warns above 500 kB; SPA is fine — raise slightly after splitting heavy vendors. */
    sourcemap: true,
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
      'Content-Security-Policy': DEV_CSP,
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': DEV_CSP,
    },
  },
})
