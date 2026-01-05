# CEO Request Ticketing System

Executive decision-making, approval, announcements, and executive communication system.

---

## 📚 Documentation

**All documentation has been organized in the [`docs/`](docs/) folder using a 2-tier system.**

### 👉 Start Here: [`docs/00_START_HERE.md`](docs/00_START_HERE.md)

This guide helps you navigate documentation based on your role:

- 👨‍💼 **Product Manager** — Overview + requirements (15 min)
- 👨‍💻 **Developer** — Patterns & templates (30 min)
- 🚀 **DevOps** — Deployment & schema (20 min)
- 🔍 **QA** — Testing & validation (25 min)

### 📋 Documentation Structure

- **Tier 1: Sequential Documentation (00-11)** — Phase-based docs for chronological reading (11\_ is archived)
- **Tier 2: Immutable Operational Documents** — Business rules & security constraints frozen after Day 1

See [`ORGANIZATION_SUMMARY.md`](ORGANIZATION_SUMMARY.md) for complete structure explanation.

---

## 🚀 Key Documents

| Document                                                                         | Purpose                                         |
| -------------------------------------------------------------------------------- | ----------------------------------------------- |
| [`docs/01_PHASE_3_COMPLETION_SUMMARY.md`](docs/01_PHASE_3_COMPLETION_SUMMARY.md) | **Status & next steps**                         |
| [`docs/02_PRD.md`](docs/02_PRD.md)                                               | Complete product requirements                   |
| [`docs/03_DEVELOPER_REFERENCE.md`](docs/03_DEVELOPER_REFERENCE.md)               | **Code patterns & templates** (keep bookmarked) |
| [`docs/04_ARCHITECTURAL_DECISIONS.md`](docs/04_ARCHITECTURAL_DECISIONS.md)       | Why key decisions were made                     |
| [`docs/05_SCHEMA_VALIDATION_REPORT.md`](docs/05_SCHEMA_VALIDATION_REPORT.md)     | **Schema verification & deployment**            |
| [`docs/REQUEST_CONSTITUTION.md`](docs/REQUEST_CONSTITUTION.md)                   | **Business rules** (immutable)                  |
| [`docs/CONVENTION_LOCK.md`](docs/CONVENTION_LOCK.md)                             | **Security patterns** (immutable)               |

---

## ✅ Project Status

**Phase 3: Request CRUD-S System** ✅ **COMPLETE**

- ✅ All 16 database tables (with `ceo_` prefix)
- ✅ 5 API endpoints (POST/GET/PATCH/DELETE)
- ✅ 3 UI pages (list, create, detail)
- ✅ Audit logging on all operations
- ✅ 0 TypeScript errors
- ✅ Ready for production

---

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account

### Installation

1. **Clone the repository**

```bash
git clone <repo>
cd request-ticket
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (browser)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anonymous key (browser)
- `SUPABASE_URL`: Your Supabase project URL (server-only)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (server-only, never expose)

4. **Setup database schema**

```bash
# Use Supabase SQL editor to run db/schema.sql
# Or use Supabase CLI:
supabase db push
```

5. **Validate glossary**

```bash
npm run validate
```

6. **Start development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx
├── components/             # React components
├── lib/                    # Utilities & helpers
│   ├── glossary.schema.ts
│   ├── state-machine.ts
│   ├── sanitize/
│   └── constants/
├── db/                     # Database schema
│   └── schema.sql
├── docs/                   # Documentation
│   ├── glossary.ui.json    # Field meanings (SSOT)
│   └── REQUEST_CONSTITUTION.md
├── scripts/                # Build & validation scripts
│   └── validate-glossary.js
└── public/                 # Static assets
```

## Architecture

### Core Principles

1. **CEO-Driven**: Single CEO approver, CEO controls all configuration
2. **Audit-First**: Every action logged immutably
3. **Type-Safe**: TypeScript strict mode, no `any`
4. **Anti-Drift**: Glossary enforced via Zod + CI validation
5. **RLS-Enforced**: Row-level security at database level

### Tech Stack

- **Frontend**: Next.js 16, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Supabase PostgreSQL, RLS
- **Validation**: Zod v3
- **State**: TanStack Query v5, TanStack Table v8
- **Deployment**: Vercel

## Build Checklist (Day 1-8)

See [plan-ceoRequestTicketingSystem.prompt.md](plan-ceoRequestTicketingSystem.prompt.md) for complete day-by-day build plan.

### Day 1: Foundation ✅

- [x] Next.js 16 app + TypeScript strict
- [x] ESLint ban `any`
- [x] Database schema
- [x] Glossary validation

### Day 2: Auth & Onboarding (Next)

- [ ] Supabase Auth
- [ ] Onboarding wizard
- [ ] CEO dashboard

## Glossary & Documentation

All field meanings are documented in `docs/glossary.ui.json` and enforced at build time via:

```bash
npm run validate:glossary
```

## Security

### Known Issues (Logged, Not Blocking)

**Dev Dependencies:**

- `lodash.template` in `shadcn-ui`: Command injection vulnerability (GHSA-35jh-r3h4-6jhm)
- **Impact**: Dev-only, not exploitable in production
- **Status**: Logged, will upgrade post-ship

### Audit Log Integrity

**CRITICAL RULE:** Only service role can write to `audit_logs` table.

- No RLS INSERT policy = client cannot write
- Application uses service key for audit writes
- This prevents audit tampering

## Testing

```bash
npm run type-check  # TypeScript validation
npm run lint        # ESLint (no `any` allowed)
npm run validate    # Full validation (types + lint + glossary)
```

## Deployment

```bash
npm run build
npm start
```

Or deploy to Vercel:

```bash
vercel deploy
```

## Support

See docs/ for:

- `REQUEST_CONSTITUTION.md` - Governance & status lifecycle
- `glossary.ui.json` - Field meanings
- `plan-ceoRequestTicketingSystem.prompt.md` - Complete architecture

## License

Proprietary - NexusCanon Holdings
