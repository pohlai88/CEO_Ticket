# CEO Request Management System — Product Requirements Document

**Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Development Phase 3 Complete (Days 1-3)  

---

## 1. Executive Summary

The **CEO Request Management System** is an enterprise-grade application designed to streamline request submission, review, and approval workflows within organizations. Built with Next.js 16, React 19, TypeScript, and Supabase, the system enforces secure multi-tenancy through architectural isolation and comprehensive audit logging.

This document serves as the SSOT (Single Source of Truth) for all architectural decisions, including the critical requirement for shared instance isolation using the `ceo_` prefix on all database tables.

---

## 2. Architecture Overview

### 2.1 Deployment Model: Ad-Hoc Shared Instance

**Requirement:** This application is deployed on a **shared Supabase instance** where multiple tenants (organizations) may coexist in the same PostgreSQL database.

**Isolation Strategy:** 
- **Table Naming Convention:** All tables use the `ceo_` prefix to prevent collisions with other projects on the same instance
- **Row-Level Security (RLS):** PostgreSQL policies enforce tenant isolation at the data layer
- **Authentication:** Supabase Auth manages user identity; organization context derived from user's `org_id`

**Why This Matters:**
Without the `ceo_` prefix, table names like `users`, `requests`, and `organizations` would collide with other projects on the shared instance, causing data corruption and security breaches. The prefix is not optional—it's a fundamental architectural constraint.

### 2.2 Table Naming Convention (Ad-Hoc Isolation)

| Layer | Table Name | Purpose |
|-------|-----------|---------|
| **Configuration** | `ceo_config` | Global settings (single row) |
| **Tenancy** | `ceo_organizations` | Organization/company records |
| | `ceo_users` | User accounts with role assignments |
| **Business Logic** | `ceo_categories` | Request categories |
| | `ceo_requests` | Request submissions |
| | `ceo_request_approvals` | Approval records |
| | `ceo_request_watchers` | Users watching a request |
| | `ceo_request_comments` | Comments on requests |
| | `ceo_request_attachments` | File attachments |
| **Announcements** | `ceo_announcements` | Organization bulletins |
| | `ceo_announcement_reads` | Acknowledgment tracking |
| **Executive Messages** | `ceo_executive_messages` | CEO/Executive consultation messages |
| | `ceo_executive_message_reads` | Read status tracking |
| **Operations** | `ceo_audit_logs` | Complete audit trail (service-role only) |
| | `ceo_notification_log` | Notification history |
| | `ceo_ref_reason_codes` | Rejection reason codes |

**All 16 tables use the `ceo_` prefix.** No exceptions.

---

## 3. Technical Stack

| Component | Version | Notes |
|-----------|---------|-------|
| **Framework** | Next.js 16.1.1 | App Router, Server Actions |
| **Language** | TypeScript 5.9.3 | Strict mode, full type safety |
| **React** | 19.2.3 | Latest hooks, concurrent features |
| **Database** | Supabase (PostgreSQL) | Managed cloud PostgreSQL + Auth |
| **CSS Framework** | Tailwind CSS + Custom Variables | Quantum Nexus theme (OKLch P3 wide gamut) |
| **Authentication** | Supabase Auth (JWT) | OAuth + Email/Password options |
| **API Layer** | REST (App Router route.ts) | RESTful endpoints with RLS enforcement |
| **Validation** | Zod 3.22.x | Schema validation with `safeParse()` |
| **Date/Time** | Temporal API | Future-proof date handling |

---

## 4. Application Features (Current: Days 1-3)

### 4.1 Phase 1: Foundation & Authentication (Day 1-2) ✅

**Completed:**
- [x] Supabase project setup with 16 prefixed tables
- [x] Authentication system (signup, login, session management)
- [x] Role-based access control (MANAGER, CEO, ADMIN)
- [x] Organization bootstrap workflow
- [x] User onboarding (email verification, profile setup)
- [x] RLS policies enforcing tenant isolation
- [x] Server-side utilities: `auth.getUser()`, `writeAuditLog()`, `requireAuth()`

