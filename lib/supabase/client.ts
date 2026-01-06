import { createBrowserClient } from "@supabase/ssr";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/**
 * Client-side Supabase client (anon key, RLS-protected)
 *
 * Uses @supabase/ssr's createBrowserClient for cookie-based session management
 * This ensures server and client stay in sync with the same session.
 *
 * Use this for:
 * - Normal CRUD operations (requests, approvals, comments, etc.)
 * - User authentication
 * - RLS-enforced queries
 *
 * DO NOT use for:
 * - Audit log writes (use lib/supabase/server.ts)
 * - Admin operations (use lib/supabase/server.ts)
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
