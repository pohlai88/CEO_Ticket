import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "server-only";
import { z } from "zod";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

// Zod DTO for adding watcher
const AddWatcherSchema = z.object({
  watcher_id: z.string().uuid("Invalid user ID"),
  role: z.enum(["OBSERVER", "CONTRIBUTOR", "ESCALATION_CONTACT"]).optional(),
});

// POST /api/requests/[id]/watchers - Add watcher
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
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

    // Zod validation
    const validation = AddWatcherSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { watcher_id, role } = validation.data;

    // Verify request exists and user has access (org-scoped)
    const { data: request } = await supabase
      .from("ceo_requests")
      .select("id, requester_id, org_id")
      .eq("id", requestId)
      .eq("org_id", profile.org_id)
      .single();

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only requester, CEO, or ADMIN can add watchers
    const canModify =
      request.requester_id === user.id ||
      ["CEO", "ADMIN"].includes(profile.role_code);

    if (!canModify) {
      return NextResponse.json(
        { error: "Only requester or CEO/Admin can add watchers" },
        { status: 403 }
      );
    }

    // Verify watcher exists in same org
    const { data: watcherUser } = await supabase
      .from("ceo_users")
      .select("id")
      .eq("id", watcher_id)
      .eq("org_id", profile.org_id)
      .single();

    if (!watcherUser) {
      return NextResponse.json(
        { error: "Watcher user not found in organization" },
        { status: 404 }
      );
    }

    // Insert watcher (upsert to handle duplicates)
    const { data: watcher, error: insertError } = await supabase
      .from("ceo_request_watchers")
      .upsert(
        {
          request_id: requestId,
          watcher_id,
          org_id: profile.org_id,
          role: role || "OBSERVER",
          added_by: user.id,
        },
        {
          onConflict: "request_id,watcher_id",
        }
      )
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("ceo_audit_logs").insert({
      org_id: profile.org_id,
      entity_type: "request",
      entity_id: requestId,
      action: "watcher_added",
      user_id: user.id,
      new_values: { watcher_id, role: role || "OBSERVER" },
    });

    return NextResponse.json({ watcher }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/requests/[id]/watchers?watcher_id=xxx - Remove watcher
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
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

    const watcherId = req.nextUrl.searchParams.get("watcher_id");
    if (!watcherId) {
      return NextResponse.json(
        { error: "watcher_id query parameter required" },
        { status: 400 }
      );
    }

    // Verify request exists and user has access
    const { data: request } = await supabase
      .from("ceo_requests")
      .select("id, requester_id, org_id")
      .eq("id", requestId)
      .eq("org_id", profile.org_id)
      .single();

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only requester, CEO, or ADMIN can remove watchers
    const canModify =
      request.requester_id === user.id ||
      ["CEO", "ADMIN"].includes(profile.role_code);

    if (!canModify) {
      return NextResponse.json(
        { error: "Only requester or CEO/Admin can remove watchers" },
        { status: 403 }
      );
    }

    // Delete watcher (org-scoped)
    const { error: deleteError } = await supabase
      .from("ceo_request_watchers")
      .delete()
      .eq("request_id", requestId)
      .eq("watcher_id", watcherId)
      .eq("org_id", profile.org_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("ceo_audit_logs").insert({
      org_id: profile.org_id,
      entity_type: "request",
      entity_id: requestId,
      action: "watcher_removed",
      user_id: user.id,
      old_values: { watcher_id: watcherId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
