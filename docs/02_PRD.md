# CEO Request Management System — Product Requirements Document

**Version:** 2.2  
**Last Updated:** January 6, 2025  
**Status:** ✅ COMPLETE & SHIP-READY (Days 1-7) — All MVP Features Implemented, Type-Safe, Validated  
**SSOT:** Primary operational reference (use for implementation)  
**Archive:** See `.PRD/PRD_CEO_REQEUST_TICKET.md` for comprehensive planning document

---

## 0. Executive Intent (IMMUTABLE)

**System Purpose:** Accelerate executive decision-making, execution, and communication clarity.

**Primary User:** CEO  
**Secondary Users:** Senior Managers only  
**Explicitly NOT Users:** Clerks, warehouse staff, general workforce, external parties

**What This System Does:**

1. Enables managers to request approvals → CEO decides → execution tracked
2. CEO broadcasts announcements (bulletins, direction, urgent notices)
3. Two-way executive communication (consultation, clarification, direction)
4. Complete audit trail of all decisions and communications
5. Single point of truth for executive priorities and direction

**What This System Does NOT Do:**

- Internal chat, Slack clone, WhatsApp replacement
- Realtime messaging, threads, emojis, reactions
- Warehouse operations, bulk workflows, general task management
- External integrations (Google Drive, Slack, Teams)
- Multi-level approval chains (CEO is final authority)

---

## 1. Executive Summary

## 1. Executive Summary

The **CEO Request Management System** is an enterprise-grade application designed to streamline request submission, review, and approval workflows within organizations. Built with Next.js 16, React 19, TypeScript, and Supabase, the system enforces secure multi-tenancy through architectural isolation and comprehensive audit logging.

This document serves as the SSOT (Single Source of Truth) for all architectural decisions, including the critical requirement for shared instance isolation using the `ceo_` prefix on all database tables.

### Scope Definition (Explicit Boundaries)

**INCLUDED (MVP) ✅**

- Executive requests & approvals
- CEO announcements (bulletins, banners)
- Executive 2-way communication (consultation & direction)
- Audit logging (every action, every change)
- Attachments (Supabase Storage)
- Read/acknowledge tracking
- User & role management
- Notification preferences
- CEO configuration (one table)

**EXCLUDED (v1 Out of Scope) ❌**

- Google Drive or external storage adapters
- Chat threads, emojis, reactions
- Realtime messaging, typing indicators
- Internal chat or group conversations
- ERP integration or AIBOS sync
- Multi-level approval workflows
- Custom fields or dynamic forms
- API for external systems (Phase 2)

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

| Layer                  | Table Name                    | Purpose                                  |
| ---------------------- | ----------------------------- | ---------------------------------------- |
| **Configuration**      | `ceo_config`                  | Global settings (single row)             |
| **Tenancy**            | `ceo_organizations`           | Organization/company records             |
|                        | `ceo_users`                   | User accounts with role assignments      |
| **Business Logic**     | `ceo_categories`              | Request categories                       |
|                        | `ceo_requests`                | Request submissions                      |
|                        | `ceo_request_approvals`       | Approval records                         |
|                        | `ceo_request_watchers`        | Users watching a request                 |
|                        | `ceo_request_comments`        | Comments on requests                     |
|                        | `ceo_request_attachments`     | File attachments                         |
| **Announcements**      | `ceo_announcements`           | Organization bulletins                   |
|                        | `ceo_announcement_reads`      | Acknowledgment tracking                  |
| **Executive Messages** | `ceo_executive_messages`      | CEO/Executive consultation messages      |
|                        | `ceo_executive_message_reads` | Read status tracking                     |
| **Operations**         | `ceo_audit_logs`              | Complete audit trail (service-role only) |
|                        | `ceo_notification_log`        | Notification history                     |
|                        | `ceo_ref_reason_codes`        | Rejection reason codes                   |

**All 16 tables use the `ceo_` prefix.** No exceptions.

---

## 3. Request Constitution & Governance (IMMUTABLE)

### Status Lifecycle (Locked)

```
DRAFT → SUBMITTED → IN_REVIEW → {APPROVED, REJECTED}
                              ↘ CANCELLED

APPROVED → CLOSED
REJECTED → SUBMITTED (can resubmit)
CANCELLED → (terminal)
```

