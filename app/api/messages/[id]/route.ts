import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import {
  sendExecutiveMessage,
  acknowledgeExecutiveMessage,
  markMessageRead,
} from "@/lib/server/executive-messages";

// PATCH /api/messages/[id] - Send or update a message
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
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

    const body = await req.json();
    const { action } = body; // 'send' or 'mark-read'

    if (action === "send") {
      const result = await sendExecutiveMessage(
        messageId,
        user.id,
        profile.org_id
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ message: result.message });
    }

    if (action === "mark-read") {
      const { success, error } = await markMessageRead(
        messageId,
        user.id,
        profile.org_id
      );

      if (!success) {
        return NextResponse.json({ error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/messages/[id]/acknowledge - Acknowledge or resolve a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
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

    const body = await req.json();
    const { action } = body; // 'acknowledge' or 'resolve'

    if (action === "resolve") {
      const result = await acknowledgeExecutiveMessage(
        messageId,
        user.id,
        profile.org_id,
        "resolved"
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // Default: acknowledge
    const result = await acknowledgeExecutiveMessage(
      messageId,
      user.id,
      profile.org_id,
      "acknowledged"
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