**Key Decisions:**
- Use `auth.getUser()` (not `getSession()`) for server-side authentication
- Audit all state-changing operations via `writeAuditLog()` helper
- Use `import 'server-only'` guard on all API routes to prevent client exposure

### 4.2 Phase 2: Request CRUD-S (Day 3) ✅

**Completed:**
- [x] Request submission form with validation
- [x] Request listing with filtering and pagination
- [x] Request detail view with full history
- [x] Soft delete support (deletion with audit trail)
- [x] Material change detection (version tracking)
- [x] Comments and attachments UI (backend ready)
- [x] Audit logging on all operations

**API Endpoints (All Implemented):**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/requests` | Create request (DRAFT status) |
| GET | `/api/requests` | List requests (org scope) |
| GET | `/api/requests/[id]` | Fetch request detail |
| PATCH | `/api/requests/[id]` | Update request (DRAFT→SUBMITTED) |
| DELETE | `/api/requests/[id]` | Soft delete request |

**Pages (All Implemented):**
- `/requests` — Request list with filters
- `/requests/new` — Submission form
- `/requests/[id]` — Request detail view

**Pattern Consistency:**
All Phase 3 routes follow Phase 1-2 standards:
- ✅ Use `import 'server-only'` guard
- ✅ Authenticate with `auth.getUser()`
- ✅ Validate with `zod.safeParse()`
- ✅ Audit operations with `writeAuditLog()`
- ✅ Structured error logging with context

---

## 5. Data Model

### 5.1 Core Entities

#### `ceo_organizations`
```sql
- id (uuid)
- name (text)
- constitution_version (text)
- constitution_signed_by (uuid)
- constitution_signed_at (timestamp)
```

#### `ceo_users`
```sql
- id (uuid) — Supabase Auth ID
- org_id (uuid) — Organization context
- email (text)
- role_code (MANAGER|CEO|ADMIN)
- notification_preferences (jsonb)
```

#### `ceo_requests`
```sql
- id (uuid)
- org_id (uuid) — Tenant isolation
- title (text)
- description (text)
- request_version (int) — Material change tracking
- status_code (DRAFT|SUBMITTED|IN_REVIEW|APPROVED|REJECTED|CANCELLED|CLOSED)
- priority_code (P1|P2|P3|P4|P5)
- category_id (uuid)
- requester_id (uuid)
- timestamps: created_at, updated_at, status_changed_at, submitted_at, approved_at, closed_at, last_activity_at
- soft_delete: deleted_at, deleted_reason
- audit: created_by, updated_by
```

#### `ceo_request_approvals`
```sql
- id (uuid)
- request_id (uuid)
- request_version (int) — Snapshot of request state at approval time
- approval_round (int) — Track multiple approval rounds
- decision (pending|approved|rejected)
- approved_by (uuid)
- notes (text)
- request_snapshot (jsonb) — Full request state for audit trail
- is_valid (boolean) — Track approval invalidation
- invalidated_reason (material_edit|resubmit|manual_revocation)
```

---

## 6. Authentication & Security

### 6.1 Authentication Flow

1. **Signup:** Email verification via Supabase Auth
2. **First Login:** Bootstrap organization creation (if new)
3. **Subsequent Logins:** Derive context from `ceo_users.org_id`
4. **Session Management:** JWT stored in secure HTTP-only cookie
5. **Logout:** Session cleared, redirect to landing page

### 6.2 Authorization Model

**Role-Based Access Control (RBAC):**

| Role | Permissions |
|------|-------------|
| **MANAGER** | Create/edit own requests, view all requests |
| **CEO** | Create/edit all requests, approve, configure system |
| **ADMIN** | All MANAGER + CEO permissions, plus user/org management |

**Enforced Via:**
- Supabase RLS policies on all tables
- Server-side checks in API routes
- Client-side UI visibility (non-enforcing)

### 6.3 Audit Logging

**What Gets Logged:**
- ✅ Request creation, status changes, deletions
- ✅ Approval decisions
- ✅ Comments, attachments, watchers
- ✅ User-initiated administrative actions

**How:**
- All state-changing operations call `writeAuditLog()` helper
- Helper uses `service_role` client to bypass RLS and insert to `ceo_audit_logs`
- Logs include: `org_id`, `user_id`, `action`, `resource_type`, `resource_id`, `metadata`, `timestamp`

**Stored In:**
- `ceo_audit_logs` table (write-protected, service role only)
- Queryable for compliance/debugging

---

## 7. API Design Patterns

### 7.1 Request/Response Structure

**Success Response (200/201):**
```json
{
  "success": true,
  "data": { /* actual response */ },
  "message": "Operation successful"
}
```

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": "SHORT_ERROR_CODE",
  "message": "Human-readable explanation",
  "details": { /* context for debugging */ }
}
```

