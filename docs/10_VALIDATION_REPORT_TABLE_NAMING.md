# 🔴 CRITICAL: Table Naming Validation Report

**Generated:** 2026-01-05  
**Status:** ❌ FAILED - Major Schema/Code Mismatch

---

## Executive Summary

The codebase expects **`ceo_` prefixed tables** (per ad-hoc shared instance requirements), but the SQL schema defines tables **WITHOUT the prefix**. This creates runtime failures when the application tries to query tables that don't exist.

---

## Schema vs Code Mismatch Matrix

| Entity | Schema Name | Code Expects | Status |
|--------|-------------|-------------|--------|
| Organizations | `organizations` | `ceo_organizations` | ❌ MISMATCH |
| Users | `users` | `ceo_users` | ❌ MISMATCH |
| Config | `ceo_config` | `ceo_config` | ✅ MATCH |
| Categories | `categories` | `ceo_categories` | ❌ MISMATCH |
| Requests | `requests` | `ceo_requests` | ❌ MISMATCH |
| Approvals | `approvals` | `ceo_request_approvals` | ❌ MISMATCH |
| Request Watchers | `request_watchers` | `ceo_request_watchers` | ❌ MISMATCH |
| Comments | `request_comments` | `ceo_request_comments` | ❌ MISMATCH |
| Attachments | `request_attachments` | `ceo_request_attachments` | ❌ MISMATCH |
| Announcements | `announcements` | `ceo_announcements` | ❌ MISMATCH |
| Announcement Reads | `announcement_reads` | `ceo_announcement_reads` | ❌ MISMATCH |
| Executive Messages | `executive_messages` | `ceo_executive_messages` | ❌ MISMATCH |
| Message Reads | `executive_message_reads` | `ceo_executive_message_reads` | ❌ MISMATCH |
| Audit Logs | `audit_logs` | `ceo_audit_logs` | ❌ MISMATCH |
| Notification Log | `notification_log` | `ceo_notification_log` | ❌ MISMATCH |
| Reason Codes | `ref_reason_codes` | `ceo_ref_reason_codes` | ❌ MISMATCH |

**Result:** 15 mismatches out of 16 tables

---

## Code Files Affected (Will Fail at Runtime)

### Phase 2 (Auth) - 7 References
- `lib/auth/bootstrap.ts` — ceo_users, ceo_organizations, ceo_config
- `app/api/admin/invite/route.ts` — ceo_users
- `app/page.tsx` — ceo_users
- `app/dashboard/page.tsx` — ceo_users, ceo_organizations
- `app/onboarding/page.tsx` — ceo_users, ceo_announcements

### Phase 3 (Requests) - 18 References
- `app/api/requests/route.ts` — ceo_users (2x), ceo_requests (2x)
- `app/api/requests/[id]/route.ts` — ceo_users (4x), ceo_requests (3x), ceo_request_approvals (1x)

### Audit Logging - 1 Reference
- `lib/supabase/server.ts` — Uses `audit_logs` (correct, already unprefixed)

---

## Solution

**OPTION A: Update Schema to Use `ceo_` Prefix (RECOMMENDED)**
- Aligns with shared instance requirements
- Matches current codebase expectations
- All tables get prefix for consistency

**OPTION B: Update Code to Use Unprefixed Tables**
- Requires updating 24+ code references
- Goes against shared instance isolation principle
- Higher risk of conflicts in future

---

## Recommendation

✅ **Proceed with OPTION A** — Update schema to prefix all tables with `ceo_`.

This ensures:
1. Code works as written
2. Tables are isolated on shared instance
3. Future tenants won't collide with naming
4. Follows established ceo_ prefix pattern already in use

---

## Implementation Checklist

- [ ] Rename tables in schema migration
- [ ] Verify all table references compile
- [ ] Update RLS policies to reference new names
- [ ] Update foreign key constraints
- [ ] Rebuild indexes with new names
- [ ] Run type check (should pass)
- [ ] Run build (should succeed)
- [ ] Update database.ts type definitions if needed
- [ ] Update PRD documentation
- [ ] Deploy migration to Supabase

