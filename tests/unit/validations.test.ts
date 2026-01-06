/**
 * Request Validation Schema Unit Tests
 *
 * Tests Zod schemas for request creation/update.
 *
 * @rcf-version 2.2.0
 */

import {
  createRequestSchema,
  transitionStatusSchema,
} from "@/lib/validations/request";
import { describe, expect, it } from "vitest";

describe("createRequestSchema", () => {
  describe("Valid Inputs", () => {
    it("accepts minimal valid request", () => {
      const input = {
        title: "Approve Q2 budget",
        priority_code: "P3",
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts full valid request", () => {
      const input = {
        title: "Hire senior engineer for platform team",
        description:
          "We need to expand the platform team to handle increased workload.",
        priority_code: "P2",
        category_id: "550e8400-e29b-41d4-a716-446655440000",
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts null description", () => {
      const input = {
        title: "Quick approval needed",
        description: null,
        priority_code: "P1",
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts null category_id", () => {
      const input = {
        title: "Uncategorized request",
        priority_code: "P4",
        category_id: null,
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("trims whitespace from title", () => {
      const input = {
        title: "  Approve budget  ",
        priority_code: "P3",
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Approve budget");
      }
    });
  });

  describe("Invalid Inputs", () => {
    it("rejects title shorter than 3 characters", () => {
      const input = {
        title: "Ab",
        priority_code: "P3",
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects title longer than 200 characters", () => {
      const input = {
        title: "A".repeat(201),
        priority_code: "P3",
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects missing title", () => {
      const input = {
        priority_code: "P3",
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects missing priority_code", () => {
      const input = {
        title: "Valid title",
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid priority_code", () => {
      const input = {
        title: "Valid title",
        priority_code: "HIGH",
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid category_id (not UUID)", () => {
      const input = {
        title: "Valid title",
        priority_code: "P3",
        category_id: "not-a-uuid",
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects description exceeding 10000 characters", () => {
      const input = {
        title: "Valid title",
        priority_code: "P3",
        description: "A".repeat(10001),
      };
      const result = createRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("transitionStatusSchema", () => {
  describe("Valid Inputs", () => {
    it("accepts valid status transition", () => {
      const input = {
        target_status: "SUBMITTED",
      };
      const result = transitionStatusSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts transition with notes", () => {
      const input = {
        target_status: "REJECTED",
        notes: "Budget not approved for this quarter. Please resubmit in Q3.",
      };
      const result = transitionStatusSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts all valid target statuses", () => {
      const validStatuses = [
        "SUBMITTED",
        "IN_REVIEW",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "CLOSED",
      ];
      for (const status of validStatuses) {
        const result = transitionStatusSchema.safeParse({
          target_status: status,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Invalid Inputs", () => {
    it("rejects DRAFT as target (cannot transition to DRAFT)", () => {
      const input = {
        target_status: "DRAFT",
      };
      const result = transitionStatusSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", () => {
      const input = {
        target_status: "PENDING",
      };
      const result = transitionStatusSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects notes exceeding 5000 characters", () => {
      const input = {
        target_status: "APPROVED",
        notes: "A".repeat(5001),
      };
      const result = transitionStatusSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
