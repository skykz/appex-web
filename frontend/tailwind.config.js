/**
 * Tailwind v4 config. Colors, radii, and other design tokens live in
 * `src/app/styles/globals.css` under `@theme inline` (the single source of truth,
 * backed by CSS variables for theming). This file only declares the content globs
 * that v4 scans for class names; it is linked from globals.css via `@config`.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
}
