<!-- RCF_VERSION: 2.2.0 | AUTHORITATIVE SOURCE -->
<!-- This document is the SINGLE SOURCE OF TRUTH for all PRD rules -->
<!-- All other PRD documents MUST derive from this file -->
<!-- If any document conflicts with this file, THIS FILE IS CORRECT -->

Yes — you are **100% right**, and your instinct here is correct.

What you’re asking for is **not a rewrite of meaning**, but a **rewrite of structure** so that:

- An IDE / AI assistant / future developer can **mechanically follow rules**
- Ambiguity is eliminated
- “Looks compliant” ≠ “Is compliant”
- PRD becomes **enforceable**, not narrative

Below is an **IDE-friendly, instruction-grade version** of your PRD using:

- **RCF (Requirements & Compliance Framework)**
- **Allowed / Forbidden matrices**
- **DoD (Definition of Done) gates**
- **Machine-checkable language**
- **No prose ambiguity**

This version is suitable as:

- `.PRD/PRD_CEO_REQUEST_TICKET_IDE.md`
- Cursor / Copilot / Claude system prompt
- Code review checklist
- CI compliance checklist

---

# CEO REQUEST MANAGEMENT SYSTEM

## IDE-Friendly PRD (RCF / DoD / Allowed–Forbidden)

**Version:** 2.2-IDE
**Status:** AUTHORITATIVE — USE FOR IMPLEMENTATION
**Supersedes:** Narrative PRD for engineering decisions
**Audience:** IDEs, AI agents, reviewers, CI enforcement

---

## 1. RCF-0 — EXECUTIVE INTENT (LOCKED)

### RCF-0.1 Purpose

The system SHALL:

- Enable managers to submit requests
- Allow ONLY the CEO to approve or reject
- Record ALL state changes in an immutable audit log
- Serve as the single source of executive direction

### RCF-0.2 Explicit Non-Goals

The system SHALL NOT:

- Act as chat software
- Support realtime messaging
- Allow multi-level approvals
- Allow non-executive users

---

## 2. RCF-1 — USER ROLES (ENUM LOCK)

### Allowed Roles

<!-- RCF:ROLES:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
```ts
type RoleCode = "MANAGER" | "CEO" | "ADMIN";
```
<!-- RCF:ROLES:END -->

### Forbidden

- ❌ Any role outside enum
- ❌ Role inference from UI
- ❌ Hardcoded role assumptions

---

## 3. RCF-2 — TABLE NAMING & ISOLATION (HARD RULE)

### Rule

ALL database tables MUST:

- Be prefixed with `ceo_`
- Live in `public` schema
- Have RLS enabled

### Allowed

<!-- RCF:TABLES:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
```sql
ceo_config
ceo_organizations
ceo_users
ceo_categories
ceo_requests
ceo_request_approvals
ceo_request_watchers
ceo_request_comments
ceo_request_attachments
ceo_announcements
ceo_announcement_reads
ceo_executive_messages
ceo_executive_message_reads
ceo_audit_logs
ceo_notification_log
ceo_ref_reason_codes
```
<!-- RCF:TABLES:END -->

### Forbidden

```sql
requests
approvals
audit_logs
```

❌ **Any code referencing a non-prefixed table is invalid**

---

## 4. RCF-3 — AUTHENTICATION (SERVER-ONLY)

### Required Pattern

```ts
import "server-only";

const {
  data: { user },
} = await auth.getUser();
```

### Forbidden

- ❌ `auth.getSession()` in server routes
- ❌ Client-side Supabase access for mutations
- ❌ Service role key in browser code

---

## 5. RCF-4 — STATUS LIFECYCLE (FINITE STATE MACHINE)

### Allowed Status Enum

<!-- RCF:STATUS:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
```ts
type RequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "CLOSED";
```
<!-- RCF:STATUS:END -->

### Allowed Transitions (ONLY)

<!-- RCF:FSM:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
```txt
DRAFT → SUBMITTED | CANCELLED
SUBMITTED → IN_REVIEW | CANCELLED
IN_REVIEW → APPROVED | REJECTED | CANCELLED
APPROVED → CLOSED
REJECTED → SUBMITTED
```
<!-- RCF:FSM:END -->

### Forbidden Transitions

