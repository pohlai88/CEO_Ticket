import { writeAuditLog } from "@/lib/supabase/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import "server-only";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type RequestSnapshot = Record<string, Json>;

/**
 * INTERNAL HELPER — Create approval record when request moves to IN_REVIEW
 * Called from POST /api/requests when status transitions to IN_REVIEW
 *
 * @returns approval_id on success
 */
export async function createApprovalForRequest(params: {
  orgId: string;
  requestId: string;
  requestVersion: number;
  requestSnapshot: RequestSnapshot;
  submittedBy: string;
  approvalRound?: number;
  actorRoleCode?: "MANAGER" | "CEO" | "ADMIN";
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
  const approvalRound = params.approvalRound ?? 1;

  const { data: approval, error: insertError } = await supabase
    .from("ceo_request_approvals")
    .insert({
      org_id: params.orgId,
      request_id: params.requestId,
      request_version: params.requestVersion,
      request_snapshot: params.requestSnapshot,
      approval_round: approvalRound,
      decision: "pending",
      is_valid: true,
    })
    .select("id")
    .single();

  if (insertError || !approval) {
    return {
      success: false,
      error: insertError?.message || "Failed to create approval",
    };
  }

  // Audit log
  await writeAuditLog({
    org_id: params.orgId,
    entity_type: "approval",
    entity_id: approval.id,
    action: "created",
    user_id: user.id,
    actor_role_code: params.actorRoleCode,
    new_values: {
      request_id: params.requestId,
      request_version: params.requestVersion,
      approval_round: approvalRound,
      decision: "pending",
    },
    metadata: { submitted_by: params.submittedBy },
  });

  return { success: true, approvalId: approval.id };
}

/**
 * INTERNAL HELPER — Invalidate approval when request is materially edited
 * Called from PATCH /api/requests/[id] when material change detected
 *
 * Only invalidates if approval is still pending
 */
export async function invalidateApproval(params: {
  orgId: string;
  requestId: string;
  reason: string;
  actorRoleCode?: "MANAGER" | "CEO" | "ADMIN";
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
    .select("id, decision")
    .eq("request_id", params.requestId)
    .eq("org_id", params.orgId)
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
    .update({
      is_valid: false,
      invalidated_at: new Date().toISOString(),
      invalidated_reason: params.reason,
    })
    .eq("id", approval.id)
    .eq("org_id", params.orgId);

  if (updateError) {
    return { success: false };
  }

  // Audit log
  await writeAuditLog({
    org_id: params.orgId,
    entity_type: "approval",
    entity_id: approval.id,
    action: "invalidated",
    user_id: user.id,
    actor_role_code: params.actorRoleCode,
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
export async function canResubmit(params: {
  requestId: string;
  orgId: string;
}): Promise<{
  allowed: boolean;
  reason?: string;
  nextRound?: number;
}> {
  const supabase = await createServerAuthClient();

  // Get request status
  const { data: request } = await supabase
    .from("ceo_requests")
    .select("status_code")
    .eq("id", params.requestId)
    .eq("org_id", params.orgId)
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
    .select("id")
    .eq("request_id", params.requestId)
    .eq("org_id", params.orgId)
    .eq("decision", "pending")
    .limit(1);

  if (pendingApprovals && pendingApprovals.length > 0) {
    return { allowed: false, reason: "Pending approval exists" };
  }

  // Get highest approval round
  const { data: lastApproval } = await supabase
    .from("ceo_request_approvals")
    .select("approval_round")
    .eq("request_id", params.requestId)
    .eq("org_id", params.orgId)
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
  orgId: string;
  requestId: string;
  requestVersion: number;
  requestSnapshot: RequestSnapshot;
  submittedBy: string;
  approvalRound: number;
  actorRoleCode?: "MANAGER" | "CEO" | "ADMIN";
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
      org_id: params.orgId,
      request_id: params.requestId,
      request_version: params.requestVersion,
      request_snapshot: params.requestSnapshot,
      approval_round: params.approvalRound,
      decision: "pending",
      is_valid: true,
    })
    .select("id")
    .single();

  if (insertError || !approval) {
    return {
      success: false,
      error: insertError?.message || "Failed to create approval",
    };
  }

  // Audit log
  await writeAuditLog({
    org_id: params.orgId,
    entity_type: "approval",
    entity_id: approval.id,
    action: "resubmitted",
    user_id: user.id,
    actor_role_code: params.actorRoleCode,
    new_values: {
      request_id: params.requestId,
      request_version: params.requestVersion,
      approval_round: params.approvalRound,
      decision: "pending",
    },
    metadata: {
      reason: "Resubmission after rejection",
      submitted_by: params.submittedBy,
    },
  });

  return { success: true, approvalId: approval.id };
}
