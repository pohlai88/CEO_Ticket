/**
 * Material Changes Unit Tests
 *
 * Tests RCF-5 approval invalidation logic.
 * Material edits to title/description/priority/category invalidate approvals.
 *
 * @rcf-version 2.2.0
 */

import {
  getChangedFields,
  isMaterialChange,
  MATERIAL_CHANGE_FIELDS,
} from "@/lib/constants/material-changes";
import { describe, expect, it } from "vitest";

describe("Material Change Detection (RCF-5)", () => {
  describe("MATERIAL_CHANGE_FIELDS constant", () => {
    it("contains exactly the fields defined in PRD", () => {
      expect(MATERIAL_CHANGE_FIELDS).toContain("title");
      expect(MATERIAL_CHANGE_FIELDS).toContain("description");
      expect(MATERIAL_CHANGE_FIELDS).toContain("priority_code");
      expect(MATERIAL_CHANGE_FIELDS).toContain("category_id");
      expect(MATERIAL_CHANGE_FIELDS).toHaveLength(4);
    });
  });

  describe("isMaterialChange()", () => {
    describe("Material Changes (should return true)", () => {
      it("detects title change", () => {
        const old = {
          title: "Old title",
          description: null,
          priority_code: "P3",
          category_id: null,
        };
        const updated = {
          title: "New title",
          description: null,
          priority_code: "P3",
          category_id: null,
        };
        expect(isMaterialChange(old, updated)).toBe(true);
      });

      it("detects description change", () => {
        const old = {
          title: "Title",
          description: "Old description",
          priority_code: "P3",
          category_id: null,
        };
        const updated = {
          title: "Title",
          description: "New description",
          priority_code: "P3",
          category_id: null,
        };
        expect(isMaterialChange(old, updated)).toBe(true);
      });

      it("detects priority_code change", () => {
        const old = {
          title: "Title",
          description: null,
          priority_code: "P3",
          category_id: null,
        };
        const updated = {
          title: "Title",
          description: null,
          priority_code: "P1",
          category_id: null,
        };
        expect(isMaterialChange(old, updated)).toBe(true);
      });

      it("detects category_id change", () => {
        const old = {
          title: "Title",
          description: null,
          priority_code: "P3",
          category_id: null,
        };
        const updated = {
          title: "Title",
          description: null,
          priority_code: "P3",
          category_id: "uuid-123",
        };
        expect(isMaterialChange(old, updated)).toBe(true);
      });

      it("detects description change from null to value", () => {
        const old = {
          title: "Title",
          description: null,
          priority_code: "P3",
          category_id: null,
        };
        const updated = {
          title: "Title",
          description: "Now has description",
          priority_code: "P3",
          category_id: null,
        };
        expect(isMaterialChange(old, updated)).toBe(true);
      });

      it("detects description change from value to null", () => {
        const old = {
          title: "Title",
          description: "Has description",
          priority_code: "P3",
          category_id: null,
        };
        const updated = {
          title: "Title",
          description: null,
          priority_code: "P3",
          category_id: null,
        };
        expect(isMaterialChange(old, updated)).toBe(true);
      });
    });

    describe("Non-Material Changes (should return false)", () => {
      it("returns false when no changes", () => {
        const old = {
          title: "Title",
          description: "Desc",
          priority_code: "P3",
          category_id: "uuid-123",
        };
        const updated = {
          title: "Title",
          description: "Desc",
          priority_code: "P3",
          category_id: "uuid-123",
        };
        expect(isMaterialChange(old, updated)).toBe(false);
      });

      it("returns false when only non-material fields change", () => {
        const old = {
          title: "Title",
          description: null,
          priority_code: "P3",
          category_id: null,
          watchers: [],
        };
        const updated = {
          title: "Title",
          description: null,
          priority_code: "P3",
          category_id: null,
          watchers: ["user-1"],
        };
        expect(isMaterialChange(old, updated)).toBe(false);
      });
    });
  });

  describe("getChangedFields()", () => {
    it("returns empty array when no changes", () => {
      const old = { title: "Title", priority_code: "P3" };
      const updated = { title: "Title", priority_code: "P3" };
      expect(getChangedFields(old, updated)).toEqual([]);
    });

    it("returns changed field names", () => {
      const old = { title: "Old", priority_code: "P3" };
      const updated = { title: "New", priority_code: "P1" };
      const changed = getChangedFields(old, updated);
      expect(changed).toContain("title");
      expect(changed).toContain("priority_code");
    });

    it("only returns fields present in newValues", () => {
      const old = { title: "Old", description: "Desc", priority_code: "P3" };
      const updated = { title: "New" };
      const changed = getChangedFields(old, updated);
      expect(changed).toEqual(["title"]);
    });
  });
});