### 7.2 Validation Pattern

**Server-Side (Always):**
```typescript
const validation = createRequestSchema.safeParse(body);
if (!validation.success) {
  return Response.json({
    success: false,
    error: 'VALIDATION_ERROR',
    message: 'Invalid request payload',
    details: validation.error.flatten()
  }, { status: 400 });
}
const data = validation.data;
```

**Never use `.parse()` without safeguard—exceptions crash the request.**

### 7.3 Authentication Pattern

**On All API Routes:**
```typescript
import 'server-only';
import { auth } from '@/lib/auth';

const { data: { user: authUser }, error: authError } = await auth.getUser();
if (authError || !authUser?.id) {
  return Response.json({ 
    success: false, 
    error: 'UNAUTHORIZED' 
  }, { status: 401 });
}
const userId = authUser.id;
```

**Key Points:**
- Use `auth.getUser()`, never `auth.getSession()`
- `getUser()` makes a database call but guarantees current session state
- `getSession()` reads from request headers (can be stale)

### 7.4 Audit Logging Pattern

**On All State Changes:**
```typescript
import { writeAuditLog } from '@/lib/server/audit';

await writeAuditLog({
  org_id: orgId,
  user_id: userId,
  action: 'REQUEST_CREATED',
  resource_type: 'request',
  resource_id: request.id,
  metadata: { 
    title: request.title,
    status: request.status_code 
  }
});
```

**Why Not Direct Insert?**
- RLS policy: Only service role can write to `ceo_audit_logs`
- User client (postgrest) will be blocked by RLS
- `writeAuditLog()` uses service role to bypass RLS
- This ensures audit logging cannot be bypassed by client-side bugs

---

## 8. CSS Architecture

### 8.1 Design System: Quantum Nexus Theme

**Color Specification:** OKLch P3 Wide Gamut
```css
/* Semantic colors as CSS variables */
--color-primary: oklch(55% 0.22 242); /* Deep Blue */
--color-secondary: oklch(65% 0.18 339); /* Magenta */
--color-accent: oklch(60% 0.25 180); /* Cyan */
--color-surface: oklch(98% 0.01 0); /* Off-white */
--color-surface-variant: oklch(92% 0.02 0); /* Light Gray */
--color-on-surface: oklch(15% 0.01 0); /* Near-black */
```

**Why OKLch + Wide Gamut?**
- Perceptually uniform color space (better UX than sRGB hex)
- P3 gamut supports modern displays (wider color range)
- Respects user preference: `prefers-color-scheme`

### 8.2 Styling Approach

**Pattern:** Pure Tailwind + CSS Variables (No Component Classes)

**Correct ✅:**
```tsx
<div className="bg-surface text-on-surface rounded-lg p-4 
              border border-surface-variant shadow-md 
              hover:shadow-lg transition-shadow">
  Content
</div>
```

**Incorrect ❌:**
```tsx
// Don't create wrapper classes like:
const cardStyles = "rounded-lg p-4 border shadow-md";
```

**CSS Variables (Global Only):**
```css
/* globals.css */
:root {
  --color-primary: oklch(55% 0.22 242);
  --color-secondary: oklch(65% 0.18 339);
  /* etc */
}

/* Used in Tailwind config */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        /* etc */
      }
    }
  }
};
```

**Rationale:** Tailwind handles layout/spacing; CSS vars handle semantic colors. This keeps styling declarative and maintainable.

---

## 9. Development Workflow

### 9.1 Environment Setup

