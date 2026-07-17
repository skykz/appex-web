/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API URL — origin or …/api (same as frontend/admin). */
  readonly VITE_API_URL?: string
  /** Learner SPA URL (frontend Vercel project) for auth/checkout handoff. */
  readonly VITE_APP_URL?: string
  /** Meta Pixel id. When unset, all pixel tracking is a safe no-op. */
  readonly VITE_META_PIXEL_ID?: string
  /** Meta Test Event Code — attaches events to the Events Manager test stream. */
  readonly VITE_META_TEST_EVENT_CODE?: string
  /** GA4 Measurement ID (G-XXXX). When unset, all GA4 tracking is a safe no-op. */
  readonly VITE_GA4_MEASUREMENT_ID?: string
  /** "true" to allow GA4 to fire in DEV builds (routes to GA4 DebugView). */
  readonly VITE_GA4_DEBUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
