# CONVENTION LOCK — Day 1 Freeze

**Date:** January 5, 2026  
**Status:** LOCKED FOR DAY 2+ (No changes allowed)  
**Purpose:** Prevent drift in security-critical env var naming and server-only enforcement

---

## NAMING CONVENTION (FINAL)

### Client Environment Variables

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://...             # Browser: Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...             # Browser: Anonymous key
```

**Usage:**
- `lib/supabase/client.ts` — reads only NEXT_PUBLIC_ vars
- Client components — can use `supabase` from client.ts
- Never used in server context

---

### Server Environment Variables

```dotenv
SUPABASE_URL=https://...                         # Server: Supabase URL (no NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJ...                 # Server: Service role key (no NEXT_PUBLIC_)
```

**Usage:**
- `lib/supabase/server.ts` — reads only SUPABASE_ vars (no NEXT_PUBLIC_)
- API routes / server actions only
- Protected by `import 'server-only'`
- Never used in client context

---

## FILE-LEVEL RULES (IMMUTABLE)

### ✅ `.env.local.example` (Template)

**Must contain exactly:**
```dotenv
# Client vars
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Server vars
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Never add:**
- ❌ `SUPABASE_SERVICE_KEY` (incorrect name)
- ❌ `NEXT_PUBLIC_SUPABASE_SERVICE_*` (exposes secret)
- ❌ `SUPABASE_ANON_KEY` (client var should be NEXT_PUBLIC_)

---

### ✅ `.env.local` (Actual)

**Must mirror `.env.local.example`**

Developers copy `.env.local.example` → `.env.local` and fill in their credentials.

---

### ✅ `lib/supabase/client.ts` (Anon Client)

**Required:**
- Checks: `process.env.NEXT_PUBLIC_SUPABASE_URL`
- Checks: `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Creates: anon client only
- Exports: `export const supabase = createClient(...)`

**Never:**
- ❌ Import `server.ts`
- ❌ Read `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`
- ❌ Read `process.env.SUPABASE_*` (server vars)

---

### ✅ `lib/supabase/server.ts` (Service Client)

**Required:**
- Line 1: `import 'server-only';` (hard block)
- Checks: `process.env.SUPABASE_URL`
- Checks: `process.env.SUPABASE_SERVICE_ROLE_KEY`
- Creates: service client with `autoRefreshToken:false, persistSession:false`
- Exports: `export const supabaseAdmin = createClient(...)`
- Exports: `export async function writeAuditLog(...)`

**Type safety:**
- Define `type Json` (no `unknown`)
- Use `Record<string, Json>` for audit data
- TypeScript strict mode

**Never:**
- ❌ `import 'server-only'` in client.ts or components
- ❌ Read `NEXT_PUBLIC_*` vars (client vars)
- ❌ Export `supabaseAdmin` for client use
- ❌ Use `supabaseAdmin` for normal CRUD (only: audit, invites, bootstrap)

---

## SEARCH RULES (FOR FUTURE AUDITS)

### ❌ These searches should return ZERO matches:

1. **`SUPABASE_SERVICE_KEY`** (old, incorrect name)
   ```bash
   grep -r "SUPABASE_SERVICE_KEY" .
   # Result: 0 matches ✅
   ```

2. **`NEXT_PUBLIC_SUPABASE_URL` in `lib/supabase/server.ts`** (server should use `SUPABASE_URL`)
   ```bash
   grep "NEXT_PUBLIC_SUPABASE_URL" lib/supabase/server.ts
   # Result: 0 matches ✅
   ```

3. **`import.*lib/supabase/server` in any `.tsx` file** (no client imports)
   ```bash
   grep -r "from '@/lib/supabase/server'" components/
   # Result: 0 matches ✅
   ```

---

## CURRENT STATE (Day 1 End)

**All conventions locked:**

- [x] Client: `NEXT_PUBLIC_SUPABASE_*` only
- [x] Server: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` only
- [x] Server protection: `import 'server-only'`
- [x] Type safety: `Json` type replaces `unknown`
- [x] Usage restriction: `supabaseAdmin` for audit/invites/bootstrap only

---

## DRIFT PREVENTION

**After this lock, before Day 2:**

- [ ] No new environment variables added
- [ ] No renaming of existing variables
- [ ] No new imports of `server.ts` in components
- [ ] No `NEXT_PUBLIC_` used in server.ts

**During Day 2 and beyond:**

- [ ] If new secret needed: name it `SUPABASE_*` (no NEXT_PUBLIC_)
- [ ] If new client var needed: name it `NEXT_PUBLIC_*`
- [ ] All server files use `import 'server-only'`
- [ ] Audit writes use `writeAuditLog()` from server.ts only

---

## ENFORCEMENT

This document is **immutable until after Day 8 ship**.

Any changes to env var naming, server/client separation, or type safety require:
1. Full team review
2. Security audit
3. Re-test TypeScript strict + build
4. Update this document

**Default action:** Deny.

---

**Status:** LOCKED ✅  
**Last updated:** January 5, 2026 (Day 1 completion)  
**Next review:** After Day 2 (if needed)
