import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "server-only";
import { z } from "zod";

import {
  getAnnouncementsForUser,
  publishAnnouncement,
} from "@/lib/server/announcements";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

// Zod DTO for announcement creation
const AnnouncementCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(1, "Content cannot be empty"),
  announcement_type: z.enum(["info", "important", "urgent"]),
  target_scope: z.enum(["all", "team", "individuals"]),
  target_user_ids: z.array(z.string().uuid()).optional(),
  require_acknowledgement: z.boolean().optional(),
  sticky_until: z.string().datetime().optional(),
});

// GET /api/announcements - List announcements for current user
export async function GET() {
  try {
    const supabase = await createServerAuthClient();
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
    const supabase = await createServerAuthClient();
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

    // CEO/Admin guard (REQUIRED)
    if (!["CEO", "ADMIN"].includes(profile.role_code)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Zod validation (REQUIRED)
    const validation = AnnouncementCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const result = await publishAnnouncement(
      validatedData,
      user.id,
      profile.org_id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // If urgent, trigger email notification (stubbed for now, logged to notification_log)
    if (validatedData.announcement_type === "urgent") {
      await logUrgentAnnouncementNotification(
        result.announcement!,
        profile.org_id,
        supabase
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
  orgId: string,
  supabase: Awaited<ReturnType<typeof createServerAuthClient>>
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

    // Batch insert notification logs (org-scoped)
    const notificationRecords = [];
    for (const recipientId of recipientIds) {
      const { data: user } = await supabase
        .from("ceo_users")
        .select("email")
        .eq("id", recipientId)
        .eq("org_id", orgId) // Org-scoped filter
        .single();

      if (user) {
        notificationRecords.push({
          org_id: orgId,
          event_type: "announcement_published",
          recipient_id: recipientId,
          recipient_email: user.email,
          related_entity_type: "announcement",
          related_entity_id: announcement.id,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      }
    }

    // Batch insert instead of loop
    if (notificationRecords.length > 0) {
      await supabase.from("ceo_notification_log").insert(notificationRecords);
    }
  } catch (error) {
    console.error("Failed to log urgent announcement notification:", error);
  }
}
