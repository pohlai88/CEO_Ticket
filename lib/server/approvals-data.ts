import "server-only";

import { redirect } from "next/navigation";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

export type ApprovalWithRequest = {
  approval_id: string;
  request_id: string;
  approval_round: number;
  decision: string;
  is_valid: boolean;
  submitted_at: string;
  ceo_requests: {
    title: string;
    priority: string;
    category: string;
    ceo_users: {
      full_name: string;
      email: string;
    };
  };
};

export type ApprovalFilters = {
  status?: "pending" | "approved" | "rejected" | "all";
};

export async function getApprovals(
  filters: ApprovalFilters = {}
): Promise<ApprovalWithRequest[]> {
  const supabase = await createServerAuthClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const { data: user } = await supabase
    .from("ceo_users")
    .select("org_id, role_code")
    .eq("id", authUser.id)
    .single();

  if (!user) {
    redirect("/auth/login");
  }

  // Only CEO can view approvals
  if (user.role_code !== "CEO") {
    redirect("/dashboard");
  }

  let query = supabase
    .from("ceo_request_approvals")
    .select(
      `
      id,
      request_id,
      approval_round,
      decision,
      is_valid,
      created_at,
      ceo_requests!inner(
        title,
        priority_code,
        category_id,
        submitted_at,
        ceo_users!requester_id(full_name, email)
      )
    `
    )
    .eq("ceo_requests.org_id", user.org_id)
    .eq("is_valid", true)
    .order("created_at", { ascending: false });

  const status = filters.status || "pending";
  if (status !== "all") {
    query = query.eq("decision", status);
  }

  const { data: approvals, error } = await query;

  if (error) {
    console.error("Failed to fetch approvals:", error);
    return [];
  }

  return (approvals || []).map((a: any) => ({
    approval_id: a.id,
    request_id: a.request_id,
    approval_round: a.approval_round,
    decision: a.decision,
    is_valid: a.is_valid,
    submitted_at: a.ceo_requests?.submitted_at || a.created_at,
    ceo_requests: {
      title: a.ceo_requests?.title || "Unknown",
      priority: a.ceo_requests?.priority_code || "P3",
      category: a.ceo_requests?.category_id || "",
      ceo_users: {
        full_name: a.ceo_requests?.ceo_users?.full_name || "Unknown",
        email: a.ceo_requests?.ceo_users?.email || "",
      },
    },
  }));
}

export async function getApprovalDetail(approvalId: string) {
  const supabase = await createServerAuthClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const { data: user } = await supabase
    .from("ceo_users")
    .select("org_id, role_code")
    .eq("id", authUser.id)
    .single();

  if (!user || user.role_code !== "CEO") {
    redirect("/dashboard");
  }

  const { data: approval, error } = await supabase
    .from("ceo_request_approvals")
    .select(
      `
      id,
      request_id,
      request_version,
      approval_round,
      decision,
      notes,
      is_valid,
      decided_at,
      decided_by,
      created_at,
      ceo_requests(
        id,
        title,
        description,
        priority_code,
        status_code,
        request_version,
        submitted_at,
        ceo_users!requester_id(id, email, full_name),
        ceo_categories(id, name)
      )
    `
    )
    .eq("id", approvalId)
    .single();

  if (error) {
    console.error("Failed to fetch approval:", error);
    return null;
  }

  return { approval, currentUserId: authUser.id };
}
