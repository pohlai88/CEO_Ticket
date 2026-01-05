import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Client-side Supabase client (anon key, RLS-protected)
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
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
