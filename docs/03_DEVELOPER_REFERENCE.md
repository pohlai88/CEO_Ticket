# Developer Quick Reference Guide

**Project:** CEO Request Management System  
**Version:** 1.0  
**Last Updated:** January 2025

---

## 1. Table Names (Ad-Hoc Isolation)

**ALL tables use `ceo_` prefix for shared instance isolation.**

```
Tenancy:         ceo_organizations, ceo_users, ceo_config
Categories:      ceo_categories
Requests:        ceo_requests, ceo_request_approvals, ceo_request_watchers,
                 ceo_request_comments, ceo_request_attachments
Announcements:   ceo_announcements, ceo_announcement_reads
Messages:        ceo_executive_messages, ceo_executive_message_reads
Operations:      ceo_audit_logs, ceo_notification_log, ceo_ref_reason_codes
```

---

## 2. API Route Pattern (Template)

```typescript
// app/api/requests/route.ts
import 'server-only';  // ← MUST be first

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/server/audit';

// Define schema
const createRequestSchema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  priority_code: z.enum(['P1', 'P2', 'P3', 'P4', 'P5'])
});

// GET: List requests
export async function GET(request: NextRequest) {
  // 1. Authenticate
  const { data: { user: authUser }, error: authError } = await auth.getUser();
  if (authError || !authUser?.id) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // 2. Get org context
  const { data: userData, error: userError } = await supabase
    .from('ceo_users')
    .select('org_id')
    .eq('id', authUser.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json(
      { success: false, error: 'USER_NOT_FOUND' },
      { status: 404 }
    );
  }

  const orgId = userData.org_id;

  // 3. Query with RLS isolation
  const { data: requests, error: queryError } = await supabase
    .from('ceo_requests')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (queryError) {
    console.error('GET /api/requests error:', {
      error: queryError,
      orgId,
      userId: authUser.id
    });
    return NextResponse.json(
      { success: false, error: 'QUERY_FAILED' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: requests });
}

// POST: Create request
export async function POST(request: NextRequest) {
  // 1. Authenticate
  const { data: { user: authUser }, error: authError } = await auth.getUser();
  if (authError || !authUser?.id) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // 2. Get org context
  const { data: userData, error: userError } = await supabase
    .from('ceo_users')
    .select('org_id')
    .eq('id', authUser.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json(
      { success: false, error: 'USER_NOT_FOUND' },
      { status: 404 }
    );
  }

  const orgId = userData.org_id;

  // 3. Validate input
  const body = await request.json();
  const validation = createRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: validation.error.flatten()
      },
      { status: 400 }
    );
  }

  const { title, description, category_id, priority_code } = validation.data;

  // 4. Create request
  const { data: newRequest, error: insertError } = await supabase
    .from('ceo_requests')
    .insert({
      org_id: orgId,
      title,
      description,
      category_id,
      priority_code,
      status_code: 'DRAFT',
      requester_id: authUser.id,
      request_version: 1
    })
    .select()
    .single();

  if (insertError) {
    console.error('POST /api/requests error:', {
      error: insertError,
      orgId,
      userId: authUser.id,
      requestData: { title, priority_code }
    });
    return NextResponse.json(
      { success: false, error: 'INSERT_FAILED' },
      { status: 500 }
    );
  }

  // 5. Audit log (service role)
  await writeAuditLog({
    org_id: orgId,
    user_id: authUser.id,
    action: 'REQUEST_CREATED',
    resource_type: 'request',
    resource_id: newRequest.id,
    metadata: { title, status: newRequest.status_code }
  });

  return NextResponse.json(
    { success: true, data: newRequest },
    { status: 201 }
  );
}
```

---

## 3. Common Patterns

### Authentication (Always Use This)

```typescript
const { data: { user: authUser }, error: authError } = await auth.getUser();
if (authError || !authUser?.id) {
  return NextResponse.json(
    { success: false, error: 'UNAUTHORIZED' },
    { status: 401 }
  );
}
const userId = authUser.id;
```

### Validation (Always Safe-Parse)

```typescript
const validation = mySchema.safeParse(body);
if (!validation.success) {
  return NextResponse.json(
    {
      success: false,
      error: 'VALIDATION_ERROR',
      details: validation.error.flatten()
    },
    { status: 400 }
  );
}
const data = validation.data;
```

### Audit Logging (Always Use Helper)

```typescript
// ❌ WRONG - Will fail RLS
await supabase.from('ceo_audit_logs').insert({ ... });

// ✅ CORRECT
await writeAuditLog({
  org_id: orgId,
  user_id: userId,
  action: 'REQUEST_CREATED',
  resource_type: 'request',
  resource_id: requestId,
  metadata: { title, status }
});
```

### Error Logging (Always Include Context)

```typescript
// ❌ WRONG - No context
console.error('Error:', error);

// ✅ CORRECT
console.error('POST /api/requests error:', {
  error: error,
  orgId,
  userId,
  requestData: { title, priority }
});
```

### Query with Org Isolation (Always Filter by org_id)

```typescript
// Get user's org context first
const { data: userData } = await supabase
  .from('ceo_users')
  .select('org_id')
  .eq('id', userId)
  .single();

const orgId = userData.org_id;

// Then query with RLS (org_id filter enforced by RLS policy)
const { data } = await supabase
  .from('ceo_requests')
  .select('*')
  .eq('org_id', orgId);  // RLS will enforce this anyway
```

---

## 4. File Organization