**Prerequisites:**
```bash
node --version  # v18.17.0 or higher
npm --version   # v9.0.0 or higher
```

**Installation:**
```bash
npm install
```

**Environment Variables (.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### 9.2 Local Development

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Test production build
npm run lint         # TypeScript + ESLint
```

### 9.3 Git Workflow

**Branch Naming:**
- Feature: `feature/request-approvals`
- Bug: `bug/auth-session-issue`
- Hotfix: `hotfix/critical-security`

**Commit Messages:**
```
[PHASE3] Fix audit logging pattern consistency

- Changed auth.getSession() → auth.getUser()
- Updated all routes to use writeAuditLog() helper
- Added import 'server-only' guard
- Fixed JSON type compatibility in metadata

Fixes #42
```

---

## 10. Testing Strategy

### 10.1 Test Coverage

**Currently:** Manual testing only (integration tests TBD)

**Planned:**
- Unit tests for validation schemas
- Integration tests for API endpoints
- E2E tests for critical workflows

### 10.2 Manual Testing Checklist (Before Deployment)

- [ ] Signup → bootstrap organization
- [ ] User onboarding completes successfully
- [ ] Request creation (DRAFT status)
- [ ] Request submission (DRAFT → SUBMITTED)
- [ ] Soft deletion (no permanent data loss)
- [ ] Audit log entries appear for all operations
- [ ] Comments and attachments upload correctly
- [ ] Filtering/pagination works on request list

---

## 11. Deployment Considerations

### 11.1 Database Migration

**Critical:** All 16 tables MUST have `ceo_` prefix before code execution.

**Migration Path:**
1. Run `db/schema.sql` on Supabase PostgreSQL
2. Verify all 16 tables created with `ceo_` prefix
3. Verify RLS policies attached to each table
4. Verify foreign key constraints in place

**Verification SQL:**
```sql
SELECT tablename FROM pg_tables WHERE tablename LIKE 'ceo_%' ORDER BY tablename;
-- Should return 16 rows
```

### 11.2 Supabase Configuration

**Required:**
- ✅ Auth providers configured (Email, OAuth)
- ✅ RLS policies enabled on all tables
- ✅ Service role key available for audit logging
- ✅ Storage buckets (if using file uploads)

### 11.3 Environment Variables

**Must Set Before Deploy:**
```
NEXT_PUBLIC_SUPABASE_URL        (Supabase project URL)
NEXT_PUBLIC_SUPABASE_ANON_KEY   (Publishable key)
SUPABASE_SERVICE_ROLE_KEY       (Secret role key - server-only)
```

**Never:**
- Commit `.env.local` to version control
- Use service role key in client-side code
- Share keys across environments

---

## 12. Known Limitations & Future Work

### 12.1 Current Limitations

- **No Real-Time Notifications:** Polling only (WebSocket planned for Day 6)
- **Single Organization:** Bootstrap creates one org per user (multi-org planned)
- **File Storage:** Placeholders only (Supabase Storage integration Day 5)
- **Email Notifications:** Logged but not sent (SMTP integration Day 7)
- **Analytics:** Not implemented (dashboards Day 8)

### 12.2 Upcoming Phases (Days 4-8)

| Day | Feature | Status |
|-----|---------|--------|
| 4 | Approval system (CEO queue) | Not started |
| 5 | Announcements (bulletins, ACK) | Not started |
| 6 | Executive messages (consultation) | Not started |
| 7 | Email notifications, file uploads | Not started |
| 8 | Analytics dashboard, polish | Not started |

---

## 13. Troubleshooting Guide

### Issue: "relation 'public.requests' does not exist"

**Cause:** Code is querying `requests` but schema defines `ceo_requests`  
**Solution:** Verify schema.sql has been applied and all tables have `ceo_` prefix

**Check:**
```sql
SELECT * FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'ceo_%';
```

### Issue: "new row violates row-level security policy"

**Cause:** Attempting to write audit logs via user client without RLS bypass  
**Solution:** Always use `writeAuditLog()` helper, never direct `.insert()`

**Check:**
```typescript
// ❌ WRONG - Will fail RLS
await supabase.from('ceo_audit_logs').insert({ ... });

// ✅ CORRECT
await writeAuditLog({ ... });
```

### Issue: Authentication returns null user

**Cause:** Using `auth.getSession()` instead of `auth.getUser()`  
**Solution:** Change to `auth.getUser()` on server-side routes

**Check:**
```typescript
// ❌ WRONG - Can return stale session
const { data: { session } } = await auth.getSession();

// ✅ CORRECT - Always current
const { data: { user } } = await auth.getUser();
```

---

## 14. Architectural Decisions (ADRs)

### ADR-001: Table Naming with `ceo_` Prefix

**Decision:** All tables prefixed with `ceo_` for shared instance isolation  
**Status:** ACCEPTED  
**Rationale:** Prevents collisions in multi-tenant shared Supabase instance  
**Consequence:** Must update all SQL queries, RLS policies, foreign keys  
**Alternative Rejected:** Using separate databases (more complex, costlier)

### ADR-002: Audit Logging via Service Role

**Decision:** Use `writeAuditLog()` helper (service role) instead of user client inserts  
**Status:** ACCEPTED  
**Rationale:** RLS policies prevent user-level writes to audit logs; service role bypasses  
**Consequence:** Audit logging cannot be bypassed; guarantees integrity  
**Alternative Rejected:** Direct audit inserts (violates security model)

### ADR-003: Server Authentication Pattern

**Decision:** Use `auth.getUser()` on all server routes, never `auth.getSession()`  
**Status:** ACCEPTED  
**Rationale:** `getUser()` always returns current session state; `getSession()` can be stale  
**Consequence:** Slightly higher latency (DB call) but accurate authentication  
**Alternative Rejected:** `getSession()` (acceptable for client-side only)

### ADR-004: Validation with `safeParse()`

**Decision:** Always use `zod.safeParse()` on server routes  
**Status:** ACCEPTED  
**Rationale:** Never throw exceptions from parsing; return structured error responses  
**Consequence:** Slightly more verbose code but impossible to crash from bad input  
**Alternative Rejected:** `.parse()` (can throw unhandled exceptions)

---

## 15. Contact & Support

**Development Team:**
- Architect: [Your Name]
- Tech Lead: [Your Name]
- Status: Active Development

**Deployment:**
- Database: Supabase (Shared Instance)
- Hosting: Vercel (Next.js native)
- Domain: [TBD]

**Document Review Date:** January 2025  
**Next Review:** After Day 4 approval system completion

---

**END OF PRD**

---

## Appendix A: Schema Changelog

| Version | Date | Change | Status |
|---------|------|--------|--------|
| 1.0 | Jan 2025 | Initial 16-table schema with ceo_ prefix | ✅ Complete |
| 1.1 | Jan 2025 | Added Phase 3 (Request CRUD-S) | ✅ Complete |
| 2.0 | TBD | Phase 4: Approval system refinements | Not started |

## Appendix B: Table Prefix Justification

**Why `ceo_`?**
This is an ad-hoc shared instance for CEO request management. The prefix:
1. **Prevents Collisions:** Multiple projects on same PostgreSQL instance
2. **Namespaces Tenant Data:** Clear logical separation
3. **Improves Security:** Explicit scoping reduces accidental cross-project queries
4. **Enables Multi-Tenancy:** Supports future scaling to multiple organizations per project

**Enforced By:**
- ✅ All table names in schema.sql
- ✅ All foreign key constraints
- ✅ All RLS policies
- ✅ All API route references
- ✅ All database helper functions

**Verification:**
```sql
-- Show all application tables
SELECT tablename FROM pg_tables 
WHERE tablename LIKE 'ceo_%' AND table_schema='public';

-- Should return exactly 16 rows:
-- ceo_organizations, ceo_users, ceo_categories, ceo_requests,
-- ceo_request_approvals, ceo_request_watchers, ceo_request_comments,
-- ceo_request_attachments, ceo_announcements, ceo_announcement_reads,
-- ceo_executive_messages, ceo_executive_message_reads, ceo_audit_logs,
-- ceo_notification_log, ceo_ref_reason_codes, ceo_config
```

