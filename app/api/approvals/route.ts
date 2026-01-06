import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "server-only";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

const DECISIONS = ["pending", "approved", "rejected", "all"] as const;

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

  // 3. Query parameters for filtering
  const { searchParams } = new URL(req.url);
  const statusParam = (searchParams.get("status") || "pending").toLowerCase();
  const status = DECISIONS.includes(statusParam as (typeof DECISIONS)[number])
    ? (statusParam as (typeof DECISIONS)[number])
    : "pending";

  // 4. Build query
  let query = supabase
    .from("ceo_request_approvals")
    .select(
      `
      id,
      org_id,
      request_id,
      request_version,
      approval_round,
      decision,
      notes,
      is_valid,
      decided_at,
      approved_by,
      created_at,
      request:ceo_requests!inner (
        id,
        title,
        priority_code,
        status_code,
        requester:ceo_users!ceo_requests_requester_id_fkey (
          id,
          email,
          full_name
        )
      )
    `
    )
    .eq("org_id", orgId)
    .eq("is_valid", true)
    .order("created_at", { ascending: true });

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
