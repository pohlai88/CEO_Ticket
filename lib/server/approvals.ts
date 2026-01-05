import "server-only";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { writeAuditLog } from "@/lib/supabase/server";

/**
 * INTERNAL HELPER — Create approval record when request moves to IN_REVIEW
 * Called from POST /api/requests when status transitions to IN_REVIEW
 *
 * @returns approval_id on success
 */
export async function createApprovalForRequest(params: {
  requestId: string;
  requestSnapshot: any; // Full request data at submission time
  submittedBy: string;
}): Promise<
  { success: true; approvalId: string } | { success: false; error: string }
> {
  const supabase = await createServerAuthClient();

  // Get auth context for audit
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  // Create approval record
  const { data: approval, error: insertError } = await supabase
    .from("ceo_approvals")
    .insert({
      request_id: params.requestId,
      request_snapshot: params.requestSnapshot,
      approval_round: 1, // First submission always round 1
      decision: "pending",
      is_valid: true,
      submitted_by: params.submittedBy,
    })
    .select("approval_id")
    .single();

  if (insertError || !approval) {
    return {
      success: false,
      error: insertError?.message || "Failed to create approval",
    };
  }

  // Audit log
  await writeAuditLog({
    org_id: "", // TODO: Get from request context
    entity_type: "approval",
    entity_id: approval.approval_id,
    action: "created",
    user_id: user.id,
    new_values: {
      request_id: params.requestId,
      approval_round: 1,
      decision: "pending",
    },
  });

  return { success: true, approvalId: approval.approval_id };
}

/**
 * INTERNAL HELPER — Invalidate approval when request is materially edited
 * Called from PATCH /api/requests/[id] when material change detected
 *
 * Only invalidates if approval is still pending
 */
export async function invalidateApproval(params: {
  requestId: string;
  reason: string;
}): Promise<{ success: boolean }> {
  const supabase = await createServerAuthClient();

  // Get auth context for audit
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false };
  }

  // Find pending approval for this request
  const { data: approval } = await supabase
    .from("ceo_request_approvals")
    .select("approval_id, decision")
    .eq("request_id", params.requestId)
    .eq("decision", "pending")
    .eq("is_valid", true)
    .order("approval_round", { ascending: false })
    .limit(1)
    .single();

  if (!approval) {
    // No pending approval to invalidate (already decided or doesn't exist)
    return { success: true };
  }

  // Invalidate it
  const { error: updateError } = await supabase
    .from("ceo_request_approvals")
    .update({ is_valid: false })
    .eq("approval_id", approval.approval_id);

  if (updateError) {
    return { success: false };
  }

  // Audit log
  await writeAuditLog({
    org_id: "", // TODO: Get from request context
    entity_type: "approval",
    entity_id: approval.approval_id,
    action: "invalidated",
    user_id: user.id,
    old_values: { is_valid: true },
    new_values: { is_valid: false },
    metadata: { reason: params.reason },
  });

  return { success: true };
}

/**
 * INTERNAL HELPER — Check if request can be resubmitted
 * Called from POST /api/requests/[id]/resubmit
 *
 * Rules:
 * - Request must be REJECTED
 * - No pending approvals exist
 */
export async function canResubmit(requestId: string): Promise<{
  allowed: boolean;
  reason?: string;
  nextRound?: number;
}> {
  const supabase = await createServerAuthClient();

  // Get request status
  const { data: request } = await supabase
    .from("ceo_requests")
    .select("status_code")
    .eq("request_id", requestId)
    .single();

  if (!request) {
    return { allowed: false, reason: "Request not found" };
  }

  if (request.status_code !== "REJECTED") {
    return {
      allowed: false,
      reason: "Only rejected requests can be resubmitted",
    };
  }

  // Check for any pending approvals (shouldn't exist, but safety check)
  const { data: pendingApprovals } = await supabase
    .from("ceo_request_approvals")
    .select("approval_id")
    .eq("request_id", requestId)
    .eq("decision", "pending")
    .limit(1);

  if (pendingApprovals && pendingApprovals.length > 0) {
    return { allowed: false, reason: "Pending approval exists" };
  }

  // Get highest approval round
  const { data: lastApproval } = await supabase
    .from("ceo_request_approvals")
    .select("approval_round")
    .eq("request_id", requestId)
    .order("approval_round", { ascending: false })
    .limit(1)
    .single();

  const nextRound = lastApproval ? lastApproval.approval_round + 1 : 1;

  return { allowed: true, nextRound };
}

/**
 * INTERNAL HELPER — Create new approval round on resubmission
 * Called from POST /api/requests/[id]/resubmit after validation
 */
export async function createResubmissionApproval(params: {
  requestId: string;
  requestSnapshot: any;
  submittedBy: string;
  approvalRound: number;
}): Promise<
  { success: true; approvalId: string } | { success: false; error: string }
> {
  const supabase = await createServerAuthClient();

  // Get auth context for audit
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Authentication required" };
  }

  // Create approval record
  const { data: approval, error: insertError } = await supabase
    .from("ceo_request_approvals")
    .insert({
      request_id: params.requestId,
      request_snapshot: params.requestSnapshot,
      approval_round: params.approvalRound,
      decision: "pending",
      is_valid: true,
      submitted_by: params.submittedBy,
    })
    .select("approval_id")
    .single();

  if (insertError || !approval) {
    return {
      success: false,
      error: insertError?.message || "Failed to create approval",
    };
  }

  // Audit log
  await writeAuditLog({
    org_id: "", // TODO: Get from request context
    entity_type: "approval",
    entity_id: approval.approval_id,
    action: "resubmitted",
    user_id: user.id,
    new_values: {
      request_id: params.requestId,
      approval_round: params.approvalRound,
      decision: "pending",
    },
    metadata: { reason: "Resubmission after rejection" },
  });

  return { success: true, approvalId: approval.approval_id };
}