### Soft-Delete vs Cancel (Orthogonal Concepts)

| Action          | Field Changed               | Meaning                | Reversible                |
| --------------- | --------------------------- | ---------------------- | ------------------------- |
| **Soft-Delete** | `deleted_at = now()`        | Access control, hidden | ✅ 7 days (CEO/requester) |
| **Cancel**      | `status_code = 'CANCELLED'` | Business decision      | ❌ Terminal               |

**Key Distinction:** Soft-delete is temporary hiding for recovery; cancel is a final status decision.

### Approval Rules

- **Single approver:** CEO only (no multi-level chains)
- **Versioning:** Approval binds to `request_version` (snapshot)
- **Invalidation:** Material edit (title/description/priority/category) → invalidate + reopen
- **Resubmit after reject:** New `approval_round`, optional version bump
- **Audit guarantees:** All mutations logged to `audit_logs`

### CEO Config Doctrine (Single Table)

**What CEO Controls ✅**

- Priority labels & colors (P1-P5 codes locked, labels customizable)
- Category names (add/edit/archive)
- Max file size (5/10/20/50 MB options)
- Auto-cancel period (14/30/60/90 days)
- Restore window (7/14/30 days)
- Audit retention (90/180/365/2557 days)
- Mention scope & limits (default: requester+watchers+approver)
- Notification defaults (email frequency, channels)
- Announcement defaults (type, ack required, retention)

**What Code Controls ❌**

- Status lifecycle (locked in code)
- Priority codes (P1-P5 semantic meaning)
- Approval mechanics
- Material change detection
- RLS policies
- Soft-delete vs cancel semantics

---

## 4. Technology Stack

| Component          | Version                         | Notes                                     |
| ------------------ | ------------------------------- | ----------------------------------------- |
| **Framework**      | Next.js 16.1.1                  | App Router, Server Actions                |
| **Language**       | TypeScript 5.9.3                | Strict mode, full type safety             |
| **React**          | 19.2.3                          | Latest hooks, concurrent features         |
| **Database**       | Supabase (PostgreSQL)           | Managed cloud PostgreSQL + Auth           |
| **CSS Framework**  | Tailwind CSS + Custom Variables | Quantum Nexus theme (OKLch P3 wide gamut) |
| **Authentication** | Supabase Auth (JWT)             | OAuth + Email/Password options            |
| **API Layer**      | REST (App Router route.ts)      | RESTful endpoints with RLS enforcement    |
| **Validation**     | Zod 3.22.x                      | Schema validation with `safeParse()`      |
| **Date/Time**      | Temporal API                    | Future-proof date handling                |

---

## 5. Application Features (Days 1-7 Complete)

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

| Method | Path                 | Purpose                          |
| ------ | -------------------- | -------------------------------- |
| POST   | `/api/requests`      | Create request (DRAFT status)    |
| GET    | `/api/requests`      | List requests (org scope)        |
| GET    | `/api/requests/[id]` | Fetch request detail             |
| PATCH  | `/api/requests/[id]` | Update request (DRAFT→SUBMITTED) |
| DELETE | `/api/requests/[id]` | Soft delete request              |

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

## 6. Three Core Modules

### Module A: Request & Approval System

**Purpose:** Structured execution & decision tracking

**Flow:**

1. Manager creates request (status=DRAFT)
2. Auto-save on keystroke (UUID assigned)
3. Manager submits (status=SUBMITTED, submitted_at=now())
4. CEO reviews (status=IN_REVIEW)
5. CEO approves (status=APPROVED, snapshot captured) OR rejects (status=REJECTED)
6. If approved, auto-close (status=CLOSED)
7. If rejected, manager can resubmit (approval_round incremented)

**Audit:** Every state transition logged via `writeAuditLog()`

---

### Module B: CEO Announcements (One-to-Many Broadcast)

**Purpose:** Replace WhatsApp noise, create official direction

**Types:**

| Type          | Display        | Notification | Use Case                             |
| ------------- | -------------- | ------------ | ------------------------------------ |
| **Info**      | Bulletin page  | Optional     | Informational updates                |
| **Important** | Sticky banner  | Yes          | Policy changes, deadlines            |
| **Urgent**    | Sticky + email | Yes + Email  | Stop-work orders, critical direction |

**Features:**

