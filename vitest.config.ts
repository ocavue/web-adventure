import stylex from '@stylexjs/unplugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [stylex.vite({ dev: false })],
  test: {
    // The StyleX plugin keeps a watcher open, which otherwise delays the exit by 10 seconds.
    teardownTimeout: 1000,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        // Pre-bundle browser dependencies up front. Discovering them during a run reloads the page and fails tests.
        optimizeDeps: {
          include: [
            '@preact/signals',
            '@testing-library/preact',
            'canvas-confetti',
            'preact',
            'preact/compat',
            'preact/hooks',
            'preact/jsx-runtime',
            'valibot',
          ],
        },
        test: {
          name: 'browser',
          include: ['src/**/*.test.tsx'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
