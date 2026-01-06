import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "server-only";

import { acknowledgeAnnouncement } from "@/lib/server/announcements";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

// POST /api/announcements/[id]/acknowledge - Acknowledge announcement (irreversible)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: announcementId } = await params;

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

    // Verify announcement exists and user has access
    const { data: announcement } = await supabase
      .from("ceo_announcements")
      .select("*")
      .eq("id", announcementId)
      .eq("org_id", profile.org_id)
      .single();

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    // Check if user is in target scope
    const isTargeted =
      announcement.target_scope === "all" ||
      (announcement.target_user_ids || []).includes(user.id);

    if (!isTargeted) {
      return NextResponse.json(
        { error: "Not authorized to acknowledge this announcement" },
        { status: 403 }
      );
    }

    // Acknowledge (with audit logging)
    const result = await acknowledgeAnnouncement(
      announcementId,
      user.id,
      profile.org_id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
