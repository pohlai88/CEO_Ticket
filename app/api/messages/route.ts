import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import {
  createExecutiveMessage,
  getUserMessages,
} from "@/lib/server/executive-messages";

// POST /api/messages - Create a new message (draft)
export async function POST(req: NextRequest) {
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
      .select("org_id, role_code")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const result = await createExecutiveMessage(
      body,
      user.id,
      profile.role_code,
      profile.org_id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: result.message }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET /api/messages - List messages for current user (inbox)
export async function GET(req: NextRequest) {
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

    // Parse query params for filtering
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") as any;
    const messageType = searchParams.get("type") as any;

    const result = await getUserMessages(user.id, profile.org_id, {
      status: status || undefined,
      messageType: messageType || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ messages: result.messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
