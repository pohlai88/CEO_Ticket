/**
 * Factory Index
 * RCF-E2E-3: Centralized test data factory exports
 *
 * Architecture:
 * - PRD_GUARD provides: createFactory, FactoryUtils, generateTestId
 * - CEO_Ticket provides: Project-specific factories using those primitives
 *
 * @see prd-guard/e2e for reusable factory patterns
 * @rcf-version 2.2.0
 */

export {
  AnnouncementFactory,
  MessageFactory,
  RejectionReasonFactory,
  RequestFactory,
  generateTestId,
} from "./request.factory";