```
Request Ticket/
├── app/
│   ├── api/
│   │   └── requests/
│   │       ├── route.ts           (POST, GET)
│   │       └── [id]/
│   │           └── route.ts       (GET, PATCH, DELETE)
│   ├── requests/
│   │   ├── page.tsx               (List view)
│   │   ├── new/
│   │   │   └── page.tsx           (Create form)
│   │   └── [id]/
│   │       └── page.tsx           (Detail view)
│   └── ...
├── lib/
│   ├── auth.ts                    (Auth client)
│   ├── supabase/
│   │   ├── client.ts              (Supabase client instance)
│   │   ├── server.ts              (Server-side client)
│   │   └── admin.ts               (Service role client)
│   ├── server/
│   │   ├── audit.ts               (writeAuditLog helper)
│   │   └── ...
│   ├── types/
│   │   ├── database.ts            (Database interfaces)
│   │   └── api.ts                 (API response types)
│   └── validation/
│       └── schemas.ts             (Zod schemas)
├── db/
│   └── schema.sql                 (Database schema - ALL ceo_ prefixed)
├── PRD.md                         (Product Requirements Document)
├── SCHEMA_VALIDATION_REPORT.md    (Schema validation results)
└── ARCHITECTURAL_DECISIONS.md     (ADRs with rationale)
```

---

## 5. Environment Variables

**Required in `.env.local`:**

```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[public key]...
SUPABASE_SERVICE_ROLE_KEY=eyJ[secret key]...
```

**Never commit `.env.local`**

---

## 6. Common SQL Queries (For Testing)

### Verify Tables Exist

```sql
SELECT tablename FROM pg_tables 
WHERE tablename LIKE 'ceo_%' AND table_schema='public'
ORDER BY tablename;
-- Expected: 16 rows
```

### Check RLS Policies

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'ceo_%'
ORDER BY tablename;
-- Expected: 60+ rows
```

### View Audit Logs

```sql
SELECT * FROM ceo_audit_logs
WHERE org_id = '[your-org-id]'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 7. Troubleshooting

### Issue: "relation 'requests' does not exist"

**Problem:** Code or SQL is querying old table name  
**Solution:** Check schema uses `ceo_requests`, check code uses Supabase client (not hardcoded)  
**Verify:**
```sql
SELECT * FROM ceo_requests LIMIT 1;  -- Should work
SELECT * FROM requests LIMIT 1;       -- Should fail
```

### Issue: "new row violates row-level security policy"

**Problem:** Trying to write audit logs directly  
**Solution:** Use `writeAuditLog()` helper instead of `.insert()`  
**Check:**
```typescript
// ❌ WRONG
await supabase.from('ceo_audit_logs').insert({ ... });

// ✅ CORRECT
await writeAuditLog({ org_id, user_id, action, ... });
```

### Issue: "no row returned by statement" on `getUser()`

**Problem:** User authenticated but not in `ceo_users` table  
**Solution:** Check bootstrap logic in auth callback route  
**Verify:**
```sql
SELECT * FROM ceo_users WHERE id = '[user-id]';
-- Should return exactly one row
```

### Issue: Audit logs not appearing

**Problem:** No error, but logs don't show up  
**Solution:** Check service role key is set in SUPABASE_SERVICE_ROLE_KEY env var  
**Verify:**
```typescript
// In lib/server/audit.ts, verify adminClient is initialized
console.log('Service role key set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
```

---

## 8. Build & Deployment Checklist

Before deploying to production:

- [ ] All 16 tables exist in Supabase with `ceo_` prefix
- [ ] `npm run build` succeeds with 0 errors
- [ ] TypeScript `npm run lint` passes
- [ ] `.env.local` has all required vars (never commit)
- [ ] Test signup → bootstrap → create request → verify audit log
- [ ] Verify RLS policies work (can't access other org's data)
- [ ] Verify audit logs appear for all operations
- [ ] Check error logs for any warnings

---

## 9. Phase 3 Status

| Feature | Status | API Route | Database Tables | Pages |
|---------|--------|-----------|-----------------|-------|
| Request CRUD | ✅ Complete | POST/GET /api/requests | ceo_requests | /requests, /requests/new, /requests/[id] |
| Soft Delete | ✅ Complete | DELETE /api/requests/[id] | (deleted_at field) | - |
| Audit Logging | ✅ Complete | All routes | ceo_audit_logs | - |
| Status Tracking | ✅ Complete | PATCH /api/requests/[id] | (status_code field) | /requests/[id] detail |
| Comments | 🚧 UI Only | - | ceo_request_comments | - |
| Attachments | 🚧 UI Only | - | ceo_request_attachments | - |
| Watchers | 🚧 UI Only | - | ceo_request_watchers | - |

---

## 10. Resources

- **PRD:** [PRD.md](PRD.md) — Full product requirements
- **Validation Report:** [SCHEMA_VALIDATION_REPORT.md](SCHEMA_VALIDATION_REPORT.md) — Schema verification
- **Architectural Decisions:** [ARCHITECTURAL_DECISIONS.md](ARCHITECTURAL_DECISIONS.md) — Why key decisions made
- **Database Schema:** [db/schema.sql](db/schema.sql) — Complete schema (all ceo_ prefixed)
- **Type Definitions:** [lib/types/database.ts](lib/types/database.ts) — TypeScript interfaces

---

**Generated:** January 2025  
**Status:** Current for Phase 3  
**Next Update:** After Phase 4 completion

