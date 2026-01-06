# CEO Request Ticketing System

Executive decision-making, approval workflow, announcements, and communication system.

---

## 📚 Documentation

All documentation is organized in [`docs/`](docs/) using a 2-tier system.

### 👉 Start Here: [`docs/00_START_HERE.md`](docs/00_START_HERE.md)

Role-based navigation:

| Role               | Focus                   | Time   |
| ------------------ | ----------------------- | ------ |
| 👨‍💼 Product Manager | Overview + requirements | 15 min |
| 👨‍💻 Developer       | Patterns & templates    | 30 min |
| 🚀 DevOps          | Deployment & schema     | 20 min |
| 🔍 QA              | Testing & validation    | 25 min |

### Key Documents

| Document                                                           | Purpose                          |
| ------------------------------------------------------------------ | -------------------------------- |
| [`docs/02_PRD_RCF.md`](docs/02_PRD_RCF.md)                         | Canonical PRD (machine-readable) |
| [`docs/02_PRD_HUMAN.md`](docs/02_PRD_HUMAN.md)                     | Human-readable PRD               |
| [`docs/02_PRD_IDE.md`](docs/02_PRD_IDE.md)                         | IDE integration rules            |
| [`docs/02_SYSTEM_PROMPT.md`](docs/02_SYSTEM_PROMPT.md)             | LLM system prompt                |
| [`docs/03_DEVELOPER_REFERENCE.md`](docs/03_DEVELOPER_REFERENCE.md) | Code patterns & templates        |
| [`docs/REQUEST_CONSTITUTION.md`](docs/REQUEST_CONSTITUTION.md)     | Business rules (immutable)       |
| [`docs/CONVENTION_LOCK.md`](docs/CONVENTION_LOCK.md)               | Security patterns (immutable)    |

---

## ✅ Project Status

**Phase 4: Approvals & Announcements** ✅ **COMPLETE**

- ✅ 16 database tables (with `ceo_` prefix)
- ✅ Full API endpoints (requests, approvals, messages, announcements)
- ✅ Complete UI pages (dashboard, requests, approvals, messages, announcements)
- ✅ FSM-based status transitions
- ✅ Audit logging on all operations
- ✅ PRD compliance system ([PRD_GUARD](https://github.com/pohlai88/PRD_GUARD))
- ✅ 0 TypeScript errors

---

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account

### Installation

```bash
# Clone the repository
git clone <repo>
cd AIBOS_CEO-TICKET

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Setup database (use Supabase SQL editor)
# Run db/schema.sql

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   ├── dashboard/          # Dashboard page
│   ├── requests/           # Request management
│   ├── approvals/          # Approval workflow
│   ├── messages/           # Executive messaging
│   └── announcements/      # CEO announcements
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   └── [feature]/          # Feature-specific components
├── lib/                    # Utilities & helpers
│   ├── constants/          # Status, FSM, material changes
│   ├── server/             # Server-only functions
│   ├── supabase/           # Supabase clients
│   ├── types/              # TypeScript types
│   └── validations/        # Zod schemas
├── db/                     # Database schema
│   └── schema.sql          # 16 tables with ceo_ prefix
├── docs/                   # Documentation (21 files)
└── scripts/                # Build & validation scripts
```

---

## Architecture

### Core Principles

1. **CEO-Driven**: Single CEO approver, CEO controls all configuration
2. **Audit-First**: Every action logged immutably
3. **Type-Safe**: TypeScript strict mode
4. **Anti-Drift**: PRD compliance via [prd-guard](https://github.com/pohlai88/PRD_GUARD)
5. **RLS-Enforced**: Row-level security at database level
6. **FSM-Based**: Finite state machine for status transitions

### Tech Stack

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Frontend   | Next.js 16.1, TypeScript 5.9, TailwindCSS |
| Backend    | Supabase PostgreSQL, RLS                  |
| Validation | Zod v3                                    |
| State      | TanStack Query v5                         |
| CI/CD      | GitHub Actions, Husky                     |

---

## PRD Compliance

This project uses [PRD_GUARD](https://github.com/pohlai88/PRD_GUARD) for document sync validation.

```bash
# Validate PRD documents are in sync
npm run prd:validate

# Check code compliance with canonical values
npm run prd:check

# Regenerate docs from canonical source
npm run prd:generate

# Full validation pipeline
npm run validate:all
```

### Pre-commit Hooks

Husky enforces:

- `prd-guard validate` - Document sync check
- `prd-guard check` - Code compliance check
- `[PRD]` commit prefix for PRD file changes

---

## Scripts

```bash
npm run dev           # Development server (Turbopack)
npm run build         # Production build
npm run start         # Production server
npm run type-check    # TypeScript validation
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run validate:all  # Full validation pipeline
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable                        | Description                    |
| ------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (server-only) |

---

## License

Proprietary - NexusCanon Holdings
