import "server-only";

import { redirect } from "next/navigation";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

export type RequestWithRequester = {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  status_code: string;
  priority_code: string;
  category_id: string | null;
  requester_id: string;
  request_version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  ceo_users: { email: string } | null;
};

export type RequestFilters = {
  status?: string;
  priority?: string;
  showDeleted?: boolean;
};

export async function getRequests(
  filters: RequestFilters = {}
): Promise<RequestWithRequester[]> {
  const supabase = await createServerAuthClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const { data: user } = await supabase
    .from("ceo_users")
    .select("org_id")
    .eq("id", authUser.id)
    .single();

  if (!user) {
    redirect("/auth/login");
  }

  let query = supabase
    .from("ceo_requests")
    .select(
      "id, org_id, title, description, status_code, priority_code, category_id, requester_id, request_version, created_at, updated_at, deleted_at, ceo_users!requester_id(email)"
    )
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status_code", filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority_code", filters.priority);
  }
  if (!filters.showDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data: requests, error } = await query;

  if (error) {
    console.error("Failed to fetch requests:", error);
    return [];
  }

  // Map Supabase response to expected type (ceo_users comes as array from join)
  return (requests || []).map((r: any) => ({
    ...r,
    ceo_users: Array.isArray(r.ceo_users)
      ? r.ceo_users[0] || null
      : r.ceo_users,
  })) as RequestWithRequester[];
}

export async function getRequest(id: string) {
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

  const { data: request, error } = await supabase
    .from("ceo_requests")
    .select(
      `
      id, org_id, title, description, status_code, priority_code, 
      category_id, requester_id, request_version, created_at, updated_at, 
      submitted_at, approved_at, closed_at, deleted_at, deleted_reason,
      last_activity_at, created_by, updated_by,
      ceo_users!requester_id(id, email, full_name),
      ceo_categories(id, name)
    `
    )
    .eq("id", id)
    .eq("org_id", user.org_id)
    .single();

  if (error) {
    console.error("Failed to fetch request:", error);
    return null;
  }

  // Normalize joined arrays to single objects
  const normalizedRequest = {
    ...request,
    ceo_users: Array.isArray((request as any).ceo_users)
      ? (request as any).ceo_users[0] || null
      : (request as any).ceo_users,
    ceo_categories: Array.isArray((request as any).ceo_categories)
      ? (request as any).ceo_categories[0] || null
      : (request as any).ceo_categories,
  };

  return {
    request: normalizedRequest,
    currentUser: { id: authUser.id, role_code: user.role_code },
  };
}
