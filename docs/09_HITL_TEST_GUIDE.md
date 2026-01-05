# CEO Request Ticketing System - HITL Validation Guide

## System Status: ✅ READY FOR TESTING

**Project Structure:** Next.js 16 + TypeScript Strict + Supabase  
**Database:** Shared ad-hoc Supabase instance (tables prefixed with `ceo_`)  
**Dev Server:** http://localhost:3000  
**Build Status:** ✅ Passing (0 errors)

---

## Quick Start - Test Flow

### 1️⃣ **Homepage (Auto-redirect based on auth)**
- **URL:** http://localhost:3000
- **Unauthenticated:** Shows "Create Organization" + "Sign In" buttons
- **Authenticated (no org):** Redirects to `/onboarding`
- **Authenticated (with org):** Redirects to `/dashboard`

### 2️⃣ **Sign Up (Create Organization)**
- **URL:** http://localhost:3000/auth/signup
- **Fields:**
  - Full Name (required)
  - Email (required, unique per org)
  - Password (required)
- **On Success:**
  - Creates Supabase Auth user
  - Triggers `/api/auth/bootstrap` on first dashboard visit
  - Redirects to `/onboarding`

### 3️⃣ **Bootstrap (Server-side, automatic)**
- **Triggered:** First visit to `/dashboard` after signup
- **Actions:**
  - Creates `ceo_organizations` row
  - Creates `ceo_users` row with `CEO` role
  - Seeds `ceo_config` with defaults
  - Logs to `ceo_audit_logs` via service role
  - Redirects back to `/onboarding`

### 4️⃣ **Onboarding Wizard (2 screens)**

**Screen 1: Organization Details**
- Organization Name (required)
- Manager Email List (optional, comma/newline separated)
- **Next:** Proceeds to Screen 2

**Screen 2: Welcome Announcement**
- Welcome Message (optional, optional toggle for announcement creation)
- **Finish:** 
  - Creates announcement if provided
  - Sends invites to managers via `/api/admin/invite`
  - Redirects to `/dashboard`

### 5️⃣ **Invite API Route (Server-only)**
- **Path:** `POST /api/admin/invite`
- **Security:**
  - ✅ Uses server auth client (reads cookies)
  - ✅ Verifies CEO/ADMIN role from `ceo_users` table (NOT from client)
  - ✅ Uses service role for `auth.admin.inviteUserByEmail()`
  - ✅ Logs invites to `ceo_audit_logs`
  - ✅ Returns per-email status (207 Multi-Status if partial success)
- **Payload:**
  ```json
  { "emails": ["manager1@example.com", "manager2@example.com"] }
  ```

### 6️⃣ **Dashboard**
- **URL:** http://localhost:3000/dashboard
- **Displays:**
  - Organization name
  - User email
  - User ID
  - Sign out button
- **Role-based access:** CEO can see full dashboard

---

## Test Scenarios

### ✅ Scenario A: Full Happy Path (Single CEO)
1. Click "Create Organization" on homepage
2. Fill signup form:
   - Full Name: `John Doe`
   - Email: `ceo@example.com`
   - Password: `TestPass123!`
3. Click "Sign up"
4. Wait for redirect to onboarding
5. **Screen 1:**
   - Organization Name: `Acme Corp`
   - Leave managers empty
   - Click "Next"
6. **Screen 2:**
   - Leave announcement empty
   - Click "Finish"
7. Verify dashboard shows organization and user info
8. Click "Sign out"

### ✅ Scenario B: Happy Path with Manager Invites
1. Repeat Scenario A, but on **Screen 1:**
   - Organization Name: `Tech Startup`
   - Manager Emails: `manager1@example.com, manager2@example.com, manager3@example.com`
   - Click "Next"
2. **Screen 2:**
   - Announcement Message: `Welcome to our CEO request system! Please log in to get started.`
   - Click "Finish"
3. Verify dashboard loads
4. **Check invites:**
   - Check Supabase logs (`ceo_audit_logs` table) for 3 invite records
   - Verify `ceo_users` table has 3 manager records created

### ✅ Scenario C: Manager Login After Invite
1. Complete Scenario B
2. Use incognito/private browser window
3. Go to http://localhost:3000/auth/login
4. **Note:** Managers receive invite emails from Supabase Auth
   - Check Supabase Auth logs or email inbox
   - Use magic link or set password via Supabase
5. Once manager has set password:
   - Log in with manager email
   - Should be redirected to dashboard (via bootstrap)
6. Verify manager sees their role and organization

---

## Database Tables (Coexist Safely)

