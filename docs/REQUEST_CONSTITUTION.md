# REQUEST CONSTITUTION v1.0

**Document Version:** 1.0  
**Effective Date:** January 5, 2026  
**Last Updated:** January 5, 2026  
**Status:** IMMUTABLE (Frozen for MVP)

---

## PREAMBLE

This constitution establishes the immutable rules governing request lifecycle, approval mechanics, and system behavior in the CEO Request Ticketing System. All users acknowledge these rules upon signup.

**Core Principle:**
> Requests follow a strict lifecycle. Status transitions are deterministic. Approvals are immutable snapshots. Soft-delete is reversible access control. Cancel is irreversible business decision.

---

## SECTION 1: REQUEST STATUS LIFECYCLE

### 1.1 Valid Status Codes

Every request exists in one of these **7 states**:

| Status | Meaning | Editable | Notifications | Next States |
|--------|---------|----------|---|---|
| **DRAFT** | Initial, user editing | ✅ Yes | None | SUBMITTED, CANCELLED |
| **SUBMITTED** | Awaiting CEO review | ❌ No* | CEO notified | IN_REVIEW, CANCELLED |
| **IN_REVIEW** | CEO actively reviewing | ❌ No* | Optional | APPROVED, REJECTED, CANCELLED |
| **APPROVED** | CEO approved, execute | ❌ No* | Requester + watchers | CLOSED |
| **REJECTED** | CEO denied request | ❌ No* | Requester + watchers | SUBMITTED (resubmit) |
| **CANCELLED** | Permanently terminated | ❌ No | Watchers | (terminal) |
| **CLOSED** | Archived, read-only | ❌ No | None | (terminal) |

*Can only edit if material change + approval invalidation OR rejection.

### 1.2 Allowed Transitions

```
DRAFT ──SUBMIT──> SUBMITTED ──ESCALATE──> IN_REVIEW ──APPROVE──> APPROVED ──AUTO──> CLOSED
  │                   │                       │                      │
  └─CANCEL────────────┴───────────────────────┘                      └────────────────────────┘
                                                                       
REJECTED <──────────────── IN_REVIEW (CEO rejects)
   │                            │
   └──RESUBMIT──> SUBMITTED <───┘

CANCELLED: Terminal state (no further transitions)
CLOSED: Terminal state (read-only archive)
```

### 1.3 Transition Rules

**DRAFT → SUBMITTED:**
- Initiated by requester (Submit button)
- Triggers CEO notification
- Status immediately set to SUBMITTED
- `submitted_at` timestamp recorded

**SUBMITTED → IN_REVIEW (Optional):**
- Implicit when CEO opens approval queue
- Does not prevent CANCELLED transition

**IN_REVIEW → APPROVED:**
- CEO clicks Approve button
- Approval decision recorded with snapshot
- `approved_at` timestamp set
- Requester + watchers notified
- Status auto-transitions to CLOSED after 5 seconds (or manual)

**IN_REVIEW → REJECTED:**
- CEO clicks Reject + provides notes
- Approval decision recorded
- `rejected_at` timestamp set
- Requester can resubmit from Rejected state
- Requester notified with rejection reason

**REJECTED → SUBMITTED (Resubmit):**
- Requester can edit request
- Optional material change detection
- Upon resubmit: new approval_round created
- Approval reset to pending

**ANY → CANCELLED:**
- CEO or requester can cancel from DRAFT, SUBMITTED, IN_REVIEW
- Terminal: cannot be undone (separate from soft-delete)
- `status_code='CANCELLED'` is permanent business decision
- Requester notified

**APPROVED → CLOSED:**
- Automatic after approval
- Or manual via CEO dashboard
- Read-only archive

---

## SECTION 2: SOFT-DELETE vs CANCEL (ORTHOGONAL)

### 2.1 Soft-Delete (`deleted_at` field)

**Purpose:** Access control (hide from view, reversible)

**Mechanics:**
- Requester or CEO sets `deleted_at = now()`
- Request is hidden from list views (excluded by `deleted_at IS NULL` filter)
- All audit data retained
- Can be restored by requester or CEO

**Reversibility:**
- Restore window = `ceo_config.restore_window_days` (default: 7 days)
- After window: data permanently hard-deleted (per audit retention)
- Restore re-sets `deleted_at = null`

