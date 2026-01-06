# CEO Request Management System — Reference Architecture

<!-- ARCHITECTURE_VERSION: 1.0.0 | FROZEN -->
<!-- This document is the IMMUTABLE architectural reference -->
<!-- Any change requires formal change control per Section 5 -->

**System:** CEO Request Management System  
**Architecture Version:** 1.0.0  
**RCF Version:** 2.2.0  
**Status:** FROZEN  
**Freeze Date:** January 6, 2026  
**Guardrail Repository:** [PRD_GUARD](https://github.com/pohlai88/PRD_GUARD)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Component Map](#2-component-map)
3. [Control Flow Diagrams](#3-control-flow-diagrams)
4. [Governance Boundaries](#4-governance-boundaries)
5. [Architectural Decision Log](#5-architectural-decision-log)
6. [Change Control Rules](#6-change-control-rules)
7. [Appendix: Canonical Sources](#appendix-canonical-sources)

---

## 1. Executive Summary

### 1.1 System Purpose

The CEO Request Management System is an **executive governance instrument** that:

- Enables managers to submit requests requiring CEO approval
- Provides a single-authority approval workflow (CEO-only)
- Records all state changes in an immutable audit log
- Enforces role-based access control at database level

### 1.2 Architectural Principles

| Principle                  | Implementation                                                  |
| -------------------------- | --------------------------------------------------------------- |
| **Single Source of Truth** | PRD_GUARD canonical.ts defines all enums, FSM, tables           |
| **Authority Completeness** | Every executive action (E01-E15) verified at UI, API, DB layers |
| **Immutable Audit**        | Service-role only writes to ceo_audit_logs                      |
| **Fail-Loud**              | No silent failures; errors logged and displayed                 |
| **Zero Drift**             | PRD_GUARD pre-commit hooks block non-compliant code             |

### 1.3 Technology Stack

| Layer          | Technology            | Version |
| -------------- | --------------------- | ------- |
| Frontend       | Next.js (App Router)  | 16.1.x  |
| UI Framework   | React                 | 19.x    |
| Styling        | Tailwind CSS          | 4.x     |
| Language       | TypeScript            | 5.9.x   |
| Database       | PostgreSQL (Supabase) | 15.x    |
| Authentication | Supabase Auth         | -       |
| Validation     | Zod                   | 3.x     |
| Unit Testing   | Vitest                | 4.x     |
| E2E Testing    | Playwright            | 1.x     |
| Governance     | PRD_GUARD             | 2.2.0   |

---

## 2. Component Map

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages     │  │ Components  │  │   Forms     │              │
│  │  (Server)   │  │  (Client)   │  │  (Client)   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  /api/      │  │  /api/      │  │  /api/      │              │
│  │  requests   │  │  approvals  │  │  messages   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  lib/server │  │  lib/auth   │  │ lib/validat │              │
│  │  (Domain)   │  │  (AuthZ)    │  │ (Schemas)   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Supabase   │  │  RLS        │  │  Audit      │              │
│  │  Client     │  │  Policies   │  │  (Service)  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 PostgreSQL (Supabase)                       │ │
│  │  16 tables with ceo_ prefix | RLS enabled | Audit trail    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  PRD_GUARD  │  │  Pre-commit │  │  CI/CD      │              │
│  │  canonical  │  │  Hooks      │  │  Gates      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Directory Structure

```
CEO_Ticket/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── api/                      # API Routes
│   │   ├── requests/             # Request CRUD
│   │   ├── approvals/            # CEO approval actions
│   │   ├── messages/             # Executive messaging
│   │   ├── announcements/        # Admin announcements
│   │   └── auth/                 # Authentication
│   ├── requests/                 # Request pages
│   ├── approvals/                # Approval pages (CEO)
│   ├── messages/                 # Message pages
│   └── announcements/            # Announcement pages
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   ├── requests/                 # Request-specific
│   ├── approvals/                # Approval-specific
│   └── messages/                 # Message-specific
├── lib/                          # Core libraries
│   ├── auth/                     # Authentication helpers
│   ├── constants/                # Status, material changes
│   ├── server/                   # Server-side services
│   ├── supabase/                 # Supabase clients
│   ├── types/                    # TypeScript types
│   ├── validations/              # Zod schemas
│   └── state-machine.ts          # FSM implementation
├── db/                           # Database schema
│   └── schema.sql                # Full DDL
├── docs/                         # Documentation
│   ├── 02_PRD_*.md               # PRD documents
│   └── ARCHITECTURE.md           # This file
├── e2e/                          # E2E tests (Playwright)
│   ├── pages/                    # Page Object Model
│   ├── factories/                # Test data factories
│   ├── helpers/                  # DB verification
│   └── executive-actions.spec.ts # E01-E15 tests
└── tests/                        # Unit tests (Vitest)
    └── unit/                     # Unit test suites
```

### 2.3 Database Schema (16 Tables)

| Table                         | Purpose                     | RLS         |
| ----------------------------- | --------------------------- | ----------- |
| `ceo_organizations`           | Multi-tenant isolation      | ✅          |
| `ceo_users`                   | User accounts linked to org | ✅          |
| `ceo_config`                  | System configuration        | ✅          |
| `ceo_categories`              | Request categories          | ✅          |
| `ceo_requests`                | Core request entity         | ✅          |
| `ceo_request_approvals`       | Approval decisions          | ✅          |
| `ceo_request_watchers`        | Request observers           | ✅          |
| `ceo_request_comments`        | Discussion thread           | ✅          |
| `ceo_request_attachments`     | File attachments            | ✅          |
| `ceo_announcements`           | Executive announcements     | ✅          |
| `ceo_announcement_reads`      | Read receipts               | ✅          |
| `ceo_executive_messages`      | CEO ↔ Manager messages      | ✅          |
| `ceo_executive_message_reads` | Message read status         | ✅          |
| `ceo_audit_logs`              | Immutable audit trail       | SELECT only |
| `ceo_notification_log`        | System notifications        | ✅          |
| `ceo_ref_reason_codes`        | Standardized reasons        | ✅          |

---

## 3. Control Flow Diagrams

### 3.1 Request Lifecycle (FSM)

```
                    ┌──────────┐
                    │  DRAFT   │
                    └────┬─────┘
                         │ submit
                         ▼
                    ┌──────────┐
            ┌───────│SUBMITTED │───────┐
            │       └────┬─────┘       │
            │ cancel     │ review      │ cancel
            ▼            ▼             │
       ┌──────────┐ ┌──────────┐       │
       │CANCELLED │ │IN_REVIEW │       │
       └──────────┘ └────┬─────┘       │
                         │             │
              ┌──────────┼──────────┐  │
              │ approve  │ reject   │  │
              ▼          ▼          │  │
        ┌──────────┐ ┌──────────┐   │  │
        │ APPROVED │ │ REJECTED │   │  │
        └────┬─────┘ └────┬─────┘   │  │
             │            │ resubmit│  │
             │ close      └────►────┘  │
             ▼                         │
        ┌──────────┐                   │
        │  CLOSED  │◄──────────────────┘
        └──────────┘
```

**Transition Rules (LOCKED):**

- `DRAFT → SUBMITTED | CANCELLED`
- `SUBMITTED → IN_REVIEW | CANCELLED`
- `IN_REVIEW → APPROVED | REJECTED | CANCELLED`
- `APPROVED → CLOSED`
- `REJECTED → SUBMITTED` (resubmit only)

### 3.2 Approval Authority Flow

```
┌─────────────┐     Submit      ┌─────────────┐
│   MANAGER   │────────────────►│   REQUEST   │
└─────────────┘                 └──────┬──────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │   PENDING   │
                                │  APPROVAL   │
                                └──────┬──────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
             ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
             │   APPROVE   │   │   REJECT    │   │   CANCEL    │
             │  (CEO ONLY) │   │  (CEO ONLY) │   │  (MANAGER)  │
             └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
                    │                 │                 │
                    ▼                 ▼                 ▼
             ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
             │  AUDIT LOG  │   │  AUDIT LOG  │   │  AUDIT LOG  │
             │  + NOTIFY   │   │  + NOTIFY   │   │  + NOTIFY   │
             └─────────────┘   └─────────────┘   └─────────────┘
```

**Authority Rules (LOCKED):**

- Only `CEO` role can execute `APPROVE` or `REJECT`
- `MANAGER` can `SUBMIT`, `CANCEL`, `RESUBMIT`
- `ADMIN` manages configuration and announcements

### 3.3 Audit + Notification Propagation

```
┌─────────────────┐
│  USER ACTION    │
│  (Any E01-E15)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     Service Role     ┌─────────────────┐
│   API ROUTE     │─────────────────────►│  ceo_audit_logs │
│                 │                      │  (IMMUTABLE)    │
└────────┬────────┘                      └─────────────────┘
         │
         ▼
┌─────────────────┐     Anon Key         ┌─────────────────┐
│ NOTIFICATION    │─────────────────────►│ceo_notification │
│   SERVICE       │                      │     _log        │
└────────┬────────┘                      └─────────────────┘
         │
         ▼
┌─────────────────┐
│   RESPONSE      │
│   (Success/Fail)│
└─────────────────┘
```

**Audit Integrity Rules (LOCKED):**

- `ceo_audit_logs` has NO insert policy for users
- All writes via `writeAuditLog()` using service role
- Users can SELECT their organization's logs only

---

## 4. Governance Boundaries

### 4.1 What Code MAY Change

| Category            | Path                                             | Change Allowed                   |
| ------------------- | ------------------------------------------------ | -------------------------------- |
| UI Components       | `components/**`                                  | Styling, layout, UX improvements |
| Page Content        | `app/**/page.tsx`                                | Text, arrangement, accessibility |
| Non-Material Fields | Request fields except title/description/priority | Extend with review               |
| Test Coverage       | `tests/**`, `e2e/**`                             | Add tests, improve assertions    |

### 4.2 What Code MUST NOT Change

| Category               | Path                                | Reason              |
| ---------------------- | ----------------------------------- | ------------------- |
| FSM Transitions        | `lib/state-machine.ts`              | Governance contract |
| Material Change Fields | `lib/constants/material-changes.ts` | Approval integrity  |
| Role Codes             | `RoleCode` type                     | Authority model     |
| Status Codes           | `RequestStatus` type                | Workflow integrity  |
| Audit Write Pattern    | `writeAuditLog()`                   | Tamper-proof audit  |
| Table Prefix           | `ceo_*`                             | Namespace isolation |
| RLS Policies           | `db/schema.sql` (RLS section)       | Security boundary   |

### 4.3 Canonical Sources of Truth (SSOT)

| Domain          | Canonical Source                                    | Consumers           |
| --------------- | --------------------------------------------------- | ------------------- |
| Roles           | `PRD_GUARD/canonical.ts` → `RoleCode`               | All role checks     |
| Status          | `PRD_GUARD/canonical.ts` → `RequestStatus`          | FSM, API, UI        |
| FSM             | `PRD_GUARD/canonical.ts` → `FSM_TRANSITIONS`        | state-machine.ts    |
| Tables          | `PRD_GUARD/canonical.ts` → `CEO_TABLES`             | schema.sql, queries |
| Material Fields | `PRD_GUARD/canonical.ts` → `MATERIAL_CHANGE_FIELDS` | Edit validation     |
| Glossary        | `docs/glossary.ui.json`                             | UI labels, tooltips |

---

## 5. Architectural Decision Log

### ADR-001: Table Naming with `ceo_` Prefix

**Decision:** All 16 database tables prefixed with `ceo_`  
**Rationale:** Shared Supabase instance requires namespace isolation  
**Status:** ACCEPTED — LOCKED

### ADR-002: Audit Logging via Service Role

**Decision:** No RLS INSERT on `ceo_audit_logs`; all writes via service role  
**Rationale:** Audit logs must be tamper-proof  
**Status:** ACCEPTED — LOCKED

### ADR-003: FSM-Based Status Transitions

**Decision:** Finite State Machine defines valid transitions  
**Rationale:** Predictable workflow, no ad-hoc status changes  
**Status:** ACCEPTED — LOCKED

### ADR-004: Material Change Invalidates Approvals

**Decision:** Changes to title, description, priority_code invalidate pending approvals  
**Rationale:** Approval decisions must match current request state  
**Status:** ACCEPTED — LOCKED

### ADR-005: Server-First Architecture

**Decision:** Data fetching in server components; client for interactivity only  
**Rationale:** Security, performance, RLS enforcement  
**Status:** ACCEPTED — LOCKED

### ADR-006: Zod Validation with safeParse

**Decision:** All API validation uses Zod with safeParse()  
**Rationale:** Type-safe validation, consistent error handling  
**Status:** ACCEPTED — LOCKED

### ADR-007: PRD_GUARD External Governance

**Decision:** PRD_GUARD package is the single enforcement engine  
**Rationale:** Decoupled governance, reusable across projects  
**Status:** ACCEPTED — LOCKED

### ADR-008: POM + DB-Verified E2E Testing

**Decision:** E2E tests use Page Object Model with database verification  
**Rationale:** UI pass alone is insufficient for executive systems  
**Status:** ACCEPTED — LOCKED

### ADR-009: Three-Layer Test Verification

**Decision:** Every executive action verified at UI, API, and DB layers  
**Rationale:** Executive actions require proof, not observation  
**Status:** ACCEPTED — LOCKED

---

## 6. Change Control Rules

### 6.1 Material Change Definition

A change is **MATERIAL** if it affects:

1. **FSM transitions** — Any new status or transition path
2. **Authority model** — Who can perform which actions
3. **Audit integrity** — How or when audit logs are written
4. **RLS policies** — Who can access which data
5. **Canonical sources** — Any PRD_GUARD canonical values

### 6.2 Required Re-Validation Steps

For ANY material change:

| Step | Action                                | Gate                   |
| ---- | ------------------------------------- | ---------------------- |
| 1    | Update PRD_GUARD canonical.ts         | MUST pass prd:validate |
| 2    | Update affected PRD documents         | MUST pass prd:check    |
| 3    | Update schema.sql if DB affected      | MUST pass type-check   |
| 4    | Update E2E tests for affected actions | MUST pass E01-E15      |
| 5    | Update this ARCHITECTURE.md           | MUST increment version |
| 6    | Commit with `[MATERIAL]` prefix       | MUST be explicit       |

### 6.3 Change Approval Authority

| Change Type              | Approver                     | Documentation            |
| ------------------------ | ---------------------------- | ------------------------ |
| Non-material (UI, text)  | Developer                    | PR review                |
| Material (FSM, roles)    | Technical Lead + Stakeholder | PRD update + ADR         |
| Governance (PRD_GUARD)   | System Owner                 | Version bump + changelog |
| Architecture (this file) | System Owner                 | Formal freeze update     |

### 6.4 Forbidden Changes

The following changes are **FORBIDDEN** without full governance review:

- ❌ Removing any E01-E15 test
- ❌ Bypassing CI gates
- ❌ Adding status codes not in FSM
- ❌ Removing audit log writes
- ❌ Changing RLS to less restrictive
- ❌ Hardcoding role assumptions

---

## Appendix: Canonical Sources

### A.1 PRD_GUARD Repository

```
Repository: https://github.com/pohlai88/PRD_GUARD.git
Local:      C:\AI-BOS\PRD_GUARD
Version:    2.2.0
```

**Key Files:**

- `canonical.ts` — All enums, FSM, tables
- `validate-sync.ts` — Document synchronization
- `generate-docs.ts` — Document generation

### A.2 Executive Action Matrix (E01-E15)

| ID  | Action               | Actor       | Verification              |
| --- | -------------------- | ----------- | ------------------------- |
| E01 | Submit request       | MANAGER     | DB: SUBMITTED status      |
| E02 | View pending         | CEO         | UI: List visible          |
| E03 | Approve              | CEO         | DB: APPROVED + audit      |
| E04 | Reject               | CEO         | DB: REJECTED + reason     |
| E05 | Resubmit             | MANAGER     | DB: REJECTED → SUBMITTED  |
| E06 | Cancel               | MANAGER     | DB: CANCELLED + audit     |
| E07 | Send message         | CEO/MANAGER | DB: Message exists        |
| E08 | Reply message        | CEO         | DB: Reply + audit         |
| E09 | Publish announcement | ADMIN       | DB: Announcement exists   |
| E10 | Track reads          | SYSTEM      | DB: Read receipts         |
| E11 | Add comment          | ANY         | DB: Comment + author      |
| E12 | Upload attachment    | MANAGER     | DB: Attachment metadata   |
| E13 | Add watcher          | MANAGER     | DB: Watcher + audit       |
| E14 | Soft-delete          | MANAGER     | DB: deleted_at set        |
| E15 | Auth enforcement     | SYSTEM      | API: 401/403 on violation |

### A.3 Test Coverage Summary

| Layer      | Framework  | Tests          |
| ---------- | ---------- | -------------- |
| Unit       | Vitest     | 77             |
| E2E        | Playwright | 15 (E01-E15)   |
| Governance | PRD_GUARD  | 29 sync checks |

---

## Document Control

| Field       | Value            |
| ----------- | ---------------- |
| Document ID | ARCH-CEO-001     |
| Version     | 1.0.0            |
| Status      | FROZEN           |
| Created     | January 6, 2026  |
| Author      | System Architect |
| Reviewed By | —                |
| Approved By | —                |

**This document is IMMUTABLE. Any change requires a new version with formal change control.**
