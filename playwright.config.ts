import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for Executive Action E2E Tests
 *
 * RCF-EXEC-TEST-2: Every executive action MUST be verified at the system boundary.
 *
 * @rcf-version 2.2.0
 */

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Executive actions must run sequentially for audit integrity
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to maintain session state
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start dev server before running tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
