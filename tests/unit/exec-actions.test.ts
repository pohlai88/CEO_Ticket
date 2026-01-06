/**
 * Executive Action Matrix Validation Unit Tests
 *
 * Tests the validate-exec-actions.ts script exports.
 * Ensures all 15 executive actions are defined.
 *
 * @rcf-version 2.2.0
 */

import {
  EXECUTIVE_ACTIONS,
  validateExecutiveActionMatrix,
} from "@/scripts/validate-exec-actions";
import { describe, expect, it } from "vitest";

describe("Executive Action Matrix (RCF-12)", () => {
  describe("EXECUTIVE_ACTIONS constant", () => {
    it("has exactly 15 actions", () => {
      expect(EXECUTIVE_ACTIONS).toHaveLength(15);
    });

    it("has sequential IDs from E01 to E15", () => {
      for (let i = 0; i < 15; i++) {
        const expectedId = `E${(i + 1).toString().padStart(2, "0")}`;
        expect(EXECUTIVE_ACTIONS[i].id).toBe(expectedId);
      }
    });

    it("all actions have required properties", () => {
      for (const action of EXECUTIVE_ACTIONS) {
        expect(action.id).toBeTruthy();
        expect(action.capability).toBeTruthy();
        expect(action.actor).toBeTruthy();
        expect(action.endpoint).toBeTruthy();
        expect(action.expectedOutcome).toBeTruthy();
        // auditAction can be null for read-only operations
      }
    });
  });

  describe("validateExecutiveActionMatrix()", () => {
    it("validates successfully", () => {
      const result = validateExecutiveActionMatrix();
      expect(result.valid).toBe(true);
      expect(result.total).toBe(15);
      expect(result.actions).toBe(EXECUTIVE_ACTIONS);
    });
  });

  describe("Action Coverage", () => {
    const actionCapabilities = EXECUTIVE_ACTIONS.map((a) => a.capability);

    it("includes request submission (E01)", () => {
      expect(actionCapabilities).toContain("Submit request");
    });

    it("includes CEO approval (E03)", () => {
      expect(actionCapabilities).toContain("Approve request");
    });

    it("includes CEO rejection (E04)", () => {
      expect(actionCapabilities).toContain("Reject request");
    });

    it("includes resubmit after rejection (E05)", () => {
      expect(actionCapabilities).toContain("Resubmit after rejection");
    });

    it("includes executive messages (E07, E08)", () => {
      expect(actionCapabilities).toContain("Send executive message");
      expect(actionCapabilities).toContain("Respond to message");
    });

    it("includes announcements (E09, E10)", () => {
      expect(actionCapabilities).toContain("Publish announcement");
      expect(actionCapabilities).toContain("Track announcement reads");
    });

    it("includes audit trail verification (E15)", () => {
      expect(actionCapabilities).toContain("Audit trail complete");
    });
  });

  describe("Actor Coverage", () => {
    const actors = EXECUTIVE_ACTIONS.map((a) => a.actor);

    it("includes MANAGER actions", () => {
      expect(
        actors.filter((a) => a === "MANAGER" || a.includes("MANAGER"))
      ).not.toHaveLength(0);
    });

    it("includes CEO actions", () => {
      expect(
        actors.filter((a) => a === "CEO" || a.includes("CEO"))
      ).not.toHaveLength(0);
    });

    it("includes SYSTEM actions", () => {
      expect(actors.filter((a) => a === "SYSTEM")).not.toHaveLength(0);
    });
  });
});
