/**
 * Messages Page Object
 * RCF-E2E-1: Page Object Model for executive messaging
 *
 * @rcf-version 2.2.0
 */

import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page";

export interface MessageFormData {
  subject: string;
  messageType: "consultation" | "directive" | "escalation" | "response";
  content: string;
}

export class MessagesPage extends BasePage {
  // Inbox locators
  readonly messagesList: Locator;
  readonly unreadTab: Locator;
  readonly allTab: Locator;
  readonly composeButton: Locator;

  // Compose form locators
  readonly subjectInput: Locator;
  readonly messageTypeSelect: Locator;
  readonly contentInput: Locator;
  readonly sendButton: Locator;

  // Message detail locators
  readonly messageSubject: Locator;
  readonly messageContent: Locator;
  readonly replyInput: Locator;
  readonly sendReplyButton: Locator;

  // Status indicators
  readonly sentConfirmation: Locator;
  readonly replySentConfirmation: Locator;

  constructor(page: Page) {
    super(page);

    // Inbox
    this.messagesList = page.locator('[data-testid="messages-list"]');
    this.unreadTab = page.locator('[data-testid="unread-tab"]');
    this.allTab = page.locator('[data-testid="all-tab"]');
    this.composeButton = page.locator('[data-testid="compose-button"]');

    // Compose
    this.subjectInput = page.locator('[name="subject"]');
    this.messageTypeSelect = page.locator('[name="message_type"]');
    this.contentInput = page.locator('[name="content"]');
    this.sendButton = page.locator('button[type="submit"]');

    // Detail
    this.messageSubject = page.locator('[data-testid="message-subject"]');
    this.messageContent = page.locator('[data-testid="message-content"]');
    this.replyInput = page.locator('[name="reply_content"]');
    this.sendReplyButton = page.locator('[data-testid="send-reply-button"]');

    // Status
    this.sentConfirmation = page.locator("text=Message sent");
    this.replySentConfirmation = page.locator("text=Reply sent");
  }

  async gotoInbox(): Promise<void> {
    await this.page.goto("/messages");
    await this.waitForNetworkIdle();
  }

  async gotoCompose(): Promise<void> {
    await this.page.goto("/messages/send");
    await this.waitForNetworkIdle();
  }

  /**
   * RCF-EXEC-E07: Manager/CEO sends executive message
   */
  async sendMessage(data: MessageFormData): Promise<void> {
    await this.gotoCompose();

    await this.subjectInput.fill(data.subject);
    await this.messageTypeSelect.selectOption(data.messageType);
    await this.contentInput.fill(data.content);

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/messages") &&
        resp.request().method() === "POST" &&
        resp.status() < 400
    );

    await this.sendButton.click();
    await responsePromise;
    await this.waitForNetworkIdle();
  }

  /**
   * RCF-EXEC-E08: CEO responds to message
   */
  async replyToMessage(messageId: string, replyContent: string): Promise<void> {
    await this.page.goto(`/messages/${messageId}`);
    await this.waitForNetworkIdle();

    await this.replyInput.fill(replyContent);

    // Wait for API response
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/messages") &&
        resp.request().method() === "POST" &&
        resp.status() < 400
    );

    await this.sendReplyButton.click();
    await responsePromise;
    await this.waitForNetworkIdle();
  }

  async expectMessageSent(): Promise<void> {
    await this.assertVisible(this.sentConfirmation);
  }

  async expectReplySent(): Promise<void> {
    await this.assertVisible(this.replySentConfirmation);
  }

  getMessageBySubject(subject: string): Locator {
    return this.page.locator(`[data-testid="message-item"]`, {
      hasText: subject,
    });
  }
}
