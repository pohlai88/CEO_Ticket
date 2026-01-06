# RFC: CEO-TICKET Pre-Test Security Suite

**Status:** Active
**Scope:** All MCPs, API endpoints, and Supabase-managed tables for CEO-TICKET system
**Author:** Internal Security / DevOps Team
**Date:** 2026-01-07
**Version:** 1.0.0

---

## 1️⃣ Purpose

This RFC defines a **pre-test validation suite** that MUST be run before any manual or automated QA testing. The suite ensures:

1. All critical security policies are in place.
2. No function, table, or cache can be exploited by unauthorized users.
3. Row-Level Security (RLS), `SECURITY DEFINER` functions, and cache policies follow **best practices**.
4. System integrity and memory hygiene are preserved during pre-flight runs.

> ⚠️ **All pre-test checks MUST pass before human testing begins.**

---

## 2️⃣ Scope

| Layer        | Included                                           | Excluded                         |
| ------------ | -------------------------------------------------- | -------------------------------- |
| **Next.js**  | API routes (`/api/*`), Server Actions, Pages       | Pure client-only components      |
| **Supabase** | Edge Functions, RPCs, `ceo_%` tables, cache tables | Non-production preview functions |

---

## 3️⃣ Pre-Test Validation Requirements

### 3.1 Row-Level Security (RLS)

- **MUST** ensure **all CEO tables** have RLS enabled.
- **MUST** validate all RLS policies correspond to the intended roles:
  - Admins: Full access (UPDATE/DELETE/SELECT)
  - Authenticated users: Scoped INSERT/SELECT
  - Anon: No access
- **MUST NOT** allow any table without RLS in production.

**Tables to Validate:**

| Table Name                    | RLS Required | Policy Types Required          |
| ----------------------------- | ------------ | ------------------------------ |
| `ceo_announcement_reads`      | ✅ MUST      | SELECT, INSERT                 |
| `ceo_announcements`           | ✅ MUST      | SELECT, INSERT, UPDATE, DELETE |
| `ceo_approvals`               | ✅ MUST      | SELECT, INSERT, UPDATE         |
| `ceo_audit_logs`              | ✅ MUST      | SELECT, INSERT                 |
| `ceo_categories`              | ✅ MUST      | SELECT, INSERT, UPDATE         |
| `ceo_config`                  | ✅ MUST      | SELECT, INSERT, UPDATE         |
| `ceo_executive_message_reads` | ✅ MUST      | SELECT, INSERT                 |
| `ceo_executive_messages`      | ✅ MUST      | SELECT, INSERT, UPDATE, DELETE |
| `ceo_notification_log`        | ✅ MUST      | SELECT, INSERT                 |
| `ceo_organizations`           | ✅ MUST      | SELECT, INSERT, UPDATE, DELETE |
| `ceo_request_approvals`       | ✅ MUST      | SELECT, INSERT, UPDATE         |
| `ceo_request_attachments`     | ✅ MUST      | SELECT, INSERT, DELETE         |
| `ceo_request_comments`        | ✅ MUST      | SELECT, INSERT, UPDATE, DELETE |
| `ceo_request_watchers`        | ✅ MUST      | SELECT, INSERT, DELETE         |
| `ceo_requests`                | ✅ MUST      | SELECT, INSERT, UPDATE, DELETE |
| `ceo_users`                   | ✅ MUST      | SELECT, INSERT, UPDATE         |

---

### 3.2 Security Definer Functions

- **MUST** ensure all `SECURITY DEFINER` functions have a **hardcoded search_path**:
  ```sql
  SET search_path = public, pg_temp
  ```
- **MUST NOT** expose any `SECURITY DEFINER` function with `PUBLIC` execute privilege.
- **MUST** verify all internal helper functions (`cleanup_expired_cache`, `upsert_cache_entry`, etc.) are secure.

**Functions to Validate:**

| Function Name              | Requires search_path | Notes                 |
| -------------------------- | -------------------- | --------------------- |
| `handle_new_user`          | ✅ MUST              | Auth trigger          |
| `get_user_organization_id` | ✅ MUST              | Helper for RLS        |
| `cleanup_expired_cache`    | ✅ MUST              | Cache maintenance     |
| `upsert_cache_entry`       | ✅ MUST              | Cache write           |
| `check_rls_status`         | ✅ MUST              | Security verification |
| All other SECURITY DEFINER | ✅ MUST              | Universal requirement |

---

### 3.3 Cache / Kernel Validation

- **MUST** block anonymous writes to all caches (`kernel_validation_cache`).
- **MUST** allow **service_role** writes only.
- **MUST** allow authenticated reads if needed for performance.
- **MUST NOT** permit unvalidated or "permissive" policies.

