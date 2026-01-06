# API Reference

**Project:** CEO Request Ticketing System  
**Version:** 2.2.0  
**Base URL:** `/api`

---

## Authentication

All endpoints require authentication via Supabase Auth.

```http
Authorization: Bearer <supabase_access_token>
```

---

## Requests API

### List Requests

```http
GET /api/requests
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status_code |
| `priority` | string | Filter by priority_code |
| `show_deleted` | boolean | Include soft-deleted |

**Response:** `{ requests: Request[] }`

---

### Create Request

```http
POST /api/requests
```

**Body:**

```json
{
  "title": "Request title",
  "description": "Optional description",
  "priority_code": "P3",
  "category_id": "uuid (optional)"
}
```

**Response:** `{ request: Request }` (status 201)

---

### Get Request

```http
GET /api/requests/:id
```

**Response:** `{ request: RequestWithRelations }`

---

### Update Request

```http
PATCH /api/requests/:id
```

**Body (content update):**

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority_code": "P2"
}
```

**Body (status transition):**

```json
{
  "target_status": "SUBMITTED",
  "notes": "Optional notes"
}
```

**Response:** `{ request: Request }`

---

### Delete Request (Soft)

```http
DELETE /api/requests/:id
```

**Body:**

```json
{
  "reason": "Deletion reason"
}
```

**Response:** `{ success: true }`

---

### Resubmit Request

```http
POST /api/requests/:id/resubmit
```

**Prerequisite:** Request must be in `REJECTED` status.

**Response:** `{ request: Request, approval: Approval }`

---

### Add Comment

```http
POST /api/requests/:id/comments
```

**Body:**

```json
{
  "content": "Comment text",
  "visibility": "public" | "internal"
}
```

---

### Manage Attachments

```http
POST /api/requests/:id/attachments
DELETE /api/requests/:id/attachments/:attachmentId
```

---

### Manage Watchers

```http
POST /api/requests/:id/watchers
DELETE /api/requests/:id/watchers/:userId
```

---

## Approvals API

### Get Approval Queue

```http
GET /api/approvals
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter: pending, approved, rejected, all |

**Response:** `{ approvals: Approval[] }`

---

### Make Decision

```http
PATCH /api/approvals/:id
```

**Body:**

```json
{
  "decision": "approved" | "rejected",
  "notes": "Decision notes"
}
```

**Response:** `{ approval: Approval }`

---

## Announcements API

### List Announcements

```http
GET /api/announcements
```

**Response:** `{ announcements: Announcement[] }`

---

### Create Announcement

```http
POST /api/announcements
```

**Body:**

```json
{
  "title": "Announcement title",
  "content": "Announcement content",
  "announcement_type": "info" | "important" | "urgent",
  "target_scope": "all" | "team" | "individuals",
  "require_acknowledgement": false
}
```

---

### Acknowledge Announcement

```http
POST /api/announcements/:id/acknowledge
```

**Response:** `{ success: true }`

---

## Messages API

### List Messages

```http
GET /api/messages
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | draft, sent, acknowledged, resolved |
| `type` | string | consultation, direction, clarification |

---

### Create Message

```http
POST /api/messages
```

**Body:**

```json
{
  "message_type": "consultation",
  "context_type": "request" | "announcement" | "general",
  "context_id": "uuid (if not general)",
  "subject": "Message subject",
  "body": "Message body",
  "recipient_ids": ["uuid", "uuid"]
}
```

---

### Message Actions

```http
GET /api/messages/:id
PATCH /api/messages/:id
```

**PATCH Body:**

```json
{
  "action": "send" | "acknowledge" | "resolve"
}
```

---

## Admin API

### Get Config

```http
GET /api/admin/config
```

---

### Update Config

```http
PATCH /api/admin/config
```

---

### Send Invites

```http
POST /api/admin/invite
```

**Body:**

```json
{
  "emails": ["manager1@example.com", "manager2@example.com"]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message"
}
```

| Status | Meaning                        |
| ------ | ------------------------------ |
| 400    | Bad Request (validation error) |
| 401    | Unauthorized (no auth)         |
| 403    | Forbidden (wrong role)         |
| 404    | Not Found                      |
| 500    | Server Error                   |