- Target all org / specific team / individual managers
- Optional acknowledgement (tracked)
- Sticky until date (CEO configurable)
- Read & ack tracking
- Full audit trail

---

### Module C: Executive Communication (2-Way, Intentional)

**Purpose:** Consultation, clarification, direction (NOT chat)

**Message Types:**

| Type              | Direction     | Trigger                | Example                            |
| ----------------- | ------------- | ---------------------- | ---------------------------------- |
| **Consultation**  | Manager → CEO | "Should we proceed?"   | Manager asks for approval/guidance |
| **Direction**     | CEO → Manager | "Execute this way."    | CEO instructs on how to proceed    |
| **Clarification** | Either way    | "Can you expand on X?" | Seeking context or explanation     |

**Rules:**

- Each message references a request, announcement, or is general (CEO only)
- Short, purposeful content
- Can CC other managers
- Marked sent/acknowledged/resolved
- Fully auditable

---

## 7. Data Model

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

## 8. Authentication & Security

### 6.1 Authentication Flow

1. **Signup:** Email verification via Supabase Auth
2. **First Login:** Bootstrap organization creation (if new)
3. **Subsequent Logins:** Derive context from `ceo_users.org_id`
4. **Session Management:** JWT stored in secure HTTP-only cookie
5. **Logout:** Session cleared, redirect to landing page

### 6.2 Authorization Model

**Role-Based Access Control (RBAC):**

| Role        | Permissions                                             |
| ----------- | ------------------------------------------------------- |
| **MANAGER** | Create/edit own requests, view all requests             |
| **CEO**     | Create/edit all requests, approve, configure system     |
| **ADMIN**   | All MANAGER + CEO permissions, plus user/org management |

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

## 9. API Design Patterns

### 7.1 Request/Response Structure

**Success Response (200/201):**

```json
{
  "success": true,
  "data": {
    /* actual response */
  },
  "message": "Operation successful"
}
```

**Error Response (4xx/5xx):**

```json
{
  "success": false,
  "error": "SHORT_ERROR_CODE",
  "message": "Human-readable explanation",
  "details": {
    /* context for debugging */
  }
}
```

### 7.2 Validation Pattern

**Server-Side (Always):**

```typescript
const validation = createRequestSchema.safeParse(body);
if (!validation.success) {
  return Response.json(
    {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Invalid request payload",
      details: validation.error.flatten(),
    },
    { status: 400 }
  );
}
const data = validation.data;
```

**Never use `.parse()` without safeguard—exceptions crash the request.**

### 7.3 Authentication Pattern

**On All API Routes:**

```typescript
import "server-only";
import { auth } from "@/lib/auth";

const {
  data: { user: authUser },
  error: authError,
} = await auth.getUser();
if (authError || !authUser?.id) {
  return Response.json(
    {
      success: false,
      error: "UNAUTHORIZED",
    },
    { status: 401 }
  );
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
import { writeAuditLog } from "@/lib/server/audit";

await writeAuditLog({
  org_id: orgId,
  user_id: userId,
  action: "REQUEST_CREATED",
  resource_type: "request",
  resource_id: request.id,
  metadata: {
    title: request.title,
    status: request.status_code,
  },
});
```

**Why Not Direct Insert?**

- RLS policy: Only service role can write to `ceo_audit_logs`
- User client (postgrest) will be blocked by RLS
- `writeAuditLog()` uses service role to bypass RLS
- This ensures audit logging cannot be bypassed by client-side bugs

---

## 10. CSS Architecture

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
<div
  className="bg-surface text-on-surface rounded-lg p-4 
              border border-surface-variant shadow-md 
              hover:shadow-lg transition-shadow"
>
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

## 11. Development Workflow

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

## 12. Testing Strategy

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

## 13. Deployment Considerations

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

## 14. Known Limitations & Future Work

### 12.1 Current Limitations

- **Analytics:** Not implemented (dashboards Day 8)
- **Multi-Organization:** Bootstrap creates one org per user (multi-org support future enhancement)
- **Real-Time Updates:** Polling-based (WebSocket integration future phase)

### 12.2 Completed Phases (Days 1-7)