**Cache Tables:**

| Table Name                | Anon SELECT | Anon INSERT | Anon UPDATE | Auth SELECT | Service INSERT |
| ------------------------- | ----------- | ----------- | ----------- | ----------- | -------------- |
| `kernel_validation_cache` | ❌ NO       | ❌ NO       | ❌ NO       | ✅ YES      | ✅ YES         |

---

### 3.4 DELETE & Soft-Delete Policies

- **MUST** restrict hard deletes on critical tables (`ceo_requests`, `ceo_users`, `ceo_organizations`) to admins only.
- **MUST** enforce soft-delete where applicable (`deleted_at` column).
- **SHOULD** log soft-deleted records for audit purposes.

**Critical Tables:**

| Table Name          | Hard DELETE | Soft DELETE Column | Admin Only |
| ------------------- | ----------- | ------------------ | ---------- |
| `ceo_requests`      | ❌ Blocked  | `deleted_at`       | ✅ YES     |
| `ceo_users`         | ❌ Blocked  | `deleted_at`       | ✅ YES     |
| `ceo_organizations` | ❌ Blocked  | `deleted_at`       | ✅ YES     |

---

### 3.5 Triggers & Automated Actions

- **MUST** verify triggers like `on_auth_user_created` execute properly:
  - Create `ceo_organizations` record
  - Create `ceo_users` record
  - Create `ceo_config` record
- **MUST** ensure triggers cannot be bypassed by malformed or unauthorized requests.

**Active Triggers:**

| Trigger Name                        | Table         | Action        | Purpose                   |
| ----------------------------------- | ------------- | ------------- | ------------------------- |
| `on_auth_user_created`              | `auth.users`  | AFTER INSERT  | Bootstrap org/user/config |
| `update_kernel_metadata_updated_at` | Kernel tables | BEFORE UPDATE | Timestamp maintenance     |

---

### 3.6 Session & Auth Configuration

- **MUST** enforce JWT expiry and session limits (Supabase Auth):
  - Idle timeout: **30 minutes** (1800 seconds)
  - Maximum session duration: **8 hours** (28800 seconds)
  - Single session per user: **enabled**
- **MUST** validate role-based access for all endpoints.

> **Configuration Location:** Supabase Dashboard → Settings → Auth → Session

---

### 3.7 Pre-Test API Flow Validation

**MUST Test Pages / Endpoints:**

| Page / Endpoint                | HTTP Method | Expected Status | Validation                                          |
| ------------------------------ | ----------- | --------------- | --------------------------------------------------- |
| Landing `/`                    | GET         | 200             | Reachable, redirects authenticated users correctly  |
| Signup `/auth/signup`          | GET         | 200             | Validates fields, cannot create duplicate users     |
| Login `/auth/login`            | GET         | 200             | Authenticated sessions created, invalid login fails |
| Onboarding `/onboarding`       | GET         | 200/307         | Org, users, broadcast created correctly             |
| Dashboard `/dashboard`         | GET         | 200/307/308     | Access restricted by role                           |
| Requests `/requests`           | GET         | 200/307/308     | RLS enforced, DELETE restricted                     |
| New Request `/requests/new`    | GET         | 200/307/308     | User can only create own requests                   |
| Approvals `/approvals`         | GET         | 200/307/308     | CEO/Admin only approval                             |
| Messages `/messages`           | GET         | 200/307/308     | Access limited to org or assigned users             |
| Announcements `/announcements` | GET         | 200/307/308     | CEO/Admin only create, read by members              |

**API Endpoints:**

| Endpoint             | Method | Unauthenticated Response | Authenticated Response |
| -------------------- | ------ | ------------------------ | ---------------------- |
| `/api/requests`      | GET    | 401/403                  | 200 + JSON             |
| `/api/approvals`     | GET    | 401/403                  | 200 + JSON             |
| `/api/messages`      | GET    | 401/403                  | 200 + JSON             |
| `/api/announcements` | GET    | 401/403                  | 200 + JSON             |

---

### 3.8 Memory & Resource Hygiene

- **MUST** ensure MCPs do not leak memory.
- **MUST** fail fast on invalid inputs, before allocating DB or cache resources.
- **SHOULD** run sequential smoke test with 1000 requests to validate stability.

---

## 4️⃣ MUST / SHOULD Summary Table

