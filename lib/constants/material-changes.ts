/**
 * Material changes are edits that invalidate an active approval.
 * These fields, when changed after submission, require a new approval round.
 *
 * Non-material changes (e.g., watchers) do not invalidate.
 *
 * @derived-from prd-guard/canonical.ts
 * @rcf-version 2.2.0
 */

// Import from status.ts which is the local source of truth
import { MATERIAL_CHANGE_FIELDS } from "./status";

// Re-export for convenience
export { MATERIAL_CHANGE_FIELDS };

export function isMaterialChange(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): boolean {
  for (const field of MATERIAL_CHANGE_FIELDS) {
    if (oldValues[field] !== newValues[field]) {
      return true;
    }
  }
  return false;
}

/**
 * Gets list of changed fields between old and new values
 */
export function getChangedFields(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): string[] {
  return Object.keys(newValues).filter(
    (key) => oldValues[key] !== newValues[key]
  );
}
