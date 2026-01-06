import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canTransitionTo, isMaterialChange } from "@/lib/constants/status";
import {
  createApprovalForRequest,
  invalidateApproval,
} from "@/lib/server/approvals";
import { writeAuditLog } from "@/lib/supabase/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import {
  transitionStatusSchema,
  updateRequestSchema,
} from "@/lib/validations/request";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerAuthClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("ceo_users")
      .select("org_id")
      .eq("id", authUser.id)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    const { org_id: orgId } = user;

    // Fetch request with related data
    const { data: request, error: fetchError } = await supabase
      .from("ceo_requests")
      .select(
        `
        *,
        requester:ceo_users!requester_id(id, email),
        category:ceo_categories(id, name),
        approvals:ceo_request_approvals(*),
        comments:ceo_request_comments(*, author:ceo_users(email)),
        attachments:ceo_request_attachments(*)
      `
      )
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (fetchError || !request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request }, { status: 200 });
  } catch (err) {
    console.error("GET /api/requests/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerAuthClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("ceo_users")
      .select("org_id, role_code")
      .eq("id", authUser.id)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    const { org_id: orgId, role_code: roleCode } = user;

    // Get existing request
    const { data: existingRequest, error: fetchError } = await supabase
      .from("ceo_requests")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const body = await req.json();

    // Handle status transition
    if (body.target_status) {
      const validation = transitionStatusSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }

      const { target_status, notes } = validation.data;

      // CRITICAL: Lock approval/rejection/closure to CEO/ADMIN only (PRD governance)
      const ceoOnlyStatuses = ["APPROVED", "REJECTED", "CLOSED"];
      if (
        ceoOnlyStatuses.includes(target_status) &&
        !["CEO", "ADMIN"].includes(roleCode)
      ) {
        return NextResponse.json(
          { error: `Only CEO/Admin can transition to ${target_status}` },
          { status: 403 }
        );
      }

      // Validate transition
      if (!canTransitionTo(existingRequest.status_code, target_status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existingRequest.status_code} to ${target_status}`,
          },
          { status: 400 }
        );
      }

      // Update status
      const updateData: any = {
        status_code: target_status,
        status_changed_at: new Date().toISOString(),
        updated_by: authUser.id,
        last_activity_at: new Date().toISOString(),
      };

      if (target_status === "SUBMITTED")
        updateData.submitted_at = new Date().toISOString();
      if (target_status === "APPROVED")
        updateData.approved_at = new Date().toISOString();
      if (target_status === "CLOSED")
        updateData.closed_at = new Date().toISOString();

      const { data: updatedRequest, error: updateError } = await supabase
        .from("ceo_requests")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) {
        console.error("Status update error:", {
          error: updateError,
          requestId: id,
          orgId,
        });
        return NextResponse.json(
          {
            error: "Failed to update status",
            details: updateError?.message || "Unknown error",
          },
          { status: 500 }
        );
      }

      // PHASE 4: Create approval when moving to IN_REVIEW
      if (target_status === "IN_REVIEW") {
        const approvalResult = await createApprovalForRequest({
          orgId,
          requestId: id,
          requestVersion: updatedRequest.request_version,
          requestSnapshot: updatedRequest,
          submittedBy: authUser.id,
          actorRoleCode: roleCode as "MANAGER" | "CEO" | "ADMIN",
        });

        if (!approvalResult.success) {
          console.error("Failed to create approval:", approvalResult.error);
          // Non-blocking - request status change already committed
        }
      }

      // Audit log status change
      await writeAuditLog({
        org_id: orgId,
        user_id: authUser.id,
        entity_type: "request",
        entity_id: id,
        action: "status_changed",
        actor_role_code: roleCode,
        old_values: { status_code: existingRequest.status_code },
        new_values: { status_code: target_status },
        metadata: notes ? { notes } : undefined,
      });

      return NextResponse.json({ request: updatedRequest }, { status: 200 });
    }

    // Handle content update
    const validation = updateRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Only allow editing drafts or material changes create new version
    if (existingRequest.status_code !== "DRAFT") {
      const materialChange = isMaterialChange(existingRequest, validatedData);

      if (materialChange) {
        // PHASE 4: Invalidate approvals using helper
        await invalidateApproval({
          orgId,
          requestId: id,
          reason:
            "Material change detected: title, description, or priority modified",
          actorRoleCode: roleCode as "MANAGER" | "CEO" | "ADMIN",
        });
      }
    }

    // Update request
    const updateData: any = {
      ...validatedData,
      request_version: existingRequest.request_version + 1,
      updated_by: authUser.id,
      last_activity_at: new Date().toISOString(),
    };

    const { data: updatedRequest, error: updateError } = await supabase
      .from("ceo_requests")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Request update error:", {
        error: updateError,
        requestId: id,
        orgId,
      });
      return NextResponse.json(
        { error: "Failed to update request", details: updateError.message },
        { status: 500 }
      );
    }

    // Audit log update
    await writeAuditLog({
      org_id: orgId,
      user_id: authUser.id,
      entity_type: "request",
      entity_id: id,
      action: "updated",
      actor_role_code: roleCode,
      old_values: {
        title: existingRequest.title,
        description: existingRequest.description ?? null,
        priority_code: existingRequest.priority_code,
      },
      new_values: {
        title: validatedData.title,
        description: validatedData.description ?? null,
        priority_code: validatedData.priority_code,
      },
      metadata: { request_version: updatedRequest.request_version },
    });

    return NextResponse.json({ request: updatedRequest }, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/requests/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerAuthClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("ceo_users")
      .select("org_id, role_code")
      .eq("id", authUser.id)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    const { org_id: orgId, role_code: roleCode } = user;

    const body = await req.json();
    const reason = body.reason || "Deleted by user";

    // Soft delete
    const { error: deleteError } = await supabase
      .from("ceo_requests")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_reason: reason,
        updated_by: authUser.id,
      })
      .eq("id", id)
      .eq("org_id", orgId);

    if (deleteError) {
      console.error("Request delete error:", {
        error: deleteError,
        requestId: id,
        orgId,
      });
      return NextResponse.json(
        { error: "Failed to delete request", details: deleteError.message },
        { status: 500 }
      );
    }

    // Audit log deletion
    await writeAuditLog({
      org_id: orgId,
      user_id: authUser.id,
      entity_type: "request",
      entity_id: id,
      action: "deleted",
      actor_role_code: roleCode,
      metadata: { reason },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/requests/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
