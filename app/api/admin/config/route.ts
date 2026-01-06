import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "server-only";
import { z } from "zod";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

// Zod DTO for config update
const ConfigUpdateSchema = z.object({
  max_attachment_mb: z.number().int().min(5).max(50).optional(),
  auto_cancel_drafts_days: z.number().int().min(14).max(90).optional(),
  restore_window_days: z.number().int().min(7).max(30).optional(),
  audit_retention_days: z.number().int().min(90).max(2557).optional(),
  default_priority_code: z.enum(["P1", "P2", "P3", "P4", "P5"]).optional(),
  allow_manager_self_approve: z.boolean().optional(),
  require_approval_notes: z.boolean().optional(),
  mention_max_per_comment: z.number().int().min(1).max(20).optional(),
  mention_scope: z.array(z.string()).optional(),
});

// GET /api/admin/config - Get CEO config
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
      .select("org_id, role_code")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Only CEO/ADMIN can access config
    if (!["CEO", "ADMIN"].includes(profile.role_code)) {
      return NextResponse.json(
        { error: "Only CEO/Admin can access configuration" },
        { status: 403 }
      );
    }

    // Get config (org-scoped)
    const { data: config, error: fetchError } = await supabase
      .from("ceo_config")
      .select("*")
      .eq("org_id", profile.org_id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/config - Update CEO config
export async function PATCH(req: NextRequest) {
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

    // Only CEO/ADMIN can update config
    if (!["CEO", "ADMIN"].includes(profile.role_code)) {
      return NextResponse.json(
        { error: "Only CEO/Admin can update configuration" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Zod validation
    const validation = ConfigUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Get current config for audit
    const { data: oldConfig } = await supabase
      .from("ceo_config")
      .select("*")
      .eq("org_id", profile.org_id)
      .single();

    // Update config (org-scoped)
    const { data: config, error: updateError } = await supabase
      .from("ceo_config")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", profile.org_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Audit log (track what changed) - use service-role helper
    const { writeAuditLog } = await import("@/lib/supabase/server");
    await writeAuditLog({
      org_id: profile.org_id,
      entity_type: "ceo_config",
      entity_id: config.id.toString(),
      action: "config_updated",
      user_id: user.id,
      actor_role_code: profile.role_code,
      old_values: oldConfig,
      new_values: updates,
    });

    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
