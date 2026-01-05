import 'server-only';
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL - required for server operations');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - required for server operations');
}

/**
 * Service role client for server-side operations ONLY
 * 
 * ⚠️ NEVER use this client in browser/client code
 * ⚠️ ONLY use for:
 *   1. Audit log writes (bypass RLS)
 *   2. User invites (admin API)
 *   3. Bootstrap operations (org creation)
 * 
 * For normal operations, use lib/supabase/client.ts
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Strict JSON type for audit data (no unknown allowed)
 */
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

/**
 * Write audit log entry (service role only)
 * 
 * CRITICAL: This bypasses RLS to write audit logs
 * Regular users cannot write to audit_logs (no INSERT policy)
 */
export async function writeAuditLog(params: {
  org_id: string;
  entity_type: 'request' | 'approval' | 'comment' | 'watcher' | 'attachment' | 'announcement' | 'message' | 'ceo_config' | 'organization' | 'user_invite';
  entity_id?: string;
  action: string;
  user_id?: string;
  actor_role_code?: 'MANAGER' | 'CEO' | 'ADMIN';
  old_values?: Record<string, Json>;
  new_values?: Record<string, Json>;
  metadata?: Record<string, Json>;
  correlation_id?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      org_id: params.org_id,
      correlation_id: params.correlation_id,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      action: params.action,
      user_id: params.user_id,
      actor_role_code: params.actor_role_code,
      old_values: params.old_values,
      new_values: params.new_values,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to write audit log:', {
      correlation_id: params.correlation_id,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      error,
    });
    // Don't throw - audit failure should not block user operations
    // Log to monitoring service in production
    // TODO: Write to audit_failures table post-ship
  }
}
