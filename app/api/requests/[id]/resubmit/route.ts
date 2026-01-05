import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { writeAuditLog } from "@/lib/supabase/server";
import {
  canResubmit,
  createResubmissionApproval,
} from "@/lib/server/approvals";

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

  // 2. Fetch request with ownership check
  const { data: request, error: fetchError } = await supabase
    .from("ceo_requests")
    .select("request_id, title, status_code, requested_by")
    .eq("request_id", requestId)
    .single();

  if (fetchError || !request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // 3. Authorization - Only requester can resubmit
  if (request.requested_by !== user.id) {
    return NextResponse.json(
      { error: "Only requester can resubmit" },
      { status: 403 }
    );
  }

  // 4. Check if resubmission is allowed
  const resubmitCheck = await canResubmit(requestId);

  if (!resubmitCheck.allowed) {
    return NextResponse.json(
      { error: resubmitCheck.reason || "Cannot resubmit this request" },
      { status: 400 }
    );
  }

  // 5. Update request status to IN_REVIEW
  const { data: updatedRequest, error: updateError } = await supabase
    .from("ceo_requests")
    .update({
      status_code: "IN_REVIEW",
      updated_at: new Date().toISOString(),
    })
    .eq("request_id", requestId)
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
    requestId,
    requestSnapshot: updatedRequest,
    submittedBy: user.id,
    approvalRound: resubmitCheck.nextRound || 1,
  });

  if (!approvalResult.success) {
    return NextResponse.json({ error: approvalResult.error }, { status: 500 });
  }

  // 7. Audit log resubmission
  await writeAuditLog({
    org_id: "", // TODO: Get from context
    entity_type: "request",
    entity_id: requestId,
    action: "resubmitted",
    user_id: user.id,
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
