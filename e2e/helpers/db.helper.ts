/**
 * Database Verification Helper
 * RCF-E2E-2: Every executive action test MUST verify system state beyond UI
 *
 * @rcf-version 2.2.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Audit log event types per PRD
export type AuditEventType =
  | "request.created"
  | "request.submitted"
  | "request.approved"
  | "request.rejected"
  | "request.cancelled"
  | "request.resubmitted"
  | "request.updated"
  | "approval.started"
  | "approval.invalidated"
  | "message.sent"
  | "message.replied"
  | "announcement.published"
  | "announcement.read"
  | "comment.added"
  | "attachment.uploaded"
  | "watcher.added";

export interface AuditLogEntry {
  id: string;
  event_type: string;
  actor_id: string;
  actor_role: string;
  request_id?: string;
  status_before?: string;
  status_after?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Database Helper for E2E Test Verification
 * RCF-E2E-2: Mandatory DB verification after executive actions
 */
export class DatabaseHelper {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_ANON_KEY must be set for E2E tests"
      );
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Verify audit log entry exists for an action
   * RCF-E2E-2: If audit row is missing, test FAILS even if UI passed
   */
  async verifyAuditLog(params: {
    eventType: AuditEventType;
    requestId?: string;
    actorRole?: "MANAGER" | "CEO" | "ADMIN";
    statusBefore?: string;
    statusAfter?: string;
    withinSeconds?: number;
  }): Promise<AuditLogEntry> {
    const {
      eventType,
      requestId,
      actorRole,
      statusBefore,
      statusAfter,
      withinSeconds = 30,
    } = params;

    const cutoffTime = new Date(
      Date.now() - withinSeconds * 1000
    ).toISOString();

    let query = this.client
      .from("ceo_audit_logs")
      .select("*")
      .eq("event_type", eventType)
      .gte("created_at", cutoffTime)
      .order("created_at", { ascending: false })
      .limit(1);

    if (requestId) {
      query = query.eq("request_id", requestId);
    }

    if (actorRole) {
      query = query.eq("actor_role", actorRole);
    }

    if (statusBefore) {
      query = query.eq("status_before", statusBefore);
    }

    if (statusAfter) {
      query = query.eq("status_after", statusAfter);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Audit log query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        `RCF-E2E-2 VIOLATION: No audit log found for event_type="${eventType}"` +
          (requestId ? ` request_id="${requestId}"` : "") +
          (actorRole ? ` actor_role="${actorRole}"` : "") +
          (statusBefore ? ` status_before="${statusBefore}"` : "") +
          (statusAfter ? ` status_after="${statusAfter}"` : "") +
          ` within last ${withinSeconds} seconds`
      );
    }

    return data[0] as AuditLogEntry;
  }

  /**
   * Verify request status in database
   */
  async verifyRequestStatus(
    requestId: string,
    expectedStatus: string
  ): Promise<void> {
    const { data, error } = await this.client
      .from("ceo_requests")
      .select("status")
      .eq("id", requestId)
      .single();

    if (error) {
      throw new Error(`Request status query failed: ${error.message}`);
    }

    if (data.status !== expectedStatus) {
      throw new Error(
        `RCF-E2E-2 VIOLATION: Request ${requestId} has status "${data.status}" but expected "${expectedStatus}"`
      );
    }
  }

  /**
   * Verify notification was created
   */
  async verifyNotificationCreated(params: {
    recipientId?: string;
    eventType: string;
    withinSeconds?: number;
  }): Promise<void> {
    const { recipientId, eventType, withinSeconds = 30 } = params;

    const cutoffTime = new Date(
      Date.now() - withinSeconds * 1000
    ).toISOString();

    let query = this.client
      .from("ceo_notification_log")
      .select("*")
      .eq("event_type", eventType)
      .gte("created_at", cutoffTime)
      .limit(1);

    if (recipientId) {
      query = query.eq("recipient_id", recipientId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Notification query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        `RCF-E2E-2 VIOLATION: No notification found for event_type="${eventType}" within last ${withinSeconds} seconds`
      );
    }
  }

  /**
   * Verify message exists in database
   */
  async verifyMessageExists(params: {
    subject?: string;
    messageType?: string;
    withinSeconds?: number;
  }): Promise<{ id: string }> {
    const { subject, messageType, withinSeconds = 30 } = params;

    const cutoffTime = new Date(
      Date.now() - withinSeconds * 1000
    ).toISOString();

    let query = this.client
      .from("ceo_executive_messages")
      .select("id, subject, message_type")
      .gte("created_at", cutoffTime)
      .order("created_at", { ascending: false })
      .limit(1);

    if (subject) {
      query = query.ilike("subject", `%${subject}%`);
    }

    if (messageType) {
      query = query.eq("message_type", messageType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Message query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        `RCF-E2E-2 VIOLATION: No message found` +
          (subject ? ` with subject containing "${subject}"` : "") +
          (messageType ? ` of type "${messageType}"` : "") +
          ` within last ${withinSeconds} seconds`
      );
    }

    return { id: data[0].id };
  }

  /**
   * Verify announcement exists and track reads
   */
  async verifyAnnouncementPublished(params: {
    title?: string;
    withinSeconds?: number;
  }): Promise<{ id: string }> {
    const { title, withinSeconds = 30 } = params;

    const cutoffTime = new Date(
      Date.now() - withinSeconds * 1000
    ).toISOString();

    let query = this.client
      .from("ceo_announcements")
      .select("id, title")
      .gte("created_at", cutoffTime)
      .order("created_at", { ascending: false })
      .limit(1);

    if (title) {
      query = query.ilike("title", `%${title}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Announcement query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        `RCF-E2E-2 VIOLATION: No announcement found` +
          (title ? ` with title containing "${title}"` : "") +
          ` within last ${withinSeconds} seconds`
      );
    }

    return { id: data[0].id };
  }

  /**
   * Verify announcement read receipt exists
   */
  async verifyAnnouncementRead(params: {
    announcementId: string;
    userId?: string;
    withinSeconds?: number;
  }): Promise<void> {
    const { announcementId, userId, withinSeconds = 30 } = params;

    const cutoffTime = new Date(
      Date.now() - withinSeconds * 1000
    ).toISOString();

    let query = this.client
      .from("ceo_announcement_reads")
      .select("*")
      .eq("announcement_id", announcementId)
      .gte("created_at", cutoffTime)
      .limit(1);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Announcement read query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        `RCF-E2E-2 VIOLATION: No read receipt found for announcement ${announcementId}` +
          (userId ? ` by user ${userId}` : "") +
          ` within last ${withinSeconds} seconds`
      );
    }
  }

  /**
   * Get rejection reason from database
   */
  async getRejectionReason(requestId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("ceo_request_approvals")
      .select("rejection_reason")
      .eq("request_id", requestId)
      .eq("decision", "rejected")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return null;
    }

    return data?.rejection_reason || null;
  }

  /**
   * Cleanup test data (optional - use for isolation)
   */
  async cleanupTestRequest(requestId: string): Promise<void> {
    // Soft delete - set deleted_at
    await this.client
      .from("ceo_requests")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", requestId);
  }
}

/**
 * Create singleton instance for tests
 */
let dbHelper: DatabaseHelper | null = null;

export function getDbHelper(): DatabaseHelper {
  if (!dbHelper) {
    dbHelper = new DatabaseHelper();
  }
  return dbHelper;
}
