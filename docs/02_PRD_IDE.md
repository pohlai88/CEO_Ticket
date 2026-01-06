# PRD IDE RULES — CEO REQUEST SYSTEM

<!-- DERIVED FROM: 02_PRD_RCF.md | RCF_VERSION: 2.2.0 -->

## LOCKED ENUMS

<!-- RCF:ENUMS:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
### RoleCode
- MANAGER
- CEO
- ADMIN

### RequestStatus
- DRAFT
- SUBMITTED
- IN_REVIEW
- APPROVED
- REJECTED
- CANCELLED
- CLOSED

### NotificationEvent
- request_created
- approval_decision
- status_change
- mention
- watcher_added
- announcement_published
- message_sent

### MessageType
- consultation
- direction
- clarification
<!-- RCF:ENUMS:END -->

---

## FORBIDDEN ACTIONS

<!-- RCF:FORBIDDEN:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
- `auth.getSession(`
- `from('audit_logs')`
- `from("audit_logs")`
- `from('requests')`
- `from("requests")`
- `user_mentioned`
- `filename:`
- `content_type:`
- `size_bytes:`
<!-- RCF:FORBIDDEN:END -->

---

## REQUIRED PATTERNS

<!-- RCF:REQUIRED:START -->
<!-- AUTO-GENERATED FROM prd-guard/canonical.ts — DO NOT EDIT -->
- `import "server-only"`
- `import 'server-only'`
- `writeAuditLog(`
<!-- RCF:REQUIRED:END -->
