/**
 * Material changes are edits that invalidate an active approval.
 * These fields, when changed after submission, require a new approval round.
 * 
 * Non-material changes (e.g., watchers, description tweaks) do not invalidate.
 */

export const MATERIAL_CHANGE_FIELDS = ['title', 'priority_code', 'category_id'];

export function isMaterialChange(oldValues: Record<string, unknown>, newValues: Record<string, unknown>): boolean {
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
export function getChangedFields(oldValues: Record<string, unknown>, newValues: Record<string, unknown>): string[] {
  return Object.keys(newValues).filter(key => oldValues[key] !== newValues[key]);
}
