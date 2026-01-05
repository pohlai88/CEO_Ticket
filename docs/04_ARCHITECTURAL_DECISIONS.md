# Architectural Decisions Record (ADR)

**Project:** CEO Request Management System  
**Status:** Active Development (Phase 3 Complete)  
**Last Updated:** January 2025

---

## ADR-001: Table Naming Convention with `ceo_` Prefix

**Status:** ✅ **ACCEPTED**  
**Date Decided:** Phase 1 (Implementation verified in Phase 3)  
**Priority:** CRITICAL

### Context

The application is deployed on a **shared Supabase instance** where multiple projects coexist in the same PostgreSQL database. Without proper isolation, table names from different projects would collide, causing:
- Data corruption
- Security breaches (accessing other project's data)
- Unpredictable failures in production

### Decision

**All database tables must be prefixed with `ceo_` to create logical namespace isolation.**

This applies to ALL 16 tables:
```
ceo_organizations, ceo_users, ceo_config, ceo_categories, ceo_requests,
ceo_request_approvals, ceo_request_watchers, ceo_request_comments,
ceo_request_attachments, ceo_announcements, ceo_announcement_reads,
ceo_executive_messages, ceo_executive_message_reads, ceo_audit_logs,
ceo_notification_log, ceo_ref_reason_codes
```

### Rationale

1. **Safety:** Prevents accidental cross-project queries
2. **Compliance:** Meets shared instance requirements
3. **Clarity:** Table ownership is explicit in schema
4. **Scalability:** Enables future multi-tenant expansion
5. **Debugging:** Easier to trace which data belongs to which project

### Consequences

✅ **Positive:**
- Guaranteed table isolation
- No risk of name collisions
- Clear schema boundaries
- Future-proof architecture

⚠️ **Costs:**
- All SQL queries must reference prefixed names
- RLS policies must update 16 times
- Foreign keys must reference new names (25+ constraints)
- Initial implementation effort (~240 line changes)

### Alternatives Considered

**Option A: Separate Databases per Project** (Rejected)
- Pro: Complete isolation
- Con: Expensive (multiple PostgreSQL instances), complex management
- **Decision:** Too costly for ad-hoc instance

**Option B: Schema-Based Namespacing** (Rejected)
- Pro: Uses PostgreSQL schemas for isolation
- Con: Incompatible with Supabase's schema structure
- **Decision:** Not supported by managed service

**Option C: No Prefix, Rely on RLS Only** (Rejected)
- Pro: Simpler naming
- Con: RLS can be misconfigured; table collisions still possible
- **Decision:** Insufficient security guarantee

### Implementation Details

- **Schema File:** `db/schema.sql` (all tables prefixed)
- **Foreign Keys:** All constraints updated (~25 references)
- **RLS Policies:** All policies reference new names (~60 policies)
- **Helper Functions:** Updated to use `ceo_users` (4 functions)
- **Code:** All API routes use Supabase client (no hardcoding)

### Validation Status

- ✅ Schema validation report generated
- ✅ All 16 tables confirmed prefixed
- ✅ All foreign keys verified correct
- ✅ All RLS policies updated
- ✅ Code-to-schema alignment confirmed
- ✅ Ready for Supabase deployment

---

## ADR-002: Audit Logging via Service Role

**Status:** ✅ **ACCEPTED**  
**Date Decided:** Phase 1  
**Priority:** CRITICAL (Security)

### Context

The application must maintain a complete, tamper-proof audit trail of all state-changing operations for compliance and debugging. Users should **never** be able to directly insert audit logs (which would allow them to hide their actions).

### Decision

**Use a service-role client to write audit logs, bypassing RLS policies.**

All audit writes go through `writeAuditLog()` helper function:

```typescript
export async function writeAuditLog({
  org_id,
  user_id,
  action,
  resource_type,
  resource_id,
  metadata
}) {
  // Uses admin/service role client to bypass RLS
  await adminClient.from('ceo_audit_logs').insert({
    org_id,
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  });
}
```

### Rationale

1. **Security:** User client cannot bypass RLS; user cannot delete own audit logs
2. **Compliance:** Audit trail is immutable and authoritative
3. **Consistency:** Single code path ensures all operations logged
4. **Debuggability:** Complete history available for investigation

### Consequences

✅ **Positive:**
- Audit logs cannot be tampered with
- Consistent logging across all endpoints
- Compliant with audit requirements

⚠️ **Costs:**
- Must use service role (high privileges)
- Service role key must never be exposed to client
- Requires careful key management

### Alternatives Considered

**Option A: User Can Directly Write Audit Logs** (Rejected)
- Pro: Simpler code (no helper function)
- Con: Security vulnerability; users could delete own logs
- **Decision:** Unacceptable security risk

**Option B: PostgreSQL Triggers for Audit** (Rejected)
- Pro: Automatic, cannot be skipped
- Con: Complex, high performance impact, hard to debug
- **Decision:** Too complex for current scope; can revisit later

**Option C: External Audit Service** (Rejected)
- Pro: Centralized audit trail
- Con: Expensive, requires API integration, adds latency
- **Decision:** Overkill for current phase; database audit sufficient

### Implementation Details

- **Helper Function:** `lib/server/audit.ts` (exports `writeAuditLog`)
- **Table:** `ceo_audit_logs` (service role only, RLS enforced)
- **Usage:** All API routes call `writeAuditLog()` after state changes
- **Keys:** Service role key kept server-side only

### Example Usage

```typescript
// After creating a request
await writeAuditLog({
  org_id: orgId,
  user_id: userId,
  action: 'REQUEST_CREATED',
  resource_type: 'request',
  resource_id: request.id,
  metadata: { title: request.title, status: request.status_code }
});
```

---

## ADR-003: Server Authentication Pattern (`getUser()` over `getSession()`)

**Status:** ✅ **ACCEPTED**  
**Date Decided:** Phase 1  
**Priority:** HIGH

### Context

Supabase provides two methods for server-side authentication:
1. `auth.getUser()` — Makes a database call, always returns current state
2. `auth.getSession()` — Reads from request headers, can be stale

The choice impacts security, performance, and correctness.

### Decision

**Always use `auth.getUser()` on server-side routes. Never use `auth.getSession()`.**

```typescript
// ✅ CORRECT
const { data: { user: authUser } } = await auth.getUser();

// ❌ WRONG (Stale data possible)
const { data: { session } } = await auth.getSession();
```

### Rationale

1. **Correctness:** `getUser()` always reflects current state
2. **Security:** Cannot be spoofed via stale headers
3. **Consistency:** Same pattern across all routes
4. **Cost:** Database hit acceptable for API routes

### Consequences

✅ **Positive:**
- Authentication always current
- Impossible to spoof with stale tokens
- Consistent codebase
- Clear pattern for developers

⚠️ **Costs:**
- Extra database call per request (~5-10ms)
- Slightly higher latency
- Not suitable for high-frequency checks

### Alternatives Considered

**Option A: Use `getSession()` for Performance** (Rejected)
- Pro: Faster (no DB call)
- Con: Can be stale; possible security issues
- **Decision:** Security matters more than these microseconds

**Option B: Hybrid Approach** (Rejected)
- Pro: Fast for most cases, `getUser()` when needed
- Con: Complex logic; inconsistent patterns
- **Decision:** Simplicity wins; always use `getUser()`

### Implementation Details

- **Used In:** All 5 API routes in Phase 3
- **Pattern:** First check in every route handler
- **Error Handling:** Return 401 if no user or auth error

```typescript
import 'server-only';
import { auth } from '@/lib/auth';

// First line of every endpoint
const { data: { user: authUser }, error: authError } = await auth.getUser();
if (authError || !authUser?.id) {
  return Response.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
}
const userId = authUser.id;
```

---

## ADR-004: Validation with `safeParse()` over `parse()`

**Status:** ✅ **ACCEPTED**  
**Date Decided:** Phase 1  
**Priority:** HIGH

### Context

Zod provides two validation methods:
1. `schema.parse()` — Throws exception on error
2. `schema.safeParse()` — Returns `{ success, data|error }` object

Exceptions from `.parse()` can crash the request handler if not caught carefully.

### Decision

**Always use `zod.safeParse()` on server routes. Never use `.parse()` without exception handling.**

```typescript
// ✅ CORRECT
const validation = createRequestSchema.safeParse(body);
if (!validation.success) {
  return Response.json({
    success: false,
    error: 'VALIDATION_ERROR',
    details: validation.error.flatten()
  }, { status: 400 });
}
const data = validation.data;

// ❌ DANGEROUS (Can crash handler if not caught)
try {
  const data = createRequestSchema.parse(body);
} catch (error) {
  // Must handle everywhere; easy to forget
}
```

### Rationale

1. **Safety:** Impossible to crash from bad input
2. **Clarity:** Error handling is explicit, not implicit
3. **Consistency:** Same pattern across all validations
4. **Debuggability:** Error details always available

### Consequences

✅ **Positive:**
- Request handler cannot crash from invalid input
- Error responses consistent
- Validation errors handled explicitly
- Type-safe data usage

⚠️ **Costs:**
- Slightly more verbose (extra `if (!validation.success)` check)
- Need to understand `FlattenedErrors` structure
- Cannot use exception flow

### Alternatives Considered

**Option A: Use `.parse()` with Try-Catch** (Rejected)
- Pro: Slightly less verbose
- Con: Can forget try-catch; inconsistent error handling
- **Decision:** Too risky; safeParse enforces safety

**Option B: Custom Validation Middleware** (Rejected)
- Pro: Centralized validation
- Con: Complex, not Zod-idiomatic, harder to debug
- **Decision:** safeParse is the standard pattern

### Implementation Details

- **Used In:** All API route handlers (POST, PATCH endpoints)
- **Pattern:** Validate immediately after parsing request body

```typescript
const body = await request.json();
const validation = createRequestSchema.safeParse(body);
if (!validation.success) {
  return Response.json({
    success: false,
    error: 'VALIDATION_ERROR',
    message: 'Invalid request payload',
    details: validation.error.flatten()
  }, { status: 400 });
}
const { title, description, category_id, priority_code } = validation.data;
```

---

## ADR-005: `import 'server-only'` Guard on API Routes

**Status:** ✅ **ACCEPTED**  
**Date Decided:** Phase 3  
**Priority:** MEDIUM

### Context

Next.js 16 allows files to be imported from both server and client contexts. API route files (in `app/api/`) should **only** run on the server and should fail loudly if accidentally imported on the client.

### Decision

**Add `import 'server-only'` as the first import in all API route files.**

```typescript
// app/api/requests/route.ts
import 'server-only';  // ← MUST be first import

import { auth } from '@/lib/auth';
// ... rest of imports
```

### Rationale

1. **Safety:** Catches accidental client-side imports at build time
2. **Clarity:** Makes intent explicit ("this is server-only")
3. **Consistency:** Pattern applied to all API routes
4. **Future-Proofing:** Prevents bugs if code is refactored

### Consequences

✅ **Positive:**
- Build fails if code is accidentally imported on client
- Clear server-only intent
- No performance impact
- Prevents security leaks of service role keys

⚠️ **Costs:**
- One extra line per file
- Requires developers to know this pattern

### Alternatives Considered

**Option A: No Guard** (Rejected)
- Pro: One less line
- Con: Silent failure if imported on client; security risk
- **Decision:** Risk unacceptable

**Option B: TypeScript-Only Check** (Rejected)
- Pro: No runtime overhead
- Con: Only catches type errors; runtime risk remains
- **Decision:** server-only provides better guarantee

### Implementation Details

- **Package:** `server-only` (npm package, included by Next.js)
- **Placement:** First import in every file in `app/api/`
- **Build Behavior:** Fails build if client-side import detected

**Files Updated:**
- ✅ `app/api/requests/route.ts`
- ✅ `app/api/requests/[id]/route.ts`

---

## ADR-006: RLS-Enforced Multi-Tenancy

**Status:** ✅ **ACCEPTED**  
**Date Decided:** Phase 1  
**Priority:** CRITICAL (Security)

### Context

Multi-tenant applications must prevent cross-tenant data access. The enforcement must happen at the database layer (RLS policies), not just the application layer.

### Decision

**Enable Row-Level Security (RLS) on ALL tables and enforce tenant isolation via `org_id` column.**

Every table has:
1. `org_id` column (foreign key to `ceo_organizations`)
2. RLS policy: Users can only access rows matching their `org_id`

```sql
-- Example policy
CREATE POLICY "Users can view org requests"
ON ceo_requests
FOR SELECT
USING (org_id = current_org_id());
```

Helper function determines current org:
```sql
CREATE FUNCTION current_org_id() RETURNS UUID AS $$
  SELECT org_id FROM ceo_users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;
```

### Rationale

1. **Security:** Database enforces access control
2. **Defense-in-Depth:** Application bugs cannot leak data
3. **Compliance:** Meets regulatory requirements
4. **Auditability:** RLS violations are logged

### Consequences

✅ **Positive:**
- Guaranteed tenant isolation at DB layer
- Cannot accidentally leak cross-tenant data
- RLS violations logged automatically

⚠️ **Costs:**
- RLS policies must be correct (60+ policies to test)
- Small performance overhead (policy evaluation)
- Requires careful testing of edge cases

### Policy Coverage

| Table | Policies | Scope |
|-------|----------|-------|
| ceo_requests | 4 | SELECT, INSERT, UPDATE, DELETE per role |
| ceo_users | 3 | SELECT, UPDATE (limited fields) |
| ceo_audit_logs | 1 | SELECT (read-only for audit) |
| ceo_announcements | 3 | SELECT, INSERT (admins), UPDATE |
| ... | ... | All 16 tables have RLS enabled |

---

## ADR-007: Snowflake-Style JSON Metadata Columns

**Status:** ✅ **ACCEPTED**  
**Date Decided:** Phase 1  
**Priority:** MEDIUM

### Context

The `ceo_requests` table has flexible metadata requirements:
- Title, description, priority, category (structured)
- Priority label customizations, request snapshots (unstructured)
- Notifications settings, feature flags (dynamic)

Using fixed columns for everything would be rigid. JSON columns allow flexibility.

### Decision

**Use JSONB columns for flexible, schema-less metadata.**

```sql
CREATE TABLE ceo_requests (
  -- Structured columns
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  title TEXT NOT NULL,
  status_code TEXT NOT NULL,
  
  -- Flexible metadata (JSONB)
  metadata JSONB DEFAULT '{}',
  
  -- ... other columns
);
```

### Examples

```json
// metadata column content
{
  "custom_field_1": "value",
  "approval_snapshot": { /* full request state */ },
  "notification_settings": { "email": true, "sms": false },
  "tags": ["urgent", "budget-related"]
}
```

### Rationale

1. **Flexibility:** Add fields without migrations
2. **Performance:** JSONB is indexed and searchable
3. **Scalability:** Handles future unknown requirements
4. **Simplicity:** Avoids EAV patterns

### Consequences

✅ **Positive:**
- No schema migrations for metadata changes
- JSONB indexes for queries
- Type-flexible data

⚠️ **Costs:**
- No type safety for JSON content
- Must validate at application layer (Zod)
- Requires careful querying

### Validation Strategy

All JSON data validated with Zod before insert:

```typescript
const MetadataSchema = z.object({
  custom_field_1: z.string().optional(),
  approval_snapshot: z.any().optional(),
  notification_settings: z.object({
    email: z.boolean(),
    sms: z.boolean()
  }).optional()
});
```

---

## ADR-008: Organization Bootstrap on First Login

**Status:** ✅ **ACCEPTED**  
**Date Decided:** Phase 2  
**Priority:** MEDIUM

### Context

The system supports multi-organization deployments, but for MVP, each user should automatically belong to an organization. Should this happen at signup or at first login?

### Decision

**Bootstrap organization at first login (POST /api/auth/callback).**

```
User Signs Up
  ↓
Email Verification (Supabase Auth)
  ↓
First Login → Callback Handler Checks ceo_users
  ├─ If ceo_users.id exists → Load org
  └─ If NOT exists → CREATE org + user record
  ↓
Redirect to Onboarding Form (collect name, etc.)
```

### Rationale

1. **Safety:** Email verified before bootstrap
2. **Flexibility:** Can create custom org before using system
3. **Consistency:** Every user has exactly one org (v1)
4. **Future-Proof:** Can add org selection later

### Consequences

✅ **Positive:**
- Email verified before database records created
- Simple, predictable flow
- Easy to debug

⚠️ **Costs:**
- Cannot use app before email verified
- Assumes 1 org per user (will need upgrade for multi-org)

### Alternative: Bootstrap at Signup (Rejected)

- Con: Creates records before email verification
- Con: Unverified emails create orphan records
- **Decision:** Less safe; verify first, bootstrap second

---

## Summary Table

| ADR | Decision | Status | Impact |
|-----|----------|--------|--------|
| 001 | `ceo_` table prefix | ✅ Implemented | CRITICAL (security) |
| 002 | Service role audit logs | ✅ Implemented | CRITICAL (compliance) |
| 003 | `auth.getUser()` pattern | ✅ Implemented | HIGH (correctness) |
| 004 | `safeParse()` validation | ✅ Implemented | HIGH (safety) |
| 005 | `import 'server-only'` | ✅ Implemented | MEDIUM (clarity) |
| 006 | RLS multi-tenancy | ✅ Implemented | CRITICAL (security) |
| 007 | JSONB metadata | ✅ Implemented | MEDIUM (flexibility) |
| 008 | Bootstrap at login | ✅ Implemented | MEDIUM (UX) |

---

**Document Status:** Complete and Current  
**Last Updated:** January 2025  
**Next Review:** After Phase 4 completion

