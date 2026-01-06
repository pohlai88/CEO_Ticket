/**
 * Requests Page Object
 * RCF-E2E-1: Page Object Model for request management
 *
 * @rcf-version 2.2.0
 */

import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export interface RequestFormData {
  title: string;
  description: string;
  priorityCode: "P1" | "P2" | "P3" | "P4";
  categoryId?: string;
}

export class RequestsPage extends BasePage {
  // List page locators
  readonly requestsList: Locator;
  readonly newRequestButton: Locator;
  readonly statusFilter: Locator;

  // Form locators
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly prioritySelect: Locator;
  readonly categorySelect: Locator;
  readonly submitButton: Locator;

  // Detail page locators
  readonly requestTitle: Locator;
  readonly requestStatus: Locator;
  readonly editButton: Locator;
  readonly cancelButton: Locator;
  readonly resubmitButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);

    // List page
    this.requestsList = page.locator('[data-testid="requests-list"]');
    this.newRequestButton = page.locator('[data-testid="new-request-button"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');

    // Form
    this.titleInput = page.locator('[name="title"]');
    this.descriptionInput = page.locator('[name="description"]');
    this.prioritySelect = page.locator('[name="priority_code"]');
    this.categorySelect = page.locator('[name="category_id"]');
    this.submitButton = page.locator('button[type="submit"]');

    // Detail
    this.requestTitle = page.locator('[data-testid="request-title"]');
    this.requestStatus = page.locator('[data-testid="request-status"]');
    this.editButton = page.locator('[data-testid="edit-button"]');
    this.cancelButton = page.locator('[data-testid="cancel-button"]');
    this.resubmitButton = page.locator('[data-testid="resubmit-button"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
  }

  async gotoList(): Promise<void> {
    await this.page.goto("/requests");
    await this.waitForNetworkIdle();
  }

  async gotoNew(): Promise<void> {
    await this.page.goto("/requests/new");
    await this.waitForNetworkIdle();
  }

  async gotoDetail(requestId: string): Promise<void> {
    await this.page.goto(`/requests/${requestId}`);
    await this.waitForNetworkIdle();
  }

  /**
   * RCF-EXEC-E01: Manager submits request
   * Returns the created request ID
   */
  async submitRequest(data: RequestFormData): Promise<string> {
    await this.gotoNew();

    await this.titleInput.fill(data.title);
    await this.descriptionInput.fill(data.description);
    await this.prioritySelect.selectOption(data.priorityCode);

    if (data.categoryId) {
      await this.categorySelect.selectOption(data.categoryId);
    }

    // Wait for API response on submit
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes("/api/requests") && resp.status() < 400
    );

    await this.submitButton.click();
    const response = await responsePromise;

    // Extract request ID from response or URL
    await this.page.waitForURL(/\/requests/, { timeout: 10_000 });

    const url = this.page.url();
    const match = url.match(/\/requests\/([a-f0-9-]+)/);

    if (match) {
      return match[1];
    }

    // Try to get from response body
    try {
      const body = await response.json();
      if (body.id) return body.id;
    } catch {
      // Response may not be JSON
    }

    throw new Error("Failed to extract request ID after submission");
  }

  /**
   * RCF-EXEC-E06: Manager cancels request
   */
  async cancelRequest(requestId: string): Promise<void> {
    await this.gotoDetail(requestId);
    await this.cancelButton.click();

    // Confirm cancellation if dialog appears
    const confirmButton = this.page.locator(
      '[data-testid="confirm-cancel-button"]'
    );
    if (await confirmButton.isVisible({ timeout: 2_000 })) {
      await confirmButton.click();
    }

    await this.waitForNetworkIdle();
  }

  /**
   * RCF-EXEC-E05: Manager resubmits after rejection
   */
  async resubmitRequest(requestId: string): Promise<void> {
    await this.gotoDetail(requestId);
    await this.resubmitButton.click();
    await this.submitButton.click();
    await this.waitForNetworkIdle();
  }

  /**
   * Edit request (for material change testing)
   */
  async editRequest(
    requestId: string,
    updates: Partial<RequestFormData>
  ): Promise<void> {
    await this.gotoDetail(requestId);
    await this.editButton.click();

    if (updates.title) {
      await this.titleInput.fill(updates.title);
    }
    if (updates.description) {
      await this.descriptionInput.fill(updates.description);
    }
    if (updates.priorityCode) {
      await this.prioritySelect.selectOption(updates.priorityCode);
    }

    await this.submitButton.click();
    await this.waitForNetworkIdle();
  }

  async filterByStatus(
    status: "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED"
  ): Promise<void> {
    await this.gotoList();
    await this.statusFilter.selectOption(status);
    await this.waitForNetworkIdle();
  }

  async expectStatus(expectedStatus: string): Promise<void> {
    await expect(this.requestStatus).toContainText(expectedStatus, {
      ignoreCase: true,
    });
  }

  getRequestRowByTitle(title: string): Locator {
    return this.page.locator(`[data-testid="request-row"]`, { hasText: title });
  }
}