- ❌ Requester setting APPROVED / REJECTED / CLOSED
- ❌ Skipping SUBMITTED on resubmit
- ❌ Direct PATCH to terminal states

---

## 6. RCF-5 — APPROVAL AUTHORITY (CEO-ONLY)

### Rules

- ONLY users with role_code ∈ {CEO, ADMIN} MAY:

  - Approve
  - Reject
  - Close requests

- ALL approvals MUST:

  - Bind to `request_version`
  - Increment `approval_round`
  - Store `request_snapshot`

### Forbidden

- ❌ Any approval without snapshot
- ❌ Multiple approvers
- ❌ Approval without audit log

---

## 7. RCF-6 — AUDIT LOGGING (NON-NEGOTIABLE)

### Audit Rules

- EVERY state-changing operation MUST call:

```ts
writeAuditLog();
```

- Audit inserts MUST:

  - Use service role
  - Bypass RLS
  - Target `ceo_audit_logs`

### Forbidden

- ❌ Direct `.insert()` to `ceo_audit_logs`
- ❌ Session client audit writes
- ❌ Missing audit entries

---

## 8. RCF-7 — NOTIFICATION LOGGING

### Allowed Event Types (ENUM LOCK)

<!-- RCF:EVENTS:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
```ts
type NotificationEvent =
  | "request_created"
  | "approval_decision"
  | "status_change"
  | "mention"
  | "watcher_added"
  | "announcement_published"
  | "message_sent";
```
<!-- RCF:EVENTS:END -->

### Rules

- ALL notifications MUST be logged
- Writes MUST satisfy RLS or use service role

### Forbidden

- ❌ `user_mentioned`
- ❌ Free-text event types
- ❌ Client-side inserts

---

## 9. RCF-8 — EXECUTIVE MESSAGES (NOT CHAT)

### Message Types

<!-- RCF:MESSAGES:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
```ts
type MessageType =
  | "consultation"
  | "direction"
  | "clarification";
```
<!-- RCF:MESSAGES:END -->

### Rules

- Each message MUST reference:

  - request_id OR
  - announcement_id OR
  - be CEO-only general message

### Forbidden

- ❌ Threads
- ❌ Emoji / reactions
- ❌ Realtime semantics

---

## 10. RCF-9 — COMMENTS & MENTIONS

### Mention Rules

- Mentions MUST respect:

  - `mention_max_per_comment` from `ceo_config`

- Mention scope:

  - requester
  - watchers
  - approver

### Forbidden

- ❌ Reading non-existent config fields
- ❌ Unlimited mentions

---

## 11. RCF-10 — ATTACHMENTS & STORAGE

### Schema Contract (LOCKED)

<!-- RCF:ATTACHMENTS:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
```sql
file_name
file_type
file_size
```
<!-- RCF:ATTACHMENTS:END -->

### Rules

- Bucket name: `request-attachments`
- Size/type limits enforced server-side
- DB insert MUST succeed under RLS

### Forbidden

- ❌ filename / content_type / size_bytes
- ❌ Client-side uploads without validation

---

## 12. RCF-11 — RLS COVERAGE (MANDATORY)

### Tables Requiring Policies

- ceo_requests
- ceo_request_comments
- ceo_request_watchers
- ceo_request_attachments
- ceo_executive_messages
- ceo_executive_message_reads
- ceo_notification_log
- ceo_categories

### Rule

❌ **No table with RLS enabled may lack explicit policies**

---

## 13. DoD — DEFINITION OF DONE (SHIP GATE)

A feature is **DONE** only if ALL are true:

### Code

- [ ] Type-check passes
- [ ] Lint passes
- [ ] No schema mismatch
- [ ] No forbidden transitions

### Data

- [ ] Audit rows written (verified via SQL)
- [ ] Notification rows valid
- [ ] RLS enforced across orgs

### Manual Validation

- [ ] Request lifecycle verified
- [ ] Approval path CEO-only
- [ ] Resubmit follows FSM
- [ ] Attachments upload & persist
- [ ] Messages audited

❌ **Failing any item blocks release**

---

## 14. IDE / AI ENFORCEMENT NOTES

This document is intended to be used as:

- System prompt for AI coding assistants
- Code review checklist
- CI policy reference
- Architectural guardrail

**If code contradicts this file, the code is wrong.**

---
