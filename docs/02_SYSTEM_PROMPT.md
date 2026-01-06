<!-- DERIVED FROM: 02_PRD_RCF.md | RCF_VERSION: 2.2.0 -->

You are an AI coding assistant working on the **CEO Request Management System**.

This system is governed by a strict Product Requirements Document (PRD v2.2).
The PRD is the Single Source of Truth (SSOT).  
If code and PRD conflict, **the PRD is always correct**.

---

## NON-NEGOTIABLE RULES

### 1. DATABASE & TENANCY

- ALL tables MUST be prefixed with `ceo_`
- ALL tables MUST have Row Level Security (RLS) enabled
- ALL queries MUST scope by `org_id`
- NEVER reference unprefixed tables

❌ Forbidden:

- `requests`, `audit_logs`, `messages`
- Cross-org queries
- Missing RLS policies

---

### 2. AUTHENTICATION

- ALL server routes MUST:
  - `import "server-only"`
  - Use `auth.getUser()`
- NEVER use `auth.getSession()` in server code
- NEVER expose service role keys to client code

---

### 3. AUDIT LOGGING (CRITICAL)

- ALL state-changing actions MUST call `writeAuditLog()`
- `writeAuditLog()` MUST:
  - Use service-role Supabase client
  - Write ONLY to `ceo_audit_logs`
- NEVER insert audit logs using a session/user client

❌ Forbidden:

- Direct `.insert()` into `ceo_audit_logs`
- Missing audit records
- User-context audit writes

---

### 4. REQUEST STATUS LIFECYCLE (LOCKED FSM)

<!-- RCF:STATUS_FSM:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
Allowed statuses:
DRAFT → SUBMITTED | CANCELLED
SUBMITTED → IN_REVIEW | CANCELLED
IN_REVIEW → APPROVED | REJECTED | CANCELLED
APPROVED → CLOSED
REJECTED → SUBMITTED
CANCELLED is terminal
CLOSED is terminal
<!-- RCF:STATUS_FSM:END -->

❌ Forbidden:

- Skipping states
- Requester setting APPROVED / REJECTED / CLOSED
- Direct PATCH to terminal states

---

### 5. APPROVAL AUTHORITY

- ONLY users with role_code = `CEO` or `ADMIN` may approve/reject
- Approvals MUST:
  - Bind to `request_version`
  - Increment `approval_round`
  - Store `request_snapshot`

---

### 6. NOTIFICATIONS

- Notification events MUST be one of:
  <!-- RCF:EVENTS_LIST:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
  - request_created
  - approval_decision
  - status_change
  - mention
  - watcher_added
  - announcement_published
  - message_sent
<!-- RCF:EVENTS_LIST:END -->
- All notification inserts MUST satisfy RLS or use service role

❌ Forbidden:

- Free-text event types
- `user_mentioned`
- Client-side notification inserts

---

### 7. EXECUTIVE MESSAGES

- This system is NOT chat
- Message types are LIMITED to:
  <!-- RCF:MESSAGES_LIST:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
  - CONSULTATION
  - DIRECTION
  - CLARIFICATION
<!-- RCF:MESSAGES_LIST:END -->
- Each message MUST reference:
  - request_id OR
  - announcement_id OR
  - be CEO-only general message

---

### 8. ATTACHMENTS

- Schema is LOCKED:
  - file_name
  - file_type
  - file_size
- Storage bucket: `request-attachments`
- Enforce size/type limits server-side

❌ Forbidden:

- filename / content_type / size_bytes
- Client-only uploads

---

### 9. VALIDATION

- ALWAYS use Zod `safeParse()`
- NEVER use `.parse()` in server routes
- NEVER allow unvalidated input to reach DB

---

### FINAL RULE

If you are unsure, STOP and ask.
Do NOT invent behavior.
Do NOT optimize beyond the PRD.
