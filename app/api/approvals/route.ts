import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

/**
 * GET /api/approvals
 * CEO approval queue - list all pending approvals
 *
 * Guards:
 * - Must be CEO or Admin role
 *
 * Returns:
 * - Pending approvals ordered by submission time
 * - Includes request context (title, requester, priority)
 * - Only valid approvals shown
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerAuthClient();

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

  // 3. Query parameters for filtering
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending"; // pending, approved, rejected, all

  // 4. Build query
  let query = supabase
    .from("ceo_request_approvals")
    .select(
      `
      approval_id,
      request_id,
      approval_round,
      decision,
      decision_notes,
      is_valid,
      submitted_at,
      decided_at,
      decided_by,
      ceo_requests!inner (
        request_id,
        title,
        priority,
        category,
        status_code,
        requested_by,
        ceo_users!ceo_requests_requested_by_fkey (
          user_id,
          full_name,
          email
        )
      )
    `
    )
    .eq("is_valid", true)
    .order("submitted_at", { ascending: true });

  // Filter by decision status
  if (status !== "all") {
    query = query.eq("decision", status);
  }

  const { data: approvals, error: queryError } = await query;

  if (queryError) {
    return NextResponse.json(
      { error: "Failed to fetch approvals" },
      { status: 500 }
    );
  }

  // 5. Return formatted results
  return NextResponse.json({
    approvals: approvals || [],
    total: approvals?.length || 0,
  });
}
