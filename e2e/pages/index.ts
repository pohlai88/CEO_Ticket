/**
 * Page Object Model Index
 * RCF-E2E-1: Centralized POM exports
 *
 * Architecture:
 * - PRD_GUARD provides abstract base classes: BasePage, BaseLoginPage
 * - CEO_Ticket extends with project-specific implementations
 *
 * @see prd-guard/e2e for reusable governance patterns
 * @rcf-version 2.2.0
 */

export {
  AnnouncementsPage,
  type AnnouncementFormData,
} from "./announcements.page";
export { ApprovalsPage } from "./approvals.page";
export { BasePage } from "./base.page";
export { LoginPage } from "./login.page";
export { MessagesPage, type MessageFormData } from "./messages.page";
export { RequestsPage, type RequestFormData } from "./requests.page";
