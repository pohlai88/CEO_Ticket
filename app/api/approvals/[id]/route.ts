import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "server-only";

import { z } from "zod";

import { writeAuditLog } from "@/lib/supabase/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

// Validation schema for CEO decision
const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  decision_notes: z.string().max(500).optional(),
});

/**
 * PATCH /api/approvals/[id]
 * CEO makes approval decision (approve or reject)
 *
 * Guards:
 * - Must be CEO or Admin role
 * - Approval must be pending
 * - Approval must be valid (not invalidated)
 * - Decision is immutable once made
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerAuthClient();
  const { id: approvalId } = await params;

  // 1. Authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Role authorization - CEO or Admin only
  const { data: profile, error: profileError } = await supabase
    .from("ceo_users")
    .select("org_id, role_code")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !["CEO", "ADMIN"].includes(profile.role_code)
  ) {
    return NextResponse.json(
      { error: "Forbidden - CEO/Admin only" },
      { status: 403 }
    );
  }

  const orgId = profile.org_id;

  // 3. Input validation
  const body = await req.json();
  const validation = approvalDecisionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.errors },
      { status: 400 }
    );
  }

  const { decision, decision_notes } = validation.data;

  // 4. Fetch approval with request context
  const { data: approval, error: fetchError } = await supabase
    .from("ceo_request_approvals")
    .select(
      `
      id,
      org_id,
      request_id,
      request_version,
      approval_round,
      decision,
      is_valid,
      request_snapshot,
      ceo_requests!inner (
        id,
        status_code,
        title
      )
    `
    )
    .eq("id", approvalId)
    .eq("org_id", orgId)
    .single();

  if (fetchError || !approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  }

  // 5. CRITICAL GUARD — Prevent double-decision or invalidated approval
  if (approval.decision !== "pending") {
    return NextResponse.json(
      { error: "Decision already made - approvals are immutable" },
      { status: 409 }
    );
  }

  if (approval.is_valid === false) {
    return NextResponse.json(
      {
        error:
          "Approval invalidated due to material changes - request must be resubmitted",
      },
      { status: 409 }
    );
  }

  // 6. Make decision - update approval
  const decidedAt = new Date().toISOString();

  const { error: updateApprovalError } = await supabase
    .from("ceo_request_approvals")
    .update({
      decision,
      notes: decision_notes,
      approved_by: user.id,
      decided_at: decidedAt,
      updated_at: decidedAt,
    })
    .eq("id", approvalId)
    .eq("org_id", orgId);

  if (updateApprovalError) {
    return NextResponse.json(
      { error: "Failed to record decision" },
      { status: 500 }
    );
  }

  // 7. Update request status based on decision
  const newStatus = decision === "approved" ? "APPROVED" : "REJECTED";

  const statusChangedAt = new Date().toISOString();

  const { error: updateRequestError } = await supabase
    .from("ceo_requests")
    .update({
      status_code: newStatus,
      status_changed_at: statusChangedAt,
      approved_at: decision === "approved" ? statusChangedAt : null,
      last_activity_at: statusChangedAt,
      updated_at: statusChangedAt,
    })
    .eq("id", approval.request_id)
    .eq("org_id", orgId);

  if (updateRequestError) {
    return NextResponse.json(
      { error: "Failed to update request status" },
      { status: 500 }
    );
  }

  // 8. Audit log - Decision is high-value action
  await writeAuditLog({
    org_id: orgId,
    entity_type: "approval",
    entity_id: approvalId,
    action: decision === "approved" ? "approved" : "rejected",
    user_id: user.id,
    actor_role_code: profile.role_code,
    old_values: { decision: "pending" },
    new_values: {
      decision,
      approved_by: user.id,
      decided_at: decidedAt,
      approval_round: approval.approval_round,
    },
    metadata: {
      request_id: approval.request_id,
      request_version: approval.request_version,
      ...(decision_notes ? { decision_notes } : {}),
    },
  });

  await writeAuditLog({
    org_id: orgId,
    entity_type: "request",
    entity_id: approval.request_id,
    action: "status_transitioned",
    user_id: user.id,
    actor_role_code: profile.role_code,
    old_values: { status_code: "IN_REVIEW" },
    new_values: { status_code: newStatus },
    metadata: { reason: `Approval ${decision}` },
  });

  // 9. Return success with updated approval
  const { data: updatedApproval } = await supabase
    .from("ceo_request_approvals")
    .select(
      `
      id,
      request_id,
      decision,
      notes,
      approved_by,
      decided_at,
      approval_round,
      request_version
    `
    )
    .eq("id", approvalId)
    .eq("org_id", orgId)
    .single();

  return NextResponse.json({
    success: true,
    approval: updatedApproval,
  });
}
