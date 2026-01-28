/**
 * Environment configuration with type-safe access to environment variables.
 * Centralizes all env variable access for easier management.
 */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const
