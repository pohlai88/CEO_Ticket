import "server-only";

import { redirect } from "next/navigation";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

export interface ConfigData {
  id: number;
  org_id: string;
  max_attachment_mb: number;
  auto_cancel_drafts_days: number;
  restore_window_days: number;
  audit_retention_days: number;
  default_priority_code: string;
  allow_manager_self_approve: boolean;
  require_approval_notes: boolean;
  max_mentions_per_comment: number;
  mention_scope_default: string;
}

export async function getAdminConfig(): Promise<ConfigData | null> {
  const supabase = await createServerAuthClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("ceo_users")
    .select("role_code, org_id")
    .eq("id", authUser.id)
    .single();

  if (!profile || !["CEO", "ADMIN"].includes(profile.role_code)) {
    redirect("/dashboard");
  }

  // Get org config
  const { data: config, error } = await supabase
    .from("ceo_org_config")
    .select("*")
    .eq("org_id", profile.org_id)
    .single();

  if (error) {
    console.error("Failed to fetch config:", error);
    return null;
  }

  return config as ConfigData;
}
