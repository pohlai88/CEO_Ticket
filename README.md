# ⚖️ CEO Request Management System

> **This is not a ticketing system.** > **It is a governance system for executive decision-making.**

[![Governance](https://img.shields.io/badge/RCF-v2.2.0-indigo)](./docs/02_PRD_RCF.md)
[![Architecture](https://img.shields.io/badge/Architecture-FROZEN-blue)](./ARCHITECTURE.md)
[![PRD Guard](https://img.shields.io/badge/PRD_GUARD-v2.2.0-green)](https://github.com/pohlai88/PRD_GUARD)
[![Tests](https://img.shields.io/badge/Tests-121_Pass-brightgreen)](./e2e/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

---

## Why This System Exists

**Executive workflows fail not at creation, but at enforcement.**

Every organization starts with good intentions:

- "We'll have proper approval chains"
- "Every decision will be audited"
- "Only the CEO can approve"

Within 6 months:

- Someone adds a "quick approval" bypass
- Audit logs have gaps
- Multiple people have CEO-equivalent permissions
- No one can prove who approved what

**This system prevents that.**

---

## What This System Provides

| Dimension        | Without Guard  | With Guard                  |
| ---------------- | -------------- | --------------------------- |
| Approvals        | Best-effort    | **CEO-only enforced**       |
| Audit trail      | Gaps, editable | **Immutable, tamper-proof** |
| Status changes   | Ad-hoc         | **FSM-governed**            |
| Role enforcement | Partial        | **RLS + API + UI**          |
| PRD drift        | Inevitable     | **Zero-tolerance**          |
| E2E testing      | UI-only        | **UI + API + DB verified**  |

---

## The Governance Stack

### 📜 PRD Guard — The Constitution

Single source of truth for all governance rules. Pure data, no logic.

```typescript
// github:pohlai88/PRD_GUARD
export const RequestStatus = ["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED", "CLOSED"];
export const RoleCode = ["CEO", "MANAGER", "ADMIN"];
export const FSM_TRANSITIONS = { ... };
```

**Repository:** [PRD_GUARD](https://github.com/pohlai88/PRD_GUARD)

### 🏛️ The Legislature — Document Generation

Converts constitutional data into documentation. Deterministic. Idempotent.

```bash
prd-guard generate
# ✓ 29 sections regenerated from canonical.ts
```

### ⚖️ The Supreme Court — Drift Detection

Verifies all derived documents match constitutional source.

```bash
prd-guard validate
# ✓ PRD sync validation passed (29 checks)
# RCF_VERSION: 2.2.0
```

### 🚔 The Police — Compliance Enforcement

Scans codebase for governance violations. Blocks CI on drift.

```bash
prd-guard check
# ✓ PRD compliance check passed
```

### 🧪 The Judiciary — E2E Verification

Proves every executive action at **three layers**: UI → API → Database.

```bash
npm run test:e2e
# ✓ 15 tests (E01-E15) verified with DB assertions
```

---

## Executive Action Matrix (E01-E15)

Every executive action is tested at three layers:

| ID  | Action               | Actor   | UI  | API | DB Proof                  |
| --- | -------------------- | ------- | :-: | :-: | ------------------------- |
| E01 | Submit request       | MANAGER | ✅  | ✅  | `status = 'SUBMITTED'`    |
| E02 | View pending         | CEO     | ✅  | ✅  | Query matches result      |
| E03 | Approve              | CEO     | ✅  | ✅  | `status + audit_log`      |
| E04 | Reject               | CEO     | ✅  | ✅  | `status + reason + audit` |
| E05 | Resubmit             | MANAGER | ✅  | ✅  | `REJECTED → SUBMITTED`    |
| E06 | Cancel               | MANAGER | ✅  | ✅  | `status = 'CANCELLED'`    |
| E07 | Send message         | CEO/MGR | ✅  | ✅  | Message exists            |
| E08 | Reply message        | CEO     | ✅  | ✅  | Reply + notification      |
| E09 | Publish announcement | ADMIN   | ✅  | ✅  | Announcement exists       |
| E10 | Track reads          | SYSTEM  | ✅  | ✅  | Read receipts             |
| E11 | Add comment          | ANY     | ✅  | ✅  | Comment + author          |
| E12 | Upload attachment    | MANAGER | ✅  | ✅  | Attachment metadata       |
| E13 | Add watcher          | MANAGER | ✅  | ✅  | Watcher record            |
| E14 | Soft-delete          | MANAGER | ✅  | ✅  | `deleted_at` set          |
| E15 | Auth enforcement     | SYSTEM  | ✅  | ✅  | 401/403 on violation      |

---

## Architecture (FROZEN)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete reference.

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│           Next.js 16 • App Router • Server Components            │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API LAYER                               │
│         /api/requests • /api/approvals • /api/messages          │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                             │
│              lib/server/* • FSM • Validation                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                            │
│       PostgreSQL • 16 ceo_* tables • RLS • Audit Logs           │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GOVERNANCE LAYER                            │
│            PRD_GUARD • Pre-commit • CI Gates                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/pohlai88/CEO_Ticket.git
cd CEO_Ticket

# Install (includes PRD_GUARD)
npm install

# Configure
cp .env.example .env.local
# Add Supabase credentials

# Database
# Run db/schema.sql in Supabase SQL editor

# Start
npm run dev
```

---

## Governance Commands

```bash
# PRD Governance
prd-guard generate      # Regenerate docs from canonical
prd-guard validate      # Verify sync (29 checks)
prd-guard check         # Code compliance scan

# Testing
npm run test            # 77 unit tests (Vitest)
npm run test:e2e        # 15 E2E tests (Playwright)

# Development
npm run dev             # Start dev server
npm run build           # Production build
npm run type-check      # TypeScript validation
npm run lint            # ESLint check
```

---

## Repository Structure

```
CEO_Ticket/
├─ app/                     # Next.js App Router
│  ├─ api/                  # API routes (authority enforcement)
│  ├─ requests/             # Request management
│  ├─ approvals/            # CEO approval workflow
│  ├─ messages/             # Executive messaging
│  └─ announcements/        # Admin announcements
│
├─ components/              # React components
│  ├─ ui/                   # Base components
│  └─ [feature]/            # Feature-specific
│
├─ lib/                     # Core libraries
│  ├─ state-machine.ts      # FSM (LOCKED)
│  ├─ constants/            # Status, material changes
│  ├─ server/               # Domain services
│  ├─ supabase/             # Database clients
│  └─ validations/          # Zod schemas
│
├─ e2e/                     # E2E Testing (Playwright)
│  ├─ pages/                # Page Object Model
│  ├─ factories/            # Test data factories
│  ├─ helpers/              # DB verification
│  └─ executive-actions.spec.ts  # E01-E15 tests
│
├─ tests/                   # Unit tests (Vitest)
│  └─ unit/                 # 77 tests, 5 suites
│
├─ docs/                    # Governance documentation
│  ├─ 02_PRD_RCF.md         # Canonical PRD
│  ├─ GOVERNANCE_REPORT.md  # Board-level report
│  └─ ...
│
├─ db/
│  └─ schema.sql            # 16 tables, RLS policies
│
├─ ARCHITECTURE.md          # Reference freeze (v1.0.0)
└─ package.json
```

---

## Governance Family

This system is part of the **Nexus Governance Family**:

| Package            | Purpose                          | Repository                                           |
| ------------------ | -------------------------------- | ---------------------------------------------------- |
| **PRD_GUARD**      | Constitutional compliance engine | [GitHub](https://github.com/pohlai88/PRD_GUARD)      |
| **NEXUS_UI_GUARD** | Design system governance         | [GitHub](https://github.com/pohlai88/NEXUS_UI_GUARD) |
| **CEO_Ticket**     | Executive request management     | [GitHub](https://github.com/pohlai88/CEO_Ticket)     |

All three share the same governance philosophy:

> **Governance is not documentation. It is enforcement.**

---

## Test Coverage

| Layer      | Framework       | Tests   | Status  |
| ---------- | --------------- | ------- | ------- |
| Unit       | Vitest 4.x      | 77      | ✅ PASS |
| E2E        | Playwright 1.x  | 15      | ✅ PASS |
| Governance | PRD_GUARD 2.2.0 | 29      | ✅ PASS |
| **TOTAL**  | —               | **121** | ✅      |

---

## Key Documents

| Document                                                  | Purpose                      |
| --------------------------------------------------------- | ---------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                      | Reference freeze (IMMUTABLE) |
| [GOVERNANCE_REPORT.md](./docs/GOVERNANCE_REPORT.md)       | Board-level assurance        |
| [02_PRD_RCF.md](./docs/02_PRD_RCF.md)                     | Canonical requirements       |
| [REQUEST_CONSTITUTION.md](./docs/REQUEST_CONSTITUTION.md) | Business rules (LOCKED)      |

---

## Version Policy

| Bump  | When                                         |
| ----- | -------------------------------------------- |
| MAJOR | Breaking changes to FSM, roles, or authority |
| MINOR | New features, new executive actions          |
| PATCH | Bug fixes, documentation, performance        |

---

## License

MIT — See [LICENSE](./LICENSE)

**Open code, closed interpretation.**

The code is open. The authority to interpret and enforce governance remains with the system owner.

---

## Status

**v1.0.0 — Governance Complete**

| Dimension    | State        |
| ------------ | ------------ |
| Architecture | FROZEN       |
| Rules        | EXTERNALIZED |
| Enforcement  | AUTOMATED    |
| Evidence     | EXPORTABLE   |
| Risk         | DECLARED     |

The CEO Request Management System is **institutionally safe**.
