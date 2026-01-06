import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for Executive Action E2E Tests
 *
 * RCF-EXEC-TEST-2: Every executive action MUST be verified at the system boundary.
 * RCF-E2E-4: Retry & flake elimination - MANDATORY configuration
 *
 * @rcf-version 2.2.0
 */

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Executive actions must run sequentially for audit integrity
  forbidOnly: !!process.env.CI,

  // RCF-E2E-4: Retry configuration - MANDATORY
  retries: 2, // Always retry twice to eliminate flakes
  workers: 1, // Single worker to maintain session state

  // RCF-E2E-4: Timeout configuration - MANDATORY
  timeout: 30_000, // 30 seconds per test
  expect: {
    timeout: 10_000, // 10 seconds for assertions
  },

  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    // Add JSON reporter for CI parsing
    ["json", { outputFile: "test-results/results.json" }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // RCF-E2E-4: Action timeouts - MANDATORY
    actionTimeout: 10_000, // 10 seconds per action
    navigationTimeout: 15_000, // 15 seconds for navigation
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
    timeout: 120_000,
  },
});
