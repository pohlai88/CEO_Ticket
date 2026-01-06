# Database Schema Reference

**Project:** CEO Request Ticketing System  
**Version:** 2.2.0  
**Schema File:** [db/schema.sql](../db/schema.sql)

---

## Overview

- **16 tables** with `ceo_` prefix
- **RLS enabled** on all tables
- **Multi-tenant** via `org_id` column

---

## Table Inventory

### Core Entities

| Table | Columns | Purpose |
|-------|---------|---------|
| `ceo_organizations` | id, name, created_at | Tenant container |
| `ceo_users` | id, org_id, email, role_code, is_active | User profiles |
| `ceo_config` | id, org_id, config_key, config_value | Per-org settings |
| `ceo_categories` | id, org_id, name, is_active | Request categories |

### Request System

| Table | Columns | Purpose |
|-------|---------|---------|
| `ceo_requests` | id, org_id, title, description, status_code, priority_code, requester_id, request_version, created_at, submitted_at, approved_at, closed_at, deleted_at | Core request entity |
| `ceo_request_approvals` | approval_id, request_id, decision, notes, approved_by, request_snapshot, approval_round, is_valid | Approval decisions |
| `ceo_request_watchers` | id, request_id, user_id | Request subscribers |
| `ceo_request_comments` | id, request_id, author_id, content, visibility | Discussion threads |
| `ceo_request_attachments` | id, request_id, file_name, storage_path, uploaded_by | File attachments |

### Communications

| Table | Columns | Purpose |
|-------|---------|---------|
| `ceo_announcements` | id, org_id, title, content, announcement_type, target_scope, published_by, require_acknowledgement | CEO broadcasts |
| `ceo_announcement_reads` | id, announcement_id, user_id, read_at, acknowledged_at | Read/ACK tracking |
| `ceo_executive_messages` | id, org_id, message_type, context_type, author_id, subject, body, recipient_ids, status | 2-way messages |
| `ceo_executive_message_reads` | id, message_id, user_id, read_at, acknowledged_at | Message tracking |

### Operations

| Table | Columns | Purpose |
|-------|---------|---------|
| `ceo_audit_logs` | id, org_id, user_id, entity_type, entity_id, action, old_values, new_values, metadata | Immutable audit trail |
| `ceo_notification_log` | id, org_id, event_type, recipient_id, status, sent_at | Email/notification log |
| `ceo_ref_reason_codes` | id, org_id, code, label, category | Reference data |

---

## Key Constraints

### Foreign Keys

```sql
ceo_users.org_id → ceo_organizations.id
ceo_requests.org_id → ceo_organizations.id
ceo_requests.requester_id → ceo_users.id
ceo_request_approvals.request_id → ceo_requests.id
ceo_announcements.org_id → ceo_organizations.id
ceo_executive_messages.org_id → ceo_organizations.id
ceo_audit_logs.org_id → ceo_organizations.id
```

### Indexes

All tables have indexes on:
- `org_id` (tenant isolation)
- `created_at` (sorting)
- Entity-specific columns (status_code, requester_id, etc.)

---

## RLS Policies

### Standard Pattern

```sql
-- Users can only access their org's data
CREATE POLICY "org_isolation" ON ceo_requests
  FOR ALL USING (org_id = auth.current_org_id());
```

### Audit Log Protection

```sql
-- No INSERT policy = only service role can write
-- SELECT allowed for org members
CREATE POLICY "view_audit_logs" ON ceo_audit_logs
  FOR SELECT USING (org_id = auth.current_org_id());
```

---

## Enums & Types

### Status Codes

```sql
ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'CLOSED')
```

### Priority Codes

```sql
ENUM ('P1', 'P2', 'P3', 'P4', 'P5')
```

### Role Codes

```sql
ENUM ('CEO', 'ADMIN', 'MANAGER')
```

### Announcement Types

```sql
ENUM ('info', 'important', 'urgent')
```

### Message Types

```sql
ENUM ('consultation', 'direction', 'clarification')
```

---

## Deployment

```bash
# Run schema in Supabase SQL Editor
# Or via Supabase CLI:
supabase db push
```

### Verification Query

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'ceo_%'
ORDER BY table_name;
-- Should return 16 rows
```
