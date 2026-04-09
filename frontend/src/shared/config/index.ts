/**
 * Environment configuration with type-safe access to environment variables.
 * Centralizes all env variable access for easier management.
 */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  /** Public URL of the React app (e.g. https://app.appex.kz). Used for docs; landings link here. */
  appOrigin: import.meta.env.VITE_APP_ORIGIN || '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const