| Day | Feature                                                 | Status                  |
| --- | ------------------------------------------------------- | ----------------------- |
| 1-3 | Foundation, auth, request CRUD-S                        | ✅ Complete             |
| 4   | Approval system (CEO queue, decisions, resubmit)        | ✅ Complete             |
| 5   | Announcements (bulletins, ACK tracking, sticky banners) | ✅ Complete             |
| 6   | Executive messages (consultation, context binding)      | ✅ Complete             |
| 7   | Watchers, comments (@mentions), attachments, config UI  | ✅ Complete & Validated |

**System Status:** ✅ PRODUCTION READY

All core features ship-ready:

- Request workflow (CRUD-S with soft deletes, material change tracking)
- Approval system (CEO queue with decision snapshots, resubmit support)
- Announcements (bulletins with ACK tracking, banners)
- Executive messages (consultation with context binding)
- Extended features (watchers, comments with @mentions, file attachments)
- Admin configuration (CEO settings management)

**Build Status:** ✅ Clean type-check pass, ✅ Clean lint pass  
**Test Coverage:** Manual integration testing complete, all workflows validated

---

## 15. Troubleshooting Guide

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
const {
  data: { session },
} = await auth.getSession();

// ✅ CORRECT - Always current
const {
  data: { user },
} = await auth.getUser();
```

---

## 16. Architectural Decisions (ADRs)

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

## 17. Contact & Support

**Development Team:**

- Architect: [Your Name]
- Tech Lead: [Your Name]
- Status: Active Development

**Deployment:**

- Database: Supabase (Shared Instance)
- Hosting: Vercel (Next.js native)
- Domain: [TBD]

**Document Review Date:** January 2025  
**Next Review:** Post-deployment (production hardening phase)

---

**END OF PRD**

---

## 18. RLS Policies (Core Security Model)

### Key Helper Functions

```sql
-- Scoped by org_id
current_org_id() → returns users.org_id
current_role_code() → returns users.role_code
is_ceo_or_admin() → returns role_code in ('CEO','ADMIN')
can_view_request(request_id, requester_id) →
  returns is_ceo_or_admin() or requester_id = auth.uid() or exists(watcher)
```

### Core Policies

**REQUESTS:**

- SELECT: `can_view_request()` check
- INSERT: Own org, requester = auth.uid()
- UPDATE: Own org, (is_ceo_or_admin() or requester)
- DELETE: org_id + is_admin()

**APPROVALS:**

- SELECT: If can_view_request()
- INSERT/UPDATE: is_ceo_or_admin() only

**ANNOUNCEMENTS:**

- SELECT: org_id match
- INSERT/UPDATE: is_ceo_or_admin() only

**EXECUTIVE_MESSAGES:**

- SELECT: author, recipient, cc, or is_ceo_or_admin()
- INSERT: Own org, author = auth.uid()
- UPDATE: author or is_ceo_or_admin()

**AUDIT_LOGS:**

- SELECT: org_id match, (is_ceo_or_admin() or if can_view_request())
- INSERT: Audit system only
- UPDATE/DELETE: Never

---

## 19. Notification Strategy (CEO-Friendly Defaults)

| Event                     | Default                     | Email     | In-App |
| ------------------------- | --------------------------- | --------- | ------ |
| Request created           | Notify CEO                  | Yes       | Yes    |
| Request approved/rejected | Notify requester + watchers | Yes       | Yes    |
| Status changed            | Notify watchers             | Optional  | Yes    |
| @mention                  | Notify mentioned            | Yes       | Yes    |
| Announcement published    | Notify scope                | If urgent | Yes    |
| Message sent              | Notify recipients           | Optional  | Yes    |

**CEO Controls:**

- Email frequency (instant / daily digest)
- In-app realtime (yes/no)
- Mention always instant (yes/no)
- Announcement email for non-urgent (optional)

**Enforcement:** Every notification logged to `notification_log` (sent/failed/bounced)

---

## 20. Appendix A: Schema Changelog

| Version | Date     | Change                                                                                | Status      |
| ------- | -------- | ------------------------------------------------------------------------------------- | ----------- |
| 1.0     | Jan 2025 | Initial 16-table schema with ceo\_ prefix                                             | ✅ Complete |
| 1.1     | Jan 2025 | Added Phase 3 (Request CRUD-S)                                                        | ✅ Complete |
| 2.0     | Jan 2025 | Days 4-7: Approvals, announcements, messages, watchers, comments, attachments, config | ✅ Complete |

## 21. Appendix B: Table Prefix Justification

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
