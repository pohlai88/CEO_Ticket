/**
 * E2E Test Fixtures for Executive Actions
 *
 * Provides authenticated test contexts for different roles.
 *
 * @rcf-version 2.2.0
 */

import { test as base, expect } from "@playwright/test";

// Test user credentials (must exist in test environment)
export const TEST_USERS = {
  manager: {
    email: process.env.TEST_MANAGER_EMAIL || "manager@test.local",
    password: process.env.TEST_MANAGER_PASSWORD || "test-password-123",
    role: "MANAGER" as const,
  },
  ceo: {
    email: process.env.TEST_CEO_EMAIL || "ceo@test.local",
    password: process.env.TEST_CEO_PASSWORD || "test-password-123",
    role: "CEO" as const,
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || "admin@test.local",
    password: process.env.TEST_ADMIN_PASSWORD || "test-password-123",
    role: "ADMIN" as const,
  },
};

// Extended test with authentication helpers
export const test = base.extend<{
  loginAsManager: () => Promise<void>;
  loginAsCEO: () => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  loginAsManager: async ({ page }, use) => {
    const login = async () => {
      await page.goto("/auth/login");
      await page.fill('[name="email"]', TEST_USERS.manager.email);
      await page.fill('[name="password"]', TEST_USERS.manager.password);
      await page.click('button[type="submit"]');
      await page.waitForURL("/dashboard");
    };
    await use(login);
  },

  loginAsCEO: async ({ page }, use) => {
    const login = async () => {
      await page.goto("/auth/login");
      await page.fill('[name="email"]', TEST_USERS.ceo.email);
      await page.fill('[name="password"]', TEST_USERS.ceo.password);
      await page.click('button[type="submit"]');
      await page.waitForURL("/dashboard");
    };
    await use(login);
  },

  loginAsAdmin: async ({ page }, use) => {
    const login = async () => {
      await page.goto("/auth/login");
      await page.fill('[name="email"]', TEST_USERS.admin.email);
      await page.fill('[name="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL("/dashboard");
    };
    await use(login);
  },

  logout: async ({ page }, use) => {
    const logout = async () => {
      await page.click('[data-testid="logout-button"]');
      await page.waitForURL("/auth/login");
    };
    await use(logout);
  },
});

export { expect };

/**
 * Test data generators
 */
export function generateRequestTitle(): string {
  return `E2E Test Request ${Date.now()}`;
}

export function generateRequestDescription(): string {
  return `This is an automated E2E test request created at ${new Date().toISOString()}`;
}
