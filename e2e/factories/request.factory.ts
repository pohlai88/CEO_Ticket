/**
 * Test Data Factory
 * RCF-E2E-3: Each test MUST own its data - NO shared state
 *
 * @rcf-version 2.2.0
 */

import { randomUUID } from "crypto";
import type { AnnouncementFormData } from "../pages/announcements.page";
import type { MessageFormData } from "../pages/messages.page";
import type { RequestFormData } from "../pages/requests.page";

/**
 * Generate unique test ID for isolation
 * Every test run creates unique data that doesn't conflict with others
 */
export function generateTestId(): string {
  return `e2e-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

/**
 * Request Factory
 * RCF-E2E-3: Generates isolated request data per test
 */
export const RequestFactory = {
  /**
   * Create standard request data
   */
  create(overrides: Partial<RequestFormData> = {}): RequestFormData {
    const testId = generateTestId();
    return {
      title: `Test Request ${testId}`,
      description: `Automated E2E test request created at ${new Date().toISOString()}. Test ID: ${testId}`,
      priorityCode: "P3",
      ...overrides,
    };
  },

  /**
   * Create high-priority request for E07 material change testing
   */
  createHighPriority(
    overrides: Partial<RequestFormData> = {}
  ): RequestFormData {
    return this.create({
      priorityCode: "P1",
      title: `URGENT: Test Request ${generateTestId()}`,
      ...overrides,
    });
  },

  /**
   * Create request specifically for rejection testing
   */
  createForRejection(
    overrides: Partial<RequestFormData> = {}
  ): RequestFormData {
    return this.create({
      title: `Rejection Test ${generateTestId()}`,
      description:
        "This request is intended to be rejected for testing purposes.",
      priorityCode: "P4",
      ...overrides,
    });
  },

  /**
   * Create request specifically for cancellation testing
   */
  createForCancellation(
    overrides: Partial<RequestFormData> = {}
  ): RequestFormData {
    return this.create({
      title: `Cancel Test ${generateTestId()}`,
      description:
        "This request is intended to be cancelled for testing purposes.",
      priorityCode: "P4",
      ...overrides,
    });
  },
};

/**
 * Message Factory
 * RCF-E2E-3: Generates isolated message data per test
 */
export const MessageFactory = {
  /**
   * Create standard executive message
   */
  create(overrides: Partial<MessageFormData> = {}): MessageFormData {
    const testId = generateTestId();
    return {
      subject: `E2E Test Message ${testId}`,
      messageType: "consultation",
      content: `This is an automated E2E test message. Test ID: ${testId}`,
      ...overrides,
    };
  },

  /**
   * Create directive message from CEO
   */
  createDirective(overrides: Partial<MessageFormData> = {}): MessageFormData {
    return this.create({
      messageType: "directive",
      subject: `CEO Directive ${generateTestId()}`,
      content: "This is a test directive from the CEO.",
      ...overrides,
    });
  },

  /**
   * Create escalation message
   */
  createEscalation(overrides: Partial<MessageFormData> = {}): MessageFormData {
    return this.create({
      messageType: "escalation",
      subject: `ESCALATION ${generateTestId()}`,
      content: "This is a test escalation requiring immediate attention.",
      ...overrides,
    });
  },
};

/**
 * Announcement Factory
 * RCF-E2E-3: Generates isolated announcement data per test
 */
export const AnnouncementFactory = {
  /**
   * Create standard announcement
   */
  create(overrides: Partial<AnnouncementFormData> = {}): AnnouncementFormData {
    const testId = generateTestId();
    return {
      title: `E2E Test Announcement ${testId}`,
      content: `This is an automated E2E test announcement. Test ID: ${testId}`,
      type: "info",
      ...overrides,
    };
  },

  /**
   * Create warning announcement
   */
  createWarning(
    overrides: Partial<AnnouncementFormData> = {}
  ): AnnouncementFormData {
    return this.create({
      type: "warning",
      title: `Warning Announcement ${generateTestId()}`,
      content: "This is a test warning announcement.",
      ...overrides,
    });
  },

  /**
   * Create critical announcement
   */
  createCritical(
    overrides: Partial<AnnouncementFormData> = {}
  ): AnnouncementFormData {
    return this.create({
      type: "critical",
      title: `CRITICAL Announcement ${generateTestId()}`,
      content:
        "This is a test critical announcement requiring immediate attention.",
      ...overrides,
    });
  },
};

/**
 * Rejection Reason Factory
 * Generates standard rejection reasons per PRD requirements
 */
export const RejectionReasonFactory = {
  budgetRelated(): string {
    return `Budget constraints for Q1 ${new Date().getFullYear()}. Please resubmit with revised budget allocation in Q2.`;
  },

  priorityMismatch(): string {
    return "Priority level does not match current executive focus areas. Please align with strategic initiatives.";
  },

  insufficientDetail(): string {
    return "Request lacks sufficient detail for executive decision. Please provide comprehensive business case.";
  },

  generic(): string {
    return `Rejected during E2E test at ${new Date().toISOString()}. This is an automated test rejection.`;
  },
};
