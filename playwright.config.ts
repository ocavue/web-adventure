import { defineConfig, devices } from '@playwright/test'

// An unusual port, so the tests never talk to another local server by mistake.
const port = Number(process.env.E2E_PORT ?? 4600)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // The static HTML is the same on every device, so the SEO checks run once.
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: 'seo.spec.ts' },
  ],
  // Serves the built `dist/` like Cloudflare Pages does. Run `pnpm run build` first.
  webServer: {
    command: 'node e2e/server.ts',
    env: { PORT: String(port) },
    url: baseURL,
    reuseExistingServer: false,
  },
})
