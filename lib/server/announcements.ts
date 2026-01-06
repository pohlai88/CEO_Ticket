import { createServerAuthClient } from "@/lib/supabase/server-auth";
import "server-only";

export interface AnnouncementData {
  title: string;
  content: string;
  announcement_type: "info" | "important" | "urgent";
  target_scope: "all" | "team" | "individuals";
  target_user_ids?: string[];
  require_acknowledgement?: boolean;
  sticky_until?: string;
}

export interface Announcement {
  id: string;
  org_id: string;
  title: string;
  content: string;
  announcement_type: "info" | "important" | "urgent";
  target_scope: "all" | "team" | "individuals";
  target_user_ids: string[];
  require_acknowledgement: boolean;
  sticky_until: string | null;
  published_by: string;
  published_at: string;
  updated_at: string;
  created_by: string;
  is_read: boolean;
  read_at: string | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  is_urgent_outstanding: boolean;
}

export async function publishAnnouncement(
  data: AnnouncementData,
  userId: string,
  orgId: string
): Promise<{ success: boolean; announcement?: Announcement; error?: string }> {
  try {
    const supabase = await createServerAuthClient();

    // Insert announcement (org-scoped)
    const { data: announcement, error: insertError } = await supabase
      .from("ceo_announcements")
      .insert({
        org_id: orgId,
        title: data.title,
        content: data.content,
        announcement_type: data.announcement_type,
        target_scope: data.target_scope,
        target_user_ids: data.target_user_ids || [],
        require_acknowledgement: data.require_acknowledgement ?? false,
        sticky_until: data.sticky_until || null,
        published_by: userId,
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Write audit log (REQUIRED for publish)
    await supabase.from("ceo_audit_logs").insert({
      org_id: orgId,
      entity_type: "announcement",
      entity_id: announcement.id,
      action: "announcement_published",
      user_id: userId,
      new_values: announcement,
    });

    return { success: true, announcement: announcement as Announcement };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getAnnouncementsForUser(
  userId: string,
  orgId: string
): Promise<{
  success: boolean;
  announcements?: Announcement[];
  error?: string;
}> {
  try {
    const supabase = await createServerAuthClient();

    // Get announcements targeted to this user (org-scoped)
    const { data: announcements, error: fetchError } = await supabase
      .from("ceo_announcements")
      .select(
        `
        *,
        ceo_announcement_reads!left (
          read_at,
          acknowledged_at
        )
      `
      )
      .eq("org_id", orgId)
      .or(`target_scope.eq.all,target_user_ids.cs.{${userId}}`)
      .order("published_at", { ascending: false });

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Transform with read/ack status
    const transformed = announcements.map((a: any) => {
      const read = a.ceo_announcement_reads?.[0];
      const isRead = !!read?.read_at;
      const isAcknowledged = !!read?.acknowledged_at;
      const isUrgentOutstanding =
        a.announcement_type === "urgent" &&
        a.require_acknowledgement &&
        !isAcknowledged;

      return {
        ...a,
        is_read: isRead,
        read_at: read?.read_at || null,
        is_acknowledged: isAcknowledged,
        acknowledged_at: read?.acknowledged_at || null,
        is_urgent_outstanding: isUrgentOutstanding,
      };
    });

    return { success: true, announcements: transformed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function acknowledgeAnnouncement(
  announcementId: string,
  userId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerAuthClient();

    // Check if already acknowledged
    const { data: existing } = await supabase
      .from("ceo_announcement_reads")
      .select("acknowledged_at, read_at")
      .eq("announcement_id", announcementId)
      .eq("user_id", userId)
      .single();

    // ACK must be irreversible - if already acknowledged, return success
    if (existing?.acknowledged_at) {
      return { success: true };
    }

    // Upsert read record with acknowledgement
    const now = new Date().toISOString();
    const { error: upsertError } = await supabase
      .from("ceo_announcement_reads")
      .upsert(
        {
          announcement_id: announcementId,
          user_id: userId,
          org_id: orgId,
          read_at: existing?.read_at || now,
          acknowledged_at: now,
        },
        {
          onConflict: "announcement_id,user_id",
        }
      );

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    // CRITICAL: Write audit log for acknowledgement
    await supabase.from("ceo_audit_logs").insert({
      org_id: orgId,
      entity_type: "announcement",
      entity_id: announcementId,
      action: "acknowledged",
      user_id: userId,
      new_values: {
        announcement_id: announcementId,
        acknowledged_at: new Date().toISOString(),
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function markAnnouncementRead(
  announcementId: string,
  userId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerAuthClient();

    // Upsert read record (without acknowledgement)
    const { error: upsertError } = await supabase
      .from("ceo_announcement_reads")
      .upsert(
        {
          announcement_id: announcementId,
          user_id: userId,
          org_id: orgId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: "announcement_id,user_id",
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
