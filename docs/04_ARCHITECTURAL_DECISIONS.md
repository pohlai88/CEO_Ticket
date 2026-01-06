# Architectural Decisions Record

**Project:** CEO Request Ticketing System  
**Version:** 2.2.0  
**Last Updated:** January 2026

---

## ADR-001: Table Naming with `ceo_` Prefix

**Status:** ✅ Accepted  
**Priority:** Critical

### Context

Application deployed on shared Supabase instance where multiple projects coexist.

### Decision

All 16 database tables prefixed with `ceo_` for namespace isolation.

### Rationale

- Prevents table name collisions
- Clear schema ownership
- Future multi-tenant capability
- Easy to identify project tables in shared database

### Consequences

- All SQL queries use prefixed names
- Foreign keys reference prefixed tables
- RLS policies use prefixed names

---

## ADR-002: Audit Logging via Service Role

**Status:** ✅ Accepted  
**Priority:** Critical (Security)

### Context

Audit logs must be tamper-proof. Users should not write directly to audit table.

### Decision

- No RLS INSERT policy on `ceo_audit_logs`
- All writes via `writeAuditLog()` helper using service role
- Users can SELECT (read their org's logs)

### Implementation

```typescript
// lib/supabase/server.ts
export async function writeAuditLog(data: AuditLogData) {
  const supabase = createServiceClient();
  await supabase.from("ceo_audit_logs").insert(data);
}
```

### Consequences

- Audit integrity guaranteed at database level
- Application must use service role for writes
- Client cannot bypass via RLS

---

## ADR-003: FSM-Based Status Transitions

**Status:** ✅ Accepted  
**Priority:** High

### Context

Request status changes must follow defined workflow, not arbitrary updates.

### Decision

Finite State Machine (FSM) defines valid transitions:

```
DRAFT → SUBMITTED → IN_REVIEW → APPROVED → CLOSED
                              ↓
                           REJECTED → SUBMITTED (resubmit)
```

### Implementation

```typescript
// lib/constants/status.ts
export function canTransitionTo(
  from: RequestStatus,
  to: RequestStatus
): boolean {
  return FSM_TRANSITIONS[from]?.includes(to) ?? false;
}
```

### Consequences

- Invalid transitions rejected at API level
- Clear workflow documentation
- Predictable request lifecycle

---

## ADR-004: Material Change Invalidates Approvals

**Status:** ✅ Accepted  
**Priority:** High

### Context

If requester changes key fields after submission, pending approval becomes stale.

### Decision

Changes to `title`, `description`, or `priority_code` invalidate pending approvals.

### Implementation

```typescript
// lib/constants/status.ts
export const MATERIAL_CHANGE_FIELDS = ["title", "description", "priority_code"];

export function isMaterialChange(
  existing: Request,
  updated: Partial<Request>
): boolean {
  return MATERIAL_CHANGE_FIELDS.some(
    (field) =>
      updated[field] !== undefined && updated[field] !== existing[field]
  );
}
```

### Consequences

- Approval decisions always match current request state
- Requester aware changes require re-approval
- Audit trail captures invalidation reason

---

## ADR-005: Server-First Architecture

**Status:** ✅ Accepted  
**Priority:** High

### Context

Next.js 16 supports server components. Security requires server-side data fetching.

### Decision

- All data fetching in server components or API routes
- Client components only for interactivity (forms, buttons)
- No sensitive data passed to client

### Implementation

- Pages use server components (default)
- `'use client'` only for forms, event handlers
- API routes use `createServerAuthClient()`

### Consequences

- Smaller client bundle
- RLS enforced server-side
- No auth tokens exposed to client

---

## ADR-006: Zod Validation with safeParse

**Status:** ✅ Accepted  
**Priority:** Medium

### Context

Input validation needed on all API endpoints.

### Decision

- Use Zod for schema validation
- Always use `safeParse()` (not `parse()`) for error handling
- Return structured errors to client

### Implementation

```typescript
const result = schema.safeParse(body);
if (!result.success) {
  return NextResponse.json(
    { error: result.error.errors[0]?.message },
    { status: 400 }
  );
}
```

### Consequences

- Type-safe validation
- Consistent error responses
- No uncaught exceptions from validation

---

## ADR-007: PRD Compliance System

**Status:** ✅ Accepted  
**Priority:** High

### Context

Multiple PRD documents must stay synchronized. Constants must match canonical source.

### Decision

- External package [PRD_GUARD](https://github.com/pohlai88/PRD_GUARD) as SSOT
- RCF markers in documents for sync validation
- Pre-commit hooks enforce compliance

### Implementation

```bash
npm run prd:validate   # Document sync
npm run prd:check      # Code compliance
```

### Consequences

- Documents cannot drift
- Constants verified against canonical
- CI blocks non-compliant changes

---

## ADR-008: Soft Delete vs Cancel (Orthogonal)

**Status:** ✅ Accepted  
**Priority:** Medium

### Context

Need both "cancel request" (workflow action) and "delete request" (cleanup).

### Decision

- **Cancel:** Status transition to `CANCELLED` (permanent, audit-logged)
- **Soft Delete:** Sets `deleted_at` timestamp (restorable within 7 days)
- These are independent operations

### Implementation

- Cancel: `PATCH /api/requests/:id { target_status: 'CANCELLED' }`
- Delete: `DELETE /api/requests/:id { reason: '...' }`

### Consequences

- Cancelled requests visible in lists (filtered by status)
- Deleted requests hidden (filtered by `deleted_at IS NULL`)
- Both actions are audit-logged
