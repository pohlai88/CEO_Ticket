import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getAnnouncementsForUser } from "@/lib/server/announcements";
import { publishAnnouncement } from "@/lib/server/announcements";

// GET /api/announcements - List announcements for current user
export async function GET() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("ceo_users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const result = await getAnnouncementsForUser(user.id, profile.org_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ announcements: result.announcements });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/announcements - Create announcement (CEO only)
export async function POST(req: NextRequest) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile and verify CEO role
    const { data: profile } = await supabase
      .from("ceo_users")
      .select("org_id, role_code")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    if (profile.role_code !== "CEO" && profile.role_code !== "ADMIN") {
      return NextResponse.json(
        { error: "Only CEO/Admin can create announcements" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const result = await publishAnnouncement(body, user.id, profile.org_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // If urgent, trigger email notification (stubbed for now, logged to notification_log)
    if (body.announcement_type === "urgent") {
      await logUrgentAnnouncementNotification(
        result.announcement!,
        profile.org_id
      );
    }

    return NextResponse.json(
      { announcement: result.announcement },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Stub for email notification - logs to ceo_notification_log
async function logUrgentAnnouncementNotification(
  announcement: any,
  orgId: string
) {
  try {
    // Get target users based on scope
    let recipientIds: string[] = [];

    if (announcement.target_scope === "all") {
      const { data: users } = await supabase
        .from("ceo_users")
        .select("id, email")
        .eq("org_id", orgId)
        .eq("is_active", true);

      recipientIds = users?.map((u) => u.id) || [];
    } else if (announcement.target_scope === "individuals") {
      recipientIds = announcement.target_user_ids || [];
    }

    // Log notification for each recipient
    for (const recipientId of recipientIds) {
      const { data: user } = await supabase
        .from("ceo_users")
        .select("email")
        .eq("id", recipientId)
        .single();

      if (user) {
        await supabase.from("ceo_notification_log").insert({
          org_id: orgId,
          event_type: "announcement_published",
          recipient_id: recipientId,
          recipient_email: user.email,
          related_entity_type: "announcement",
          related_entity_id: announcement.id,
          status: "sent", // Would be 'sent' after actual email delivery
          sent_at: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("Failed to log urgent announcement notification:", error);
  }
}
