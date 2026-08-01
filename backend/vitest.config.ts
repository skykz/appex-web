import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    // env.ts validates process.env at import time, so the placeholders must be in
    // place before any module under test is loaded.
    setupFiles: ['src/test/setup.ts'],
  },
})
