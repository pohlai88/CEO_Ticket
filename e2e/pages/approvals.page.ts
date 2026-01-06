/**
 * Approvals Page Object
 * RCF-E2E-1: Page Object Model for CEO approval workflow
 *
 * @rcf-version 2.2.0
 */

import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class ApprovalsPage extends BasePage {
  // List page locators
  readonly approvalsList: Locator;
  readonly pendingTab: Locator;
  readonly approvedTab: Locator;
  readonly rejectedTab: Locator;

  // Detail page locators
  readonly requestTitle: Locator;
  readonly requestDescription: Locator;
  readonly requestPriority: Locator;
  readonly requestStatus: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly startReviewButton: Locator;

  // Decision form locators
  readonly notesInput: Locator;
  readonly rejectionReasonInput: Locator;
  readonly confirmApprovalButton: Locator;
  readonly confirmRejectionButton: Locator;

  // Status indicators
  readonly approvedBadge: Locator;
  readonly rejectedBadge: Locator;
  readonly rejectionReasonDisplay: Locator;

  constructor(page: Page) {
    super(page);

    // List
    this.approvalsList = page.locator('[data-testid="approvals-list"]');
    this.pendingTab = page.locator('[data-testid="pending-tab"]');
    this.approvedTab = page.locator('[data-testid="approved-tab"]');
    this.rejectedTab = page.locator('[data-testid="rejected-tab"]');

    // Detail
    this.requestTitle = page.locator('[data-testid="request-title"]');
    this.requestDescription = page.locator(
      '[data-testid="request-description"]'
    );
    this.requestPriority = page.locator('[data-testid="request-priority"]');
    this.requestStatus = page.locator('[data-testid="request-status"]');
    this.approveButton = page.locator('[data-testid="approve-button"]');
    this.rejectButton = page.locator('[data-testid="reject-button"]');
    this.startReviewButton = page.locator(
      '[data-testid="start-review-button"]'
    );

    // Decision form
    this.notesInput = page.locator('[name="notes"]');
    this.rejectionReasonInput = page.locator('[name="rejection_reason"]');
    this.confirmApprovalButton = page.locator(
      '[data-testid="confirm-approval"]'
    );
    this.confirmRejectionButton = page.locator(
      '[data-testid="confirm-rejection"]'
    );

    // Status
    this.approvedBadge = page.locator("text=Approved");
    this.rejectedBadge = page.locator("text=Rejected");
    this.rejectionReasonDisplay = page.locator(
      '[data-testid="rejection-reason"]'
    );
  }

  async gotoList(): Promise<void> {
    await this.page.goto("/approvals");
    await this.waitForNetworkIdle();
  }

  async gotoDetail(requestId: string): Promise<void> {
    await this.page.goto(`/approvals/${requestId}`);
    await this.waitForNetworkIdle();
  }

  /**
   * RCF-EXEC-E02: CEO views pending approvals
   */
  async viewPendingApprovals(): Promise<void> {
    await this.gotoList();
    await this.pendingTab.click();
    await this.waitForNetworkIdle();
  }

  /**
   * RCF-EXEC-E03: CEO approves request
   */
  async approveRequest(requestId: string, notes?: string): Promise<void> {
    await this.gotoDetail(requestId);

    await this.approveButton.click();

    if (notes && (await this.notesInput.isVisible({ timeout: 2_000 }))) {
      await this.notesInput.fill(notes);
    }

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/approvals") &&
        resp.request().method() === "POST" &&
        resp.status() < 400
    );

    await this.confirmApprovalButton.click();
    await responsePromise;
    await this.waitForNetworkIdle();
  }

  /**
   * RCF-EXEC-E04: CEO rejects request
   * Rejection reason is MANDATORY per PRD
   */
  async rejectRequest(requestId: string, reason: string): Promise<void> {
    await this.gotoDetail(requestId);

    await this.rejectButton.click();
    await this.rejectionReasonInput.fill(reason);

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/approvals") &&
        resp.request().method() === "POST" &&
        resp.status() < 400
    );

    await this.confirmRejectionButton.click();
    await responsePromise;
    await this.waitForNetworkIdle();
  }

  async expectApproved(): Promise<void> {
    await this.assertVisible(this.approvedBadge);
  }

  async expectRejected(): Promise<void> {
    await this.assertVisible(this.rejectedBadge);
  }

  async expectRejectionReason(reason: string): Promise<void> {
    await expect(this.rejectionReasonDisplay).toContainText(reason);
  }

  /**
   * Check that approval buttons are NOT visible (for role verification)
   */
  async expectNoApprovalButtons(): Promise<void> {
    await this.assertNotVisible(this.approveButton);
    await this.assertNotVisible(this.rejectButton);
  }

  getRequestRowByTitle(title: string): Locator {
    return this.page.locator(`[data-testid="approval-row"]`, {
      hasText: title,
    });
  }
}
