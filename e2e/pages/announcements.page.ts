/**
 * Announcements Page Object
 * RCF-E2E-1: Page Object Model for executive announcements
 *
 * @rcf-version 2.2.0
 */

import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export interface AnnouncementFormData {
  title: string;
  content: string;
  type: "info" | "warning" | "critical";
  expiresAt?: string;
}

export class AnnouncementsPage extends BasePage {
  // List locators
  readonly announcementsList: Locator;
  readonly announcementBanner: Locator;
  readonly createButton: Locator;

  // Create form locators
  readonly titleInput: Locator;
  readonly contentInput: Locator;
  readonly typeSelect: Locator;
  readonly expiresInput: Locator;
  readonly publishButton: Locator;

  // Detail/item locators
  readonly announcementItem: Locator;
  readonly readIndicator: Locator;

  // Status indicators
  readonly publishedConfirmation: Locator;

  constructor(page: Page) {
    super(page);

    // List
    this.announcementsList = page.locator('[data-testid="announcement-list"]');
    this.announcementBanner = page.locator(
      '[data-testid="announcement-banner"]'
    );
    this.createButton = page.locator(
      '[data-testid="create-announcement-button"]'
    );

    // Form
    this.titleInput = page.locator('[name="title"]');
    this.contentInput = page.locator('[name="content"]');
    this.typeSelect = page.locator('[name="type"]');
    this.expiresInput = page.locator('[name="expires_at"]');
    this.publishButton = page.locator('button[type="submit"]');

    // Items
    this.announcementItem = page.locator('[data-testid="announcement-item"]');
    this.readIndicator = page.locator('[data-testid="read-indicator"]');

    // Status
    this.publishedConfirmation = page.locator("text=Announcement published");
  }

  async gotoList(): Promise<void> {
    await this.page.goto("/announcements");
    await this.waitForNetworkIdle();
  }

  async gotoCreate(): Promise<void> {
    await this.page.goto("/announcements/create");
    await this.waitForNetworkIdle();
  }

  /**
   * RCF-EXEC-E09: Admin/CEO publishes announcement
   */
  async publishAnnouncement(data: AnnouncementFormData): Promise<void> {
    await this.gotoCreate();

    await this.titleInput.fill(data.title);
    await this.contentInput.fill(data.content);
    await this.typeSelect.selectOption(data.type);

    if (data.expiresAt) {
      await this.expiresInput.fill(data.expiresAt);
    }

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/announcements") &&
        resp.request().method() === "POST" &&
        resp.status() < 400
    );

    await this.publishButton.click();
    await responsePromise;
    await this.waitForNetworkIdle();
  }

  async expectPublished(): Promise<void> {
    await this.assertVisible(this.publishedConfirmation);
  }

  /**
   * RCF-EXEC-E10: Track announcement reads
   * Click on announcement to mark as read
   */
  async markAsRead(announcementTitle: string): Promise<void> {
    await this.gotoList();

    const announcement = this.page.locator(
      '[data-testid="announcement-item"]',
      {
        hasText: announcementTitle,
      }
    );

    await announcement.click();
    await this.waitForNetworkIdle();
  }

  async expectReadIndicator(): Promise<void> {
    await this.assertVisible(this.readIndicator);
  }

  /**
   * Check announcement is visible on dashboard
   */
  async expectAnnouncementOnDashboard(title: string): Promise<void> {
    await this.page.goto("/dashboard");
    await this.waitForNetworkIdle();

    const announcement = this.page
      .locator('[data-testid="announcement-banner"]', {
        hasText: title,
      })
      .or(
        this.page.locator('[data-testid="announcement-list"]', {
          hasText: title,
        })
      );

    await expect(announcement).toBeVisible();
  }
}
