import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "server-only";

import {
  canResubmit,
  createResubmissionApproval,
} from "@/lib/server/approvals";
import { writeAuditLog } from "@/lib/supabase/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

/**
 * POST /api/requests/[id]/resubmit
 * Resubmit a rejected request for CEO review
 *
 * Guards:
 * - Must be requester or manager
 * - Request must be REJECTED
 * - No pending approvals exist
 *
 * Flow:
 * - Validates resubmission eligibility
 * - Updates request status to IN_REVIEW
 * - Creates new approval round
 * - Audit logs resubmission
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerAuthClient();
  const { id: requestId } = await params;

  // 1. Authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("ceo_users")
    .select("org_id, role_code")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 403 }
    );
  }

  // 2. Fetch request with ownership check
  const { data: request, error: fetchError } = await supabase
    .from("ceo_requests")
    .select("id, org_id, title, status_code, requester_id, request_version")
    .eq("id", requestId)
    .eq("org_id", profile.org_id)
    .single();

  if (fetchError || !request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // 3. Authorization - Only requester can resubmit
  if (request.requester_id !== user.id) {
    return NextResponse.json(
      { error: "Only requester can resubmit" },
      { status: 403 }
    );
  }

  if (request.status_code !== "REJECTED") {
    return NextResponse.json(
      { error: "Only rejected requests can be resubmitted" },
      { status: 400 }
    );
  }

  // 4. Check if resubmission is allowed
  const resubmitCheck = await canResubmit({
    requestId,
    orgId: profile.org_id,
  });

  if (!resubmitCheck.allowed) {
    return NextResponse.json(
      { error: resubmitCheck.reason || "Cannot resubmit this request" },
      { status: 400 }
    );
  }

  // 5. Update request status to IN_REVIEW
  const statusChangedAt = new Date().toISOString();

  const { data: updatedRequest, error: updateError } = await supabase
    .from("ceo_requests")
    .update({
      status_code: "IN_REVIEW",
      status_changed_at: statusChangedAt,
      last_activity_at: statusChangedAt,
      updated_at: statusChangedAt,
    })
    .eq("id", requestId)
    .eq("org_id", profile.org_id)
    .select()
    .single();

  if (updateError || !updatedRequest) {
    return NextResponse.json(
      { error: "Failed to update request status" },
      { status: 500 }
    );
  }

  // 6. Create new approval round
  const approvalResult = await createResubmissionApproval({
    orgId: profile.org_id,
    requestId,
    requestVersion: updatedRequest.request_version,
    requestSnapshot: updatedRequest,
    submittedBy: user.id,
    approvalRound: resubmitCheck.nextRound || 1,
    actorRoleCode: profile.role_code as "MANAGER" | "CEO" | "ADMIN",
  });

  if (!approvalResult.success) {
    return NextResponse.json({ error: approvalResult.error }, { status: 500 });
  }

  // 7. Audit log resubmission
  await writeAuditLog({
    org_id: profile.org_id,
    entity_type: "request",
    entity_id: requestId,
    action: "resubmitted",
    user_id: user.id,
    actor_role_code: profile.role_code as "MANAGER" | "CEO" | "ADMIN",
    old_values: { status_code: "REJECTED" },
    new_values: { status_code: "IN_REVIEW" },
    metadata: { approval_round: resubmitCheck.nextRound || 1 },
  });

  // 8. Return success
  return NextResponse.json({
    success: true,
    request: updatedRequest,
    approval_round: resubmitCheck.nextRound,
  });
}
