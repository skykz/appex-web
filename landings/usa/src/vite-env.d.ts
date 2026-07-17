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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
