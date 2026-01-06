import { createClient } from "@supabase/supabase-js";
import "server-only";

if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL - required for server operations");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY - required for server operations"
  );
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
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/**
 * Write audit log entry (service role only)
 *
 * CRITICAL: This bypasses RLS to write audit logs
 * Regular users cannot write to ceo_audit_logs (no INSERT policy)
 */
export async function writeAuditLog(params: {
  org_id: string;
  entity_type:
    | "request"
    | "approval"
    | "comment"
    | "watcher"
    | "attachment"
    | "announcement"
    | "message"
    | "ceo_config"
    | "organization"
    | "user_invite";
  entity_id?: string;
  action: string;
  user_id?: string;
  actor_role_code?: "MANAGER" | "CEO" | "ADMIN";
  old_values?: Record<string, Json>;
  new_values?: Record<string, Json>;
  metadata?: Record<string, Json>;
  correlation_id?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("ceo_audit_logs").insert({
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
    console.error("Failed to write audit log:", {
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

/**
 * Write notification log entry (service role only)
 *
 * CRITICAL: This bypasses RLS to write notification logs
 * Uses service-role client to ensure notification logging never fails
 */
export async function writeNotificationLog(params: {
  org_id: string;
  event_type:
    | "request_created"
    | "approval_decision"
    | "status_change"
    | "mention"
    | "watcher_added"
    | "announcement_published"
    | "message_sent";
  recipient_id: string;
  recipient_email: string;
  related_entity_type?: "request" | "announcement" | "message" | "comment";
  related_entity_id?: string;
  status?: "sent" | "failed" | "bounced";
  sent_at?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("ceo_notification_log").insert({
    org_id: params.org_id,
    event_type: params.event_type,
    recipient_id: params.recipient_id,
    recipient_email: params.recipient_email,
    related_entity_type: params.related_entity_type,
    related_entity_id: params.related_entity_id,
    status: params.status || "sent",
    sent_at: params.sent_at || new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to write notification log:", {
      org_id: params.org_id,
      event_type: params.event_type,
      recipient_id: params.recipient_id,
      error,
    });
    // Don't throw - notification failure should not block user operations
  }
}