**Use Cases:**
- Requester created draft by mistake → soft-delete
- Requester changed mind before submission → soft-delete
- CEO wants to "tidy up" old drafts → soft-delete

**Rules:**
- Soft-deleted requests are excluded from all list views
- Separate toggle: "Show deleted requests" (admin feature)
- No status change (status_code remains unchanged)
- Soft-delete can be applied to any status

---

### 2.2 Cancel (`status_code='CANCELLED'`)

**Purpose:** Business decision (request is permanently rejected)

**Mechanics:**
- CEO or requester sets `status_code='CANCELLED'`
- Terminal state: cannot transition to any other status
- Requester notified
- Visible in audit trail

**Reversibility:**
- ❌ CANNOT be undone (not even by CEO)
- Terminal business decision
- Use soft-delete if you might need to recover

**Use Cases:**
- CEO explicitly rejects entire class of requests ("we're not hiring")
- Business decision changes (e.g., "Project X is cancelled")
- Requester no longer wants to pursue

**Rules:**
- CANCELLED ≠ REJECTED (different semantics)
- REJECTED = Request can be resubmitted
- CANCELLED = Request is permanently closed
- Cannot cancel a CLOSED request (use soft-delete)

---

### 2.3 Comparison Table

| Aspect | Soft-Delete | Cancel |
|--------|------------|--------|
| **Field** | `deleted_at` timestamp | `status_code='CANCELLED'` |
| **Visibility** | Hidden from lists | Visible in history |
| **Reversibility** | ✅ 7 days | ❌ Never |
| **Audit** | Retained (7+ days) | Retained (365+ days) |
| **Status** | Unchanged | Terminal |
| **Requester Can Do?** | Yes | Yes |
| **CEO Can Do?** | Yes | Yes |
| **Reason** | Access control | Business decision |

---

## SECTION 3: APPROVAL MECHANICS

### 3.1 Approval Snapshot

**Every approval captures request state** at decision time:

```json
{
  "approval_round": 1,
  "decision": "approved",
  "approved_by": "uuid-of-ceo",
  "decided_at": "2026-01-05T10:30:00Z",
  "request_snapshot": {
    "title": "Approve Q2 budget",
    "description": "...",
    "priority_code": "P1",
    "category_id": "...",
    "requester_id": "...",
    "request_version": 1
  }
}
```

**Purpose:** Approval binds to specific version. If request edited → approval invalidated.

### 3.2 Request Versioning

- `request_version` starts at 1
- Incremented on material change (after rejection or CEO approval)
- **Material fields:** `title`, `priority_code`, `category_id`
- Non-material (no version bump): description, watchers, attachments

### 3.3 Approval Invalidation

**When does an approval become invalid?**

1. **Material Edit After Submission:**
   - Requester edits title/priority/category after SUBMITTED
   - Approval is marked `is_valid = false`
   - Invalidation reason: `'material_edit'`
   - New approval round created

2. **Rejection:**
   - CEO rejects request
   - Requester can resubmit
   - New approval_round created

3. **Manual Revocation (CEO only):**
   - CEO can manually revoke approval via audit action
   - Rare; use cancel instead

---

## SECTION 4: SOFT-DELETE RULES

### 4.1 Restore Window

- Configured in `ceo_config.restore_window_days` (default: 7)
- **Window calculation:** `now() - deleted_at ≤ restore_window_days`
- After window expires: hard-delete (data removed from audit archive)

### 4.2 Hard-Delete

- Audit logs with `deleted_at` are retained per `audit_retention_days` (default: 365)
- After retention window: data purged from system
- No recovery possible after hard-delete

### 4.3 Soft-Delete UI

- Requester sees "Restore" button on deleted requests (if within window)
- CEO sees "Purge Permanently" (forces hard-delete)
- Default list view: excludes soft-deleted requests
- Admin toggle: "Show deleted" (dev/audit only)

---

## SECTION 5: AUDIT GUARANTEES

### 5.1 Immutable Audit Log

Every action logged to `audit_logs` table:

- **What:** entity_type, entity_id, action, old_values, new_values
- **Who:** user_id, actor_role_code, actor organization
- **When:** timestamp, correlation_id (for grouping related actions)
- **Why:** metadata (context, reason codes)

