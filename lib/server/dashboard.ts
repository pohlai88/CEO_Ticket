import "server-only";

import { redirect } from "next/navigation";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

export type DashboardData = {
  user: {
    id: string;
    email: string;
  };
  org: {
    id: string;
    name: string;
  } | null;
  userRole: string;
  unreadAnnouncementCount: number;
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createServerAuthClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const { data: userProfile } = await supabase
    .from("ceo_users")
    .select("org_id, role_code")
    .eq("id", authUser.id)
    .single();

  if (!userProfile) {
    // User needs onboarding
    redirect("/onboarding");
  }

  const { data: org } = await supabase
    .from("ceo_organizations")
    .select("id, name")
    .eq("id", userProfile.org_id)
    .single();

  // Get unread announcement count
  let unreadCount = 0;
  if (userProfile.role_code !== "CEO") {
    const { data: announcements } = await supabase
      .from("ceo_announcements")
      .select("id")
      .eq("org_id", userProfile.org_id)
      .is("deleted_at", null);

    if (announcements) {
      const { data: reads } = await supabase
        .from("ceo_announcement_reads")
        .select("announcement_id")
        .eq("user_id", authUser.id);

      const readIds = new Set(reads?.map((r) => r.announcement_id) || []);
      unreadCount = announcements.filter((a) => !readIds.has(a.id)).length;
    }
  }

  return {
    user: {
      id: authUser.id,
      email: authUser.email || "",
    },
    org: org || null,
    userRole: userProfile.role_code,
    unreadAnnouncementCount: unreadCount,
  };
}
