/**
 * Login Page Object
 * RCF-E2E-1: Page Object Model for authentication
 *
 * @rcf-version 2.2.0
 */

import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
  // Locators - centralized, no inline selectors in tests
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('[name="email"]');
    this.passwordInput = page.locator('[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="auth-error"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');
  }

  async goto(): Promise<void> {
    await this.page.goto("/auth/login");
    await this.waitForNetworkIdle();
  }

  async login(email: string, password: string): Promise<void> {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForURL("/dashboard", { timeout: 15_000 });
    await this.waitForNetworkIdle();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL("/auth/login", { timeout: 10_000 });
  }

  async expectLoginError(): Promise<void> {
    await this.assertVisible(this.errorMessage);
  }
}