### CEO Request System (Prefixed `ceo_`)
- ✅ `ceo_organizations` — Org root
- ✅ `ceo_users` — Users with roles (MANAGER, CEO, ADMIN)
- ✅ `ceo_config` — Configuration per org
- ✅ `ceo_requests` — Request tickets
- ✅ `ceo_approvals` — Approval decisions
- ✅ `ceo_request_comments` — Comments on requests
- ✅ `ceo_request_watchers` — Watchers on requests
- ✅ `ceo_announcements` — Org announcements
- ✅ `ceo_announcement_reads` — Announcement reads
- ✅ `ceo_audit_logs` — Tamper-proof audit trail

### Existing Ad-Hoc Tables (Unchanged)
- `groups`, `vmp_vendors`, `vmp_invoices`, `employee_claims`, `kernel_metadata`, `rate_limits`, etc.

---

## Key Testing Points

### Security Checklist
- [ ] Signup creates auth user
- [ ] Bootstrap runs on first dashboard visit
- [ ] Invite route requires CEO/ADMIN role (role checked from DB, not client)
- [ ] Service role used only for invites + audit writes
- [ ] `server-only` import prevents client imports of `lib/supabase/server.ts`
- [ ] Audit logs created for org creation and invites

### Functional Checklist
- [ ] Homepage redirects based on auth state
- [ ] Signup form validates email format
- [ ] Onboarding wizard shows 2 screens correctly
- [ ] Manager emails invite with valid format
- [ ] Announcement creation optional (doesn't error if empty)
- [ ] Dashboard shows org name and user email
- [ ] Sign out clears session

### Edge Cases
- [ ] Duplicate email signup (should fail at Supabase Auth level)
- [ ] Invalid email format in manager list (should validate with Zod)
- [ ] Empty org name (required field, should not submit)
- [ ] Very long organization name (should accept, display truncated if needed)
- [ ] Invite with nonexistent email (Supabase creates auth record anyway)

---

## Troubleshooting

### Signup returns 400 error
- **Cause:** Email already exists in Supabase Auth
- **Fix:** Use new email or clear auth user via Supabase dashboard

### Dashboard shows "Not authenticated" immediately
- **Cause:** Session cookie not sent to route handler
- **Fix:** Verify `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and anon key

### Invite route returns 403
- **Cause:** User doesn't have CEO/ADMIN role in `ceo_users` table
- **Fix:** Verify bootstrap created user with CEO role

### Onboarding page won't proceed
- **Cause:** Org name validation failing
- **Fix:** Check browser console for validation error; ensure org name is not empty

---

## Files to Review (If Needed)

| Component | File | Purpose |
|-----------|------|---------|
| Signup UI | [app/auth/signup/page.tsx](app/auth/signup/page.tsx) | Email/password signup form |
| Login UI | [app/auth/login/page.tsx](app/auth/login/page.tsx) | Email/password login form |
| Bootstrap Logic | [lib/auth/bootstrap.ts](lib/auth/bootstrap.ts) | Creates org + seeds config |
| Bootstrap API | [app/api/auth/bootstrap/route.ts](app/api/auth/bootstrap/route.ts) | Server-side bootstrap endpoint |
| Invite API | [app/api/admin/invite/route.ts](app/api/admin/invite/route.ts) | Role-gated invite endpoint (🔐 Security-critical) |
| Onboarding | [app/onboarding/page.tsx](app/onboarding/page.tsx) | 2-screen wizard |
| Dashboard | [app/dashboard/page.tsx](app/dashboard/page.tsx) | Post-auth home page |
| Server Auth | [lib/supabase/server-auth.ts](lib/supabase/server-auth.ts) | Cookie-aware auth for route handlers |
| Server Client | [lib/supabase/server.ts](lib/supabase/server.ts) | Service role client (🔐 Server-only) |
| Client | [lib/supabase/client.ts](lib/supabase/client.ts) | Anon client for browser |

---

## Environment Variables (Already Set)

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://vrawceruzokxitybkufk.supabase.co
SUPABASE_URL=https://vrawceruzokxitybkufk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Next Steps (Post-HITL Validation)

- [ ] Create requests (ceo_requests table)
- [ ] Approvals workflow (ceo_approvals table)
- [ ] Comments and watchers (ceo_request_comments, ceo_request_watchers)
- [ ] Full dashboard UI (list requests, create request, approve)
- [ ] Production deployment (Vercel + Supabase production instance)

---

## Questions or Issues?

All code is documented with `// ⚠️ SECURITY:` comments marking sensitive areas.  
Check `docs/CONVENTION_LOCK.md` for immutable naming conventions and drift detection rules.
