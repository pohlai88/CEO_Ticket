/**
 * E2E Test Fixtures for Executive Actions
 *
 * RCF-E2E-1: Page Object Model integration
 * RCF-E2E-2: Database verification integration
 * RCF-E2E-3: Test data factory integration
 *
 * @rcf-version 2.2.0
 */

import { test as base, expect } from "@playwright/test";

// Page Objects
import {
  AnnouncementsPage,
  ApprovalsPage,
  LoginPage,
  MessagesPage,
  RequestsPage,
} from "./pages";

// Factories
import {
  AnnouncementFactory,
  MessageFactory,
  RejectionReasonFactory,
  RequestFactory,
} from "./factories";

// Database Helper
import { DatabaseHelper, getDbHelper } from "./helpers";

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

// Extended fixture types
type ExecutiveFixtures = {
  // Page Objects (RCF-E2E-1)
  loginPage: LoginPage;
  requestsPage: RequestsPage;
  approvalsPage: ApprovalsPage;
  messagesPage: MessagesPage;
  announcementsPage: AnnouncementsPage;

  // Auth helpers
  loginAsManager: () => Promise<void>;
  loginAsCEO: () => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  logout: () => Promise<void>;

  // Database helper (RCF-E2E-2)
  db: DatabaseHelper;

  // Factories (RCF-E2E-3)
  requestFactory: typeof RequestFactory;
  messageFactory: typeof MessageFactory;
  announcementFactory: typeof AnnouncementFactory;
  rejectionReasonFactory: typeof RejectionReasonFactory;
};

/**
 * Extended test with executive-grade fixtures
 * RCF-E2E: Full POM, DB verification, and factory integration
 */
export const test = base.extend<ExecutiveFixtures>({
  // Page Objects
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  requestsPage: async ({ page }, use) => {
    await use(new RequestsPage(page));
  },

  approvalsPage: async ({ page }, use) => {
    await use(new ApprovalsPage(page));
  },

  messagesPage: async ({ page }, use) => {
    await use(new MessagesPage(page));
  },

  announcementsPage: async ({ page }, use) => {
    await use(new AnnouncementsPage(page));
  },

  // Auth helpers using LoginPage POM
  loginAsManager: async ({ loginPage }, use) => {
    const login = async () => {
      await loginPage.login(
        TEST_USERS.manager.email,
        TEST_USERS.manager.password
      );
    };
    await use(login);
  },

  loginAsCEO: async ({ loginPage }, use) => {
    const login = async () => {
      await loginPage.login(TEST_USERS.ceo.email, TEST_USERS.ceo.password);
    };
    await use(login);
  },

  loginAsAdmin: async ({ loginPage }, use) => {
    const login = async () => {
      await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    };
    await use(login);
  },

  logout: async ({ loginPage }, use) => {
    const logout = async () => {
      await loginPage.logout();
    };
    await use(logout);
  },

  // Database helper for verification
  db: async ({}, use) => {
    const helper = getDbHelper();
    await use(helper);
  },

  // Factories for test data generation
  requestFactory: async ({}, use) => {
    await use(RequestFactory);
  },

  messageFactory: async ({}, use) => {
    await use(MessageFactory);
  },

  announcementFactory: async ({}, use) => {
    await use(AnnouncementFactory);
  },

  rejectionReasonFactory: async ({}, use) => {
    await use(RejectionReasonFactory);
  },
});

export { expect };