**Actions logged:**
- create, update, delete (soft), restored, status_transitioned
- approved, rejected, invalidated
- comment_added, watcher_added, attachment_uploaded
- announcement_published, message_sent, message_acknowledged
- config_changed

### 5.2 Non-Modifiable Audit

- Only inserts allowed to audit_logs
- No updates (prevents tampering)
- No deletes (immutable history)
- RLS enforces read access per org_id

### 5.3 Audit Retention

- Configured in `ceo_config.audit_retention_days` (default: 365)
- After retention window: audit entries hard-deleted
- Soft-deleted request metadata retained in corresponding audit entry

---

## SECTION 6: APPROVAL QUEUE RULES (CEO ONLY)

### 6.1 Queue Behavior

- Only CEO sees approval queue (`/app/approvals`)
- Shows all SUBMITTED and IN_REVIEW requests
- Sorted by priority (P1 first) then submitted_at
- CEO can open any request and decide

### 6.2 Approval Decisions

**Two buttons:**
1. **Approve** → Sets decision='approved', captures snapshot, notifies requester
2. **Reject** → Sets decision='rejected', provides rejection reason, allows resubmit

### 6.3 No Escalation

- Single approver: CEO only
- No "escalate to board" workflow
- No delegated approval
- CEO is final authority

---

## SECTION 7: NOTIFIABLE EVENTS

### 7.1 Events That Trigger Notifications

| Event | Notification | Email | In-App |
|-------|---|---|---|
| Request created (self) | No | No | No |
| Request submitted | CEO | Yes | Yes |
| Request approved | Requester + watchers | Yes | Yes |
| Request rejected | Requester + watchers | Yes | Yes |
| Request cancelled | Watchers | Optional | Yes |
| Comment added | @mentioned users + watchers | Instant | Yes |
| Watcher added | New watcher | Optional | Yes |
| Announcement published | Scope | Urgent only | Yes |
| Executive message sent | Recipients | Optional | Yes |

### 7.2 Notification Configuration

CEO configures in `ceo_config`:
- Email frequency: instant, daily digest, off
- In-app realtime: enabled/disabled
- Mention always instant: yes/no

---

## SECTION 8: CONSTITUTION ENFORCEMENT

### 8.1 Signature & Acknowledgement

- Org creates organization → must sign constitution
- First CEO login → digital signature recorded in `organizations.constitution_signed_at`
- Cannot proceed to dashboard without signature

### 8.2 Amendment Process

- Constitution is **frozen for MVP** (v1.0)
- Any changes require full org re-signature
- Version bumped to 2.0 (or later)
- Audit trail records all amendments

### 8.3 Violations

- System enforces rules at database level (RLS)
- Invalid status transitions rejected (API returns 400)
- Soft-delete outside restore window rejected
- Approval modifications prevented (immutable)

---

## SECTION 9: GLOSSARY BINDING

This constitution references concepts defined in `docs/glossary.ui.json`:

- **CRUD-S Lifecycle** (concept_id: 'crud_s')
- **Soft-Delete vs Cancel** (concept_id: 'soft_delete_vs_cancel')
- **Priority Selection Tree** (concept_id: 'priority_selection_tree')
- **Status Lifecycle** (concept_id: 'status_lifecycle')

All definitions in glossary are **authoritative and canonical**.

---

## FINAL RULES (NON-NEGOTIABLE)

1. **CEO is the sole approver.** No escalation, no delegation.
2. **Approvals are snapshots.** Immutable at decision time.
3. **Soft-delete is reversible.** Cancel is not.
4. **Status transitions are strict.** Invalid transitions rejected at API.
5. **Audit is immutable.** No modification or deletion.
6. **Restore window is enforced.** Hard-delete after window.
7. **Notifications are configured.** CEO controls defaults.
8. **Constitution is signed.** Org must acknowledge rules.

---

## SIGNATURE & ACKNOWLEDGEMENT

By signing up and using this system, you agree to:

✅ Follow all status transitions as defined  
✅ Understand soft-delete is temporary, cancel is permanent  
✅ Accept that CEO decisions are final  
✅ Honor the 7-day restore window  
✅ Trust immutable audit logs  
✅ Acknowledge CEO is sole approver  

---

**Document Status:** LOCKED  
**Next Review:** Post-MVP (Phase 2)  
**Amendment:** Requires full org re-signature + version bump