| Area             | MUST                           | SHOULD              | MUST NOT                |
| ---------------- | ------------------------------ | ------------------- | ----------------------- |
| RLS              | ✅ Enabled on all 16 tables    | Audit policies      | ❌ Disabled tables      |
| Security Definer | ✅ search_path enforced        | Audit logs          | ❌ PUBLIC execute       |
| Cache            | ✅ service_role write only     | Auth read allowed   | ❌ anon write           |
| DELETE policies  | ✅ Admin only                  | Soft-delete logs    | ❌ open DELETE          |
| Triggers         | ✅ Auto-create org/user/config | Notify on failure   | ❌ bypassable           |
| Sessions         | ✅ JWT/session limits          | Telemetry           | ❌ unlimited sessions   |
| Pre-Test API     | ✅ Pages reachable & validated | Smoke test logs     | ❌ untested endpoints   |
| Memory hygiene   | ✅ Fail-fast                   | Telemetry & monitor | ❌ leaks / ghost memory |

---

## 5️⃣ Pre-Test Command Suite

### 5.1 Primary Commands

```bash
# Run complete pre-test verification suite
npm run pretest

# Verify TypeScript & runtime types
npm run type-check

# Lint & style checks
npm run lint

# Full validation (type-check + lint + glossary)
npm run validate
```

### 5.2 Database-Level Validation (SQL)

```bash
# RLS & SECURITY DEFINER check
psql $SESSION_DB_URL -f sql/pretest_security_check.sql

# Validate cache isolation policies
psql $SESSION_DB_URL -f sql/check_kernel_cache_policies.sql

# Complete security audit
psql $SESSION_DB_URL -f sql/full_security_audit.sql
```

### 5.3 Combined Test Suite

```bash
# Run all tests (pretest + unit + e2e)
npm run test:all
```

---

## 6️⃣ Exit Codes

| Exit Code | Meaning                                |
| --------- | -------------------------------------- |
| 0         | All MUST checks passed                 |
| 1         | One or more MUST checks failed         |
| 2         | Configuration error (missing env vars) |

---

## 7️⃣ Check Categories

### MUST Checks (11 total) — Failure = Exit 1

1. Landing page (`/`) reachable
2. Login page (`/auth/login`) reachable
3. Signup page (`/auth/signup`) reachable
4. Dashboard page accessible or redirects
5. RLS enabled on `ceo_requests` with SELECT policy
6. RLS enabled on `ceo_users` with SELECT policy
7. RLS enabled on `ceo_organizations` with SELECT policy
8. DELETE policy exists on `ceo_requests`
9. All SECURITY DEFINER functions have proper search_path
10. Cache write blocked for anonymous users
11. Cache update blocked for anonymous users

### SHOULD Checks (16 total) — Warning Only

1. Onboarding page accessible
2. All CEO tables have `deleted_at`/`deleted_by` columns
3. Landing page returns 200
4. Login page returns 200
5. Signup page returns 200
6. Dashboard returns 200/307/308
7. Requests page returns 200/307/308
8. New Request page returns 200/307/308
9. Approvals page returns 200/307/308
10. Messages page returns 200/307/308
11. Announcements page returns 200/307/308
12. Onboarding page returns 200/307/308
13. GET /api/requests returns valid status
14. GET /api/approvals returns valid status
15. GET /api/messages returns valid status
16. GET /api/announcements returns valid status

---

## 8️⃣ Security Database Inventory

### Tables with RLS (16)

All tables prefixed with `ceo_` have Row-Level Security enabled.

### RLS Policies (41 total)

Distributed across all CEO tables covering SELECT, INSERT, UPDATE, DELETE, and ALL operations.

### SECURITY DEFINER Functions (17)

All have proper `search_path` configuration to prevent privilege escalation.

### Triggers (2)

- `on_auth_user_created` - Bootstrap organization, user, and config
- `update_kernel_metadata_updated_at` - Timestamp maintenance

### Migrations (29)

Complete history from initial schema through security hardening phases.

---

## 9️⃣ Revision History

| Version | Date       | Author | Changes                             |
| ------- | ---------- | ------ | ----------------------------------- |
| 1.0.0   | 2026-01-07 | DevOps | Initial RFC based on security audit |

---

## 🔗 Related Documents

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture overview
- [05_SCHEMA_REFERENCE.md](05_SCHEMA_REFERENCE.md) - Database schema reference
- [06_API_REFERENCE.md](06_API_REFERENCE.md) - API endpoint documentation
- [CONVENTION_LOCK.md](CONVENTION_LOCK.md) - Code conventions
- [REQUEST_CONSTITUTION.md](REQUEST_CONSTITUTION.md) - Request handling rules

---

> **This RFC serves as the authoritative pre-test suite**, combining all prior security audits, RLS checks, cache validations, and flow validations. All MUST checks must pass before QA or human exploratory testing.
