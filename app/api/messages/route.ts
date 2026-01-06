import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "server-only";
import { z } from "zod";

import {
  createExecutiveMessage,
  getUserMessages,
} from "@/lib/server/executive-messages";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

// Zod DTO for message creation
const MessageCreateSchema = z.object({
  message_type: z.enum(["consultation", "direction", "clarification"]),
  context_type: z.enum(["request", "announcement", "general"]),
  context_id: z.string().uuid().optional(),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  body: z.string().min(1, "Body cannot be empty"),
  recipient_ids: z
    .array(z.string().uuid())
    .min(1, "At least one recipient required"),
  cc_user_ids: z.array(z.string().uuid()).optional(),
});

// POST /api/messages - Create a new message (draft)
export async function POST(req: NextRequest) {
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

    // Zod validation (REQUIRED)
    const validation = MessageCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const result = await createExecutiveMessage(
      validatedData,
      user.id,
      profile.role_code as "MANAGER" | "CEO" | "ADMIN",
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
