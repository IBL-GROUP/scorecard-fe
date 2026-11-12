// End-to-end tests for Supply Chain Pulse 2.0 (story S5). `npm run test:e2e`
// builds the 2.0 app in e2e mode (.env.e2e) and serves it with vite preview.
// Every request to the authenticator and to scorecard-be is answered by the
// tests (e2e/stubs.ts), so the suite needs no backend and runs the same in CI.
// Test names carry their spec test-case IDs (TC-S5-…), as AGENTS.md requires.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4176;
const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  // Two browsers at a time: with four, Chrome crashed once on a developer machine (S5 run log).
  workers: 2,
  retries: 0,
  forbidOnly: CI,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: `http://localhost:${PORT}/scorecard-dashboard/`,
    trace: 'retain-on-failure',
    acceptDownloads: true,
  },
  projects: [
    // Installed Google Chrome locally; Playwright's Chromium in CI (`npx playwright install chromium`).
    { name: 'chrome', use: { ...devices['Desktop Chrome'], ...(CI ? {} : { channel: 'chrome' }), viewport: { width: 1440, height: 900 } } },
    // Layout checks only (TC-S5-14) also run on Microsoft Edge.
    { name: 'edge', grep: /@layout/, use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  ],
  webServer: {
    command: `npx vite build --mode e2e --outDir dist-e2e && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/scorecard-dashboard/`,
    reuseExistingServer: !CI,
    timeout: 240_000,
  },
});
