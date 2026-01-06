# Developer Reference Guide

**Project:** CEO Request Ticketing System  
**Version:** 2.2.0 (RCF)  
**Last Updated:** January 2026

---

## 1. Project Structure

```
├── app/                          # Next.js 16 App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage (auth redirect)
│   ├── admin/config/             # CEO config page
│   ├── announcements/            # Announcements list + create
│   ├── api/                      # API routes (15 endpoints)
│   ├── approvals/                # CEO approval queue
│   ├── auth/                     # Login + Signup
│   ├── dashboard/                # User dashboard
│   ├── messages/                 # Executive messaging
│   ├── onboarding/               # New org setup wizard
│   └── requests/                 # Request CRUD
│
├── components/                   # React components
│   ├── admin/                    # AdminConfigForm
│   ├── announcements/            # Banners, List
│   ├── approvals/                # Decision, Filters, List
│   ├── auth/                     # LogoutButton
│   ├── messages/                 # List, Tabs, SendForm
│   ├── requests/                 # Actions, Filters, Table
│   └── ui/                       # badge, button, card, label, textarea
│
├── lib/                          # Utilities & helpers
│   ├── auth/bootstrap.ts         # First-login org creation
│   ├── constants/
│   │   ├── status.ts             # FSM, status metadata, transitions
│   │   └── material-changes.ts   # Material change detection
│   ├── sanitize/index.ts         # Content sanitization
│   ├── server/                   # Server-only functions
│   │   ├── admin-config.ts
│   │   ├── announcements.ts
│   │   ├── approvals.ts
│   │   ├── approvals-data.ts
│   │   ├── dashboard.ts
│   │   ├── executive-messages.ts
│   │   ├── messages.ts
│   │   └── requests.ts
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Service role client + writeAuditLog
│   │   └── server-auth.ts        # Server auth client
│   ├── types/database.ts         # TypeScript types
│   ├── validations/request.ts    # Zod schemas
│   ├── glossary.schema.ts        # Glossary validation
│   └── state-machine.ts          # Legacy (use status.ts)
│
├── db/schema.sql                 # 16 tables with ceo_ prefix
├── docs/                         # Documentation
└── scripts/                      # Build scripts
```

---

## 2. Database Tables (16 Total)

All tables use `ceo_` prefix for shared instance isolation.

| Table                         | Purpose                      |
| ----------------------------- | ---------------------------- |
| `ceo_organizations`           | Tenant container             |
| `ceo_users`                   | User profiles with role_code |
| `ceo_config`                  | Per-org configuration        |
| `ceo_categories`              | Request categories           |
| `ceo_requests`                | Core request entity          |
| `ceo_request_approvals`       | Approval decisions           |
| `ceo_request_watchers`        | Request subscribers          |
| `ceo_request_comments`        | Request discussion           |
| `ceo_request_attachments`     | File attachments             |
| `ceo_announcements`           | CEO broadcasts               |
| `ceo_announcement_reads`      | Read/ACK tracking            |
| `ceo_executive_messages`      | 2-way messages               |
| `ceo_executive_message_reads` | Message tracking             |
| `ceo_audit_logs`              | Immutable audit trail        |
| `ceo_notification_log`        | Email/notification log       |
| `ceo_ref_reason_codes`        | Reference data               |

---

## 3. API Endpoints (15 Routes)

| Endpoint                              | Methods            | Purpose                  |
| ------------------------------------- | ------------------ | ------------------------ |
| `/api/auth/bootstrap`                 | POST               | First-login org creation |
| `/api/admin/config`                   | GET, PATCH         | CEO configuration        |
| `/api/admin/invite`                   | POST               | Send manager invites     |
| `/api/requests`                       | GET, POST          | List/create requests     |
| `/api/requests/[id]`                  | GET, PATCH, DELETE | Request CRUD             |
| `/api/requests/[id]/resubmit`         | POST               | Resubmit after rejection |
| `/api/requests/[id]/comments`         | POST               | Add comments             |
| `/api/requests/[id]/attachments`      | POST, DELETE       | File handling            |
| `/api/requests/[id]/watchers`         | POST, DELETE       | Watcher management       |
| `/api/approvals`                      | GET                | CEO approval queue       |
| `/api/approvals/[id]`                 | PATCH              | Approve/reject decision  |
| `/api/announcements`                  | GET, POST          | Announcements CRUD       |
| `/api/announcements/[id]/acknowledge` | POST               | ACK tracking             |
| `/api/messages`                       | GET, POST          | Executive messages       |
| `/api/messages/[id]`                  | GET, PATCH         | Message actions          |

