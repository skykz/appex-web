const apiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000/api'

export const config = {
  apiUrl,
  isDev: import.meta.env.DEV,
}
