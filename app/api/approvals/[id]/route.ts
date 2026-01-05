import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { writeAuditLog } from "@/lib/supabase/server";
import { z } from "zod";

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
  const { data: profile } = await supabase
    .from("ceo_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || !["ceo", "admin"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Forbidden - CEO/Admin only" },
      { status: 403 }
    );
  }

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
      approval_id,
      request_id,
      decision,
      is_valid,
      request_snapshot,
      ceo_requests!inner (
        status_code,
        title
      )
    `
    )
    .eq("approval_id", approvalId)
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
  const { error: updateApprovalError } = await supabase
    .from("ceo_request_approvals")
    .update({
      decision,
      decision_notes,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("approval_id", approvalId);

  if (updateApprovalError) {
    return NextResponse.json(
      { error: "Failed to record decision" },
      { status: 500 }
    );
  }

  // 7. Update request status based on decision
  const newStatus = decision === "approved" ? "APPROVED" : "REJECTED";

  const { error: updateRequestError } = await supabase
    .from("ceo_requests")
    .update({ status_code: newStatus })
    .eq("request_id", approval.request_id);

  if (updateRequestError) {
    return NextResponse.json(
      { error: "Failed to update request status" },
      { status: 500 }
    );
  }

  // 8. Audit log - Decision is high-value action
  await writeAuditLog({
    org_id: "", // TODO: Get from context
    entity_type: "approval",
    entity_id: approvalId,
    action: "decided",
    user_id: user.id,
    old_values: { decision: "pending" },
    new_values: {
      decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    },
    metadata: { reason: `CEO decision: ${decision}` },
  });

  await writeAuditLog({
    org_id: "", // TODO: Get from context
    entity_type: "request",
    entity_id: approval.request_id,
    action: "status_changed",
    user_id: user.id,
    old_values: { status_code: "IN_REVIEW" },
    new_values: { status_code: newStatus },
    metadata: { reason: `Approval ${decision}` },
  });

  // 9. Return success with updated approval
  const { data: updatedApproval } = await supabase
    .from("ceo_request_approvals")
    .select(
      `
      approval_id,
      request_id,
      decision,
      decision_notes,
      decided_by,
      decided_at,
      approval_round
    `
    )
    .eq("approval_id", approvalId)
    .single();

  return NextResponse.json({
    success: true,
    approval: updatedApproval,
  });
}