---

## 4. Status Lifecycle (FSM)

```
DRAFT → SUBMITTED → IN_REVIEW → APPROVED → CLOSED
                 ↓            ↓
              CANCELLED    REJECTED → (resubmit) → SUBMITTED
```

### Status Codes

| Code        | Label     | Terminal |
| ----------- | --------- | -------- |
| `DRAFT`     | Draft     | No       |
| `SUBMITTED` | Submitted | No       |
| `IN_REVIEW` | In Review | No       |
| `APPROVED`  | Approved  | No       |
| `REJECTED`  | Rejected  | No       |
| `CANCELLED` | Cancelled | Yes      |
| `CLOSED`    | Closed    | Yes      |

### Valid Transitions

```typescript
// From lib/constants/status.ts
export const FSM_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["IN_REVIEW", "CANCELLED"],
  IN_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["CLOSED"],
  REJECTED: ["SUBMITTED"], // Resubmit
  CANCELLED: [],
  CLOSED: [],
};
```

---

## 5. Material Change Detection

Changes to these fields invalidate pending approvals:

```typescript
// From lib/constants/status.ts
export const MATERIAL_CHANGE_FIELDS = [
  "title",
  "description",
  "priority_code",
] as const;
```

Usage:

```typescript
import { isMaterialChange } from "@/lib/constants/status";

if (isMaterialChange(existingRequest, newData)) {
  await invalidateApproval({ requestId, reason: "Material change detected" });
}
```

---

## 6. Authentication Pattern

```typescript
// Server-side auth (API routes)
import { createServerAuthClient } from "@/lib/supabase/server-auth";

export async function GET() {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile with org_id
  const { data: profile } = await supabase
    .from("ceo_users")
    .select("org_id, role_code")
    .eq("id", user.id)
    .single();

  // Use profile.org_id for RLS-scoped queries
}
```

---

## 7. Audit Logging

```typescript
import { writeAuditLog } from "@/lib/supabase/server";

await writeAuditLog({
  org_id: orgId,
  user_id: userId,
  entity_type: "request",
  entity_id: requestId,
  action: "created",
  actor_role_code: roleCode,
  new_values: { title, description },
});
```

**Important:** Audit logs are write-only via service role. No RLS INSERT policy exists for users.

---

## 8. Validation Pattern

```typescript
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(200),
  priority_code: z.enum(["P1", "P2", "P3", "P4", "P5"]),
});

// Use safeParse (not parse) for error handling
const result = schema.safeParse(body);
if (!result.success) {
  return NextResponse.json(
    { error: result.error.errors[0]?.message },
    { status: 400 }
  );
}
```

---

## 9. PRD Compliance

This project uses [PRD_GUARD](https://github.com/pohlai88/PRD_GUARD) for document sync.

```bash
npm run prd:validate   # Sync check
npm run prd:check      # Code compliance
npm run prd:generate   # Regenerate docs
npm run validate:all   # Full pipeline
```

### Canonical Source

All constants sync from:

- **External:** `prd-guard/src/canonical.ts` (SSOT)
- **Runtime:** `lib/constants/status.ts` (inlined copy)

---

## 10. Scripts

```bash
npm run dev           # Development (Turbopack)
npm run build         # Production build
npm run type-check    # TypeScript validation
npm run lint          # ESLint
npm run lint:fix      # Auto-fix
npm run validate:all  # Type + Lint + Glossary + PRD
```

---

## 11. Environment Variables

| Variable                        | Required | Purpose                    |
| ------------------------------- | -------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Anonymous key (browser)    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Service role (server-only) |

---

## 12. Key Files Reference

| File                                                        | Purpose                    |
| ----------------------------------------------------------- | -------------------------- |
| [lib/constants/status.ts](../lib/constants/status.ts)       | FSM, transitions, metadata |
| [lib/supabase/server.ts](../lib/supabase/server.ts)         | writeAuditLog helper       |
| [lib/validations/request.ts](../lib/validations/request.ts) | Zod schemas                |
| [db/schema.sql](../db/schema.sql)                           | Full database schema       |
| [docs/REQUEST_CONSTITUTION.md](REQUEST_CONSTITUTION.md)     | Business rules             |
| [docs/CONVENTION_LOCK.md](CONVENTION_LOCK.md)               | Security patterns          |
