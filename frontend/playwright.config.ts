import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Authentic AI Voice — Sprint 3 E2E tests.
 *
 * Run with (from frontend/):
 *   npx playwright test
 *   npx playwright test --headed          # to watch the browser
 *   npx playwright test --ui              # interactive UI mode
 *
 * Prerequisites:
 *   - Next.js dev server on http://localhost:3000  (npm run dev)
 *   - FastAPI backend on http://localhost:8000     (uvicorn app.main:app --reload)
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests sequentially — they share a logged-in session */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only */
  forbidOnly: !!process.env.CI,
  /* Retry once on CI to guard against flakiness */
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  /* Global timeout per test */
  timeout: 90_000,
  /* Per-assertion timeout */
  expect: { timeout: 15_000 },

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    /* Attach trace on first retry */
    trace: "on-first-retry",
    /* Capture screenshot on failure */
    screenshot: "only-on-failure",
    /* Slow down actions slightly so animations settle */
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Optionally spin up the Next.js dev server automatically */
  // webServer: {
  //   command: "npm run dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: !process.env.CI,
  // },
});
