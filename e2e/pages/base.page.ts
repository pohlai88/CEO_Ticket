/**
 * Base Page Object
 * RCF-E2E-1: All Playwright tests MUST use Page Object Model (POM)
 *
 * @rcf-version 2.2.0
 */

import { Locator, Page, expect } from "@playwright/test";

export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for network idle with explicit timeout
   * RCF-E2E-4: No arbitrary sleeps, use network-idle waits
   */
  async waitForNetworkIdle(timeout = 10_000): Promise<void> {
    await this.page.waitForLoadState("networkidle", { timeout });
  }

  /**
   * Wait for API response
   * RCF-E2E-4: Use API response waits instead of arbitrary sleeps
   */
  async waitForAPI(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(
      (resp) =>
        (typeof urlPattern === "string"
          ? resp.url().includes(urlPattern)
          : urlPattern.test(resp.url())) && resp.status() < 400
    );
  }

  /**
   * Assert element is visible with explicit wait
   * RCF-E2E-4: Use expect().toBeVisible() instead of waitForTimeout
   */
  async assertVisible(locator: Locator, timeout = 10_000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  /**
   * Assert element is NOT visible
   */
  async assertNotVisible(locator: Locator, timeout = 5_000): Promise<void> {
    await expect(locator).not.toBeVisible({ timeout });
  }

  /**
   * Get current URL
   */
  get url(): string {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
