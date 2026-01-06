/**
 * State Machine Unit Tests
 *
 * Tests the FSM transitions defined in RCF-4.
 * Every allowed/forbidden transition is verified.
 *
 * @rcf-version 2.2.0
 */

import {
  isValidStatusTransition,
  RequestPrioritySchema,
  RequestStatusSchema,
  type RequestStatus,
} from "@/lib/state-machine";
import { describe, expect, it } from "vitest";

describe("FSM Status Transitions (RCF-4)", () => {
  // Define the FSM from PRD
  const FSM: Record<RequestStatus, RequestStatus[]> = {
    DRAFT: ["SUBMITTED", "CANCELLED"],
    SUBMITTED: ["IN_REVIEW", "CANCELLED"],
    IN_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["CLOSED"],
    REJECTED: ["SUBMITTED"],
    CANCELLED: [],
    CLOSED: [],
  };

  describe("Allowed Transitions", () => {
    it("DRAFT → SUBMITTED (manager submits)", () => {
      expect(isValidStatusTransition("DRAFT", "SUBMITTED")).toBe(true);
    });

    it("DRAFT → CANCELLED (manager cancels draft)", () => {
      expect(isValidStatusTransition("DRAFT", "CANCELLED")).toBe(true);
    });

    it("SUBMITTED → IN_REVIEW (CEO starts review)", () => {
      expect(isValidStatusTransition("SUBMITTED", "IN_REVIEW")).toBe(true);
    });

    it("SUBMITTED → CANCELLED (withdrawn)", () => {
      expect(isValidStatusTransition("SUBMITTED", "CANCELLED")).toBe(true);
    });

    it("IN_REVIEW → APPROVED (CEO approves)", () => {
      expect(isValidStatusTransition("IN_REVIEW", "APPROVED")).toBe(true);
    });

    it("IN_REVIEW → REJECTED (CEO rejects)", () => {
      expect(isValidStatusTransition("IN_REVIEW", "REJECTED")).toBe(true);
    });

    it("IN_REVIEW → CANCELLED (withdrawn during review)", () => {
      expect(isValidStatusTransition("IN_REVIEW", "CANCELLED")).toBe(true);
    });

    it("APPROVED → CLOSED (archived)", () => {
      expect(isValidStatusTransition("APPROVED", "CLOSED")).toBe(true);
    });

    it("REJECTED → SUBMITTED (resubmit after rejection)", () => {
      expect(isValidStatusTransition("REJECTED", "SUBMITTED")).toBe(true);
    });
  });

  describe("Forbidden Transitions (Terminal States)", () => {
    it("CANCELLED cannot transition to anything", () => {
      const allStatuses: RequestStatus[] = [
        "DRAFT",
        "SUBMITTED",
        "IN_REVIEW",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "CLOSED",
      ];
      for (const status of allStatuses) {
        expect(isValidStatusTransition("CANCELLED", status)).toBe(false);
      }
    });

    it("CLOSED cannot transition to anything", () => {
      const allStatuses: RequestStatus[] = [
        "DRAFT",
        "SUBMITTED",
        "IN_REVIEW",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "CLOSED",
      ];
      for (const status of allStatuses) {
        expect(isValidStatusTransition("CLOSED", status)).toBe(false);
      }
    });
  });

  describe("Forbidden Transitions (Invalid Paths)", () => {
    it("DRAFT cannot directly go to APPROVED", () => {
      expect(isValidStatusTransition("DRAFT", "APPROVED")).toBe(false);
    });

    it("DRAFT cannot directly go to REJECTED", () => {
      expect(isValidStatusTransition("DRAFT", "REJECTED")).toBe(false);
    });

    it("DRAFT cannot directly go to CLOSED", () => {
      expect(isValidStatusTransition("DRAFT", "CLOSED")).toBe(false);
    });

    it("SUBMITTED cannot directly go to APPROVED (must go through IN_REVIEW)", () => {
      expect(isValidStatusTransition("SUBMITTED", "APPROVED")).toBe(false);
    });

    it("SUBMITTED cannot directly go to REJECTED (must go through IN_REVIEW)", () => {
      expect(isValidStatusTransition("SUBMITTED", "REJECTED")).toBe(false);
    });

    it("APPROVED cannot go back to IN_REVIEW", () => {
      expect(isValidStatusTransition("APPROVED", "IN_REVIEW")).toBe(false);
    });

    it("REJECTED cannot directly go to APPROVED (must resubmit)", () => {
      expect(isValidStatusTransition("REJECTED", "APPROVED")).toBe(false);
    });
  });

  describe("Complete FSM Coverage", () => {
    it("verifies all transitions match PRD FSM definition", () => {
      const allStatuses: RequestStatus[] = [
        "DRAFT",
        "SUBMITTED",
        "IN_REVIEW",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "CLOSED",
      ];

      for (const from of allStatuses) {
        for (const to of allStatuses) {
          const expected = FSM[from].includes(to);
          const actual = isValidStatusTransition(from, to);
          expect(actual).toBe(expected);
        }
      }
    });
  });
});

describe("Status Schema Validation", () => {
  it("accepts all valid statuses", () => {
    const validStatuses = [
      "DRAFT",
      "SUBMITTED",
      "IN_REVIEW",
      "APPROVED",
      "REJECTED",
      "CANCELLED",
      "CLOSED",
    ];
    for (const status of validStatuses) {
      expect(() => RequestStatusSchema.parse(status)).not.toThrow();
    }
  });

  it("rejects invalid statuses", () => {
    const invalidStatuses = [
      "PENDING",
      "ACTIVE",
      "DONE",
      "draft",
      "approved",
      "",
    ];
    for (const status of invalidStatuses) {
      expect(() => RequestStatusSchema.parse(status)).toThrow();
    }
  });
});

describe("Priority Schema Validation", () => {
  it("accepts P1-P5", () => {
    const validPriorities = ["P1", "P2", "P3", "P4", "P5"];
    for (const priority of validPriorities) {
      expect(() => RequestPrioritySchema.parse(priority)).not.toThrow();
    }
  });

  it("rejects invalid priorities", () => {
    const invalidPriorities = ["P0", "P6", "HIGH", "LOW", "1", "p1"];
    for (const priority of invalidPriorities) {
      expect(() => RequestPrioritySchema.parse(priority)).toThrow();
    }
  });
});
