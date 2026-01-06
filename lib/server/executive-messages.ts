import { createServerAuthClient } from "@/lib/supabase/server-auth";
import "server-only";

export type MessageType = "consultation" | "direction" | "clarification";
export type ContextType = "request" | "announcement" | "general";
export type MessageStatus = "draft" | "sent" | "acknowledged" | "resolved";

export interface ExecutiveMessageData {
  message_type: MessageType;
  context_type: ContextType;
  context_id?: string; // request_id or announcement_id
  subject: string;
  body: string;
  recipient_ids: string[]; // required
  cc_user_ids?: string[];
}

export interface ExecutiveMessage {
  id: string;
  org_id: string;
  message_type: MessageType;
  context_type: ContextType;
  context_id: string | null;
  author_id: string;
  author_role: "MANAGER" | "CEO" | "ADMIN";
  subject: string;
  body: string;
  recipient_ids: string[];
  cc_user_ids: string[];
  parent_message_id: string | null;
  status: MessageStatus;
  sent_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_read: boolean;
  read_at: string | null;
  is_acknowledged: boolean;
  current_user_is_author: boolean;
  current_user_is_recipient: boolean;
}

// Create a new executive message (draft)
export async function createExecutiveMessage(
  data: ExecutiveMessageData,
  userId: string,
  userRole: "MANAGER" | "CEO" | "ADMIN",
  orgId: string
): Promise<{ success: boolean; message?: ExecutiveMessage; error?: string }> {
  try {
    const supabase = await createServerAuthClient();

    // Validation: general messages only from CEO/ADMIN
    if (data.context_type === "general" && userRole === "MANAGER") {
      return {
        success: false,
        error: "Only CEO/Admin can create general messages",
      };
    }

    // Validation: context_id required for non-general
    if (data.context_type !== "general" && !data.context_id) {
      return {
        success: false,
        error: "Context ID required for request/announcement messages",
      };
    }

    // Insert message (org-scoped)
    const { data: message, error: insertError } = await supabase
      .from("ceo_executive_messages")
      .insert({
        org_id: orgId,
        message_type: data.message_type,
        context_type: data.context_type,
        context_id: data.context_id || null,
        author_id: userId,
        author_role: userRole,
        subject: data.subject,
        body: data.body,
        recipient_ids: data.recipient_ids,
        cc_user_ids: data.cc_user_ids || [],
        status: "draft",
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Write audit log (REQUIRED)
    await supabase.from("ceo_audit_logs").insert({
      org_id: orgId,
      entity_type: "message",
      entity_id: message.id,
      action: "created",
      user_id: userId,
      new_values: message,
    });

    return { success: true, message: transformMessage(message, userId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send a draft message (changes status from draft to sent)
export async function sendExecutiveMessage(
  messageId: string,
  userId: string,
  orgId: string
): Promise<{ success: boolean; message?: ExecutiveMessage; error?: string }> {
  try {
    const supabase = await createServerAuthClient();

    // Get message and verify ownership (org-scoped)
    const { data: message } = await supabase
      .from("ceo_executive_messages")
      .select("*")
      .eq("id", messageId)
      .eq("org_id", orgId)
      .single();

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.author_id !== userId) {
      return { success: false, error: "Only author can send message" };
    }

    if (message.status !== "draft") {
      return { success: false, error: "Only draft messages can be sent" };
    }

    // Update to sent
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("ceo_executive_messages")
      .update({
        status: "sent",
        sent_at: now,
        updated_at: now,
      })
      .eq("id", messageId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Write audit log (REQUIRED for send)
    await supabase.from("ceo_audit_logs").insert({
      org_id: orgId,
      entity_type: "message",
      entity_id: messageId,
      action: "message_sent",
      user_id: userId,
      new_values: { status: "sent", sent_at: now },
    });

    // Log notification for each recipient + CC
    await logMessageNotification(updated, orgId, supabase);

    return { success: true, message: transformMessage(updated, userId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Acknowledge/resolve a message
export async function acknowledgeExecutiveMessage(
  messageId: string,
  userId: string,
  orgId: string,
  action: "acknowledged" | "resolved" = "acknowledged"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerAuthClient();

    // Get message and verify user is recipient (org-scoped)
    const { data: message } = await supabase
      .from("ceo_executive_messages")
      .select("*")
      .eq("id", messageId)
      .eq("org_id", orgId)
      .single();

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    const isRecipient =
      message.recipient_ids.includes(userId) ||
      message.cc_user_ids.includes(userId);

    if (!isRecipient) {
      return { success: false, error: "Only recipients can acknowledge" };
    }

    const now = new Date().toISOString();

    if (action === "resolved") {
      // Only author can resolve
      if (message.author_id !== userId) {
        return { success: false, error: "Only author can resolve message" };
      }

      const { error: updateError } = await supabase
        .from("ceo_executive_messages")
        .update({
          status: "resolved",
          resolved_at: now,
          resolved_by: userId,
          updated_at: now,
        })
        .eq("id", messageId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Write audit log (REQUIRED for resolve)
      await supabase.from("ceo_audit_logs").insert({
        org_id: orgId,
        entity_type: "message",
        entity_id: messageId,
        action: "message_resolved",
        user_id: userId,
        new_values: { status: "resolved", resolved_at: now },
      });
    } else {
      // Mark read/acknowledged in read tracking table
      const { error: upsertError } = await supabase
        .from("ceo_executive_message_reads")
        .upsert(
          {
            message_id: messageId,
            user_id: userId,
            org_id: orgId,
            read_at: new Date().toISOString(),
            acknowledged_at: now,
          },
          {
            onConflict: "message_id,user_id",
          }
        );

      if (upsertError) {
        return { success: false, error: upsertError.message };
      }

      // Write audit log (REQUIRED for acknowledge)
      await supabase.from("ceo_audit_logs").insert({
        org_id: orgId,
        entity_type: "message",
        entity_id: messageId,
        action: "message_acknowledged",
        user_id: userId,
        new_values: { acknowledged_at: now },
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get messages for current user (inbox)
export async function getUserMessages(
  userId: string,
  orgId: string,
  filter?: { status?: MessageStatus; messageType?: MessageType }
): Promise<{
  success: boolean;
  messages?: ExecutiveMessage[];
  error?: string;
}> {
  try {
    const supabase = await createServerAuthClient();

    // Get messages where user is author, recipient, or CC'd (org-scoped)
    let query = supabase
      .from("ceo_executive_messages")
      .select(
        `
        *,
        ceo_executive_message_reads!left (
          read_at,
          acknowledged_at
        )
      `
      )
      .eq("org_id", orgId)
      .or(
        `author_id.eq.${userId},recipient_ids.cs.{${userId}},cc_user_ids.cs.{${userId}}`
      );

    if (filter?.status) {
      query = query.eq("status", filter.status);
    }

    if (filter?.messageType) {
      query = query.eq("message_type", filter.messageType);
    }

    const { data: messages, error: fetchError } = await query.order(
      "created_at",
      { ascending: false }
    );

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Transform each message
    const transformed = messages.map((m: any) => transformMessage(m, userId));

    return { success: true, messages: transformed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get a single message with read status
export async function getExecutiveMessage(
  messageId: string,
  userId: string,
  orgId: string
): Promise<{ success: boolean; message?: ExecutiveMessage; error?: string }> {
  try {
    const supabase = await createServerAuthClient();

    const { data: message, error: fetchError } = await supabase
      .from("ceo_executive_messages")
      .select(
        `
        *,
        ceo_executive_message_reads!left (
          read_at,
          acknowledged_at
        )
      `
      )
      .eq("id", messageId)
      .eq("org_id", orgId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    // Verify access
    const isAuthor = message.author_id === userId;
    const isRecipient = message.recipient_ids.includes(userId);
    const isCCd = message.cc_user_ids.includes(userId);

    if (!isAuthor && !isRecipient && !isCCd) {
      return { success: false, error: "Not authorized to view this message" };
    }

    return { success: true, message: transformMessage(message, userId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Mark message as read (idempotent)
export async function markMessageRead(
  messageId: string,
  userId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerAuthClient();

    const { error: upsertError } = await supabase
      .from("ceo_executive_message_reads")
      .upsert(
        {
          message_id: messageId,
          user_id: userId,
          org_id: orgId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: "message_id,user_id",
        }
      );

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper: Transform raw message with read/ack status
function transformMessage(
  message: any,
  currentUserId: string
): ExecutiveMessage {
  const read = message.ceo_executive_message_reads?.[0];
  const isRead = !!read?.read_at;
  const isAcknowledged = !!read?.acknowledged_at;

  return {
    ...message,
    is_read: isRead,
    read_at: read?.read_at || null,
    is_acknowledged: isAcknowledged,
    current_user_is_author: message.author_id === currentUserId,
    current_user_is_recipient: message.recipient_ids.includes(currentUserId),
  };
}

// Helper: Log notification for message recipients
async function logMessageNotification(
  message: any,
  orgId: string,
  supabase: Awaited<ReturnType<typeof createServerAuthClient>>
) {
  try {
    const allRecipients = [
      ...(message.recipient_ids || []),
      ...(message.cc_user_ids || []),
    ];
    const uniqueRecipients = [...new Set(allRecipients)];

    const notificationRecords = [];
    for (const recipientId of uniqueRecipients) {
      const { data: user } = await supabase
        .from("ceo_users")
        .select("email")
        .eq("id", recipientId)
        .eq("org_id", orgId) // Org-scoped filter
        .single();

      if (user) {
        notificationRecords.push({
          org_id: orgId,
          event_type: "message_sent",
          recipient_id: recipientId,
          recipient_email: user.email,
          related_entity_type: "message",
          related_entity_id: message.id,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      }
    }

    // Batch insert
    if (notificationRecords.length > 0) {
      await supabase.from("ceo_notification_log").insert(notificationRecords);
    }
  } catch (error) {
    console.error("Failed to log message notification:", error);
  }
}
