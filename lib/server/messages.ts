import "server-only";

import { redirect } from "next/navigation";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

export type MessageStatus = "draft" | "sent" | "acknowledged" | "resolved";

export type ExecutiveMessage = {
  id: string;
  message_type: "consultation" | "direction" | "clarification";
  context_type: "request" | "announcement" | "general";
  subject: string;
  body: string;
  status: MessageStatus;
  author_id: string;
  recipient_ids: string[];
  cc_user_ids: string[];
  is_read: boolean;
  current_user_is_author: boolean;
  created_at: string;
  sent_at: string | null;
};

export type MessagesFilters = {
  status?: MessageStatus | "all";
};

export type OrgUser = {
  id: string;
  email: string;
  full_name: string;
};

/**
 * Get users and role info for send message page
 */
export async function getMessageSendData(): Promise<{
  users: OrgUser[];
  userRole: string;
}> {
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

  if (!profile) {
    redirect("/auth/login");
  }

  // Get all users in org except current user
  const { data: users } = await supabase
    .from("ceo_users")
    .select("id, email, full_name")
    .eq("org_id", profile.org_id)
    .eq("is_active", true)
    .neq("id", authUser.id);

  return {
    users: users || [],
    userRole: profile.role_code,
  };
}

export async function getMessages(filters: MessagesFilters = {}): Promise<{
  messages: ExecutiveMessage[];
  userMap: Record<string, { email: string; full_name: string }>;
}> {
  const supabase = await createServerAuthClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const { data: currentUser } = await supabase
    .from("ceo_users")
    .select("id, org_id, role_code")
    .eq("id", authUser.id)
    .single();

  if (!currentUser) {
    redirect("/auth/login");
  }

  let query = supabase
    .from("ceo_executive_messages")
    .select("*")
    .eq("org_id", currentUser.org_id)
    .order("created_at", { ascending: false });

  const status = filters.status || "all";
  if (status !== "all") {
    query = query.eq("status", status);
  }

  // User can see messages they authored or are recipients of
  query = query.or(
    `author_id.eq.${currentUser.id},recipient_ids.cs.{${currentUser.id}},cc_user_ids.cs.{${currentUser.id}}`
  );

  const { data: messages, error } = await query;

  if (error) {
    console.error("Failed to fetch messages:", error);
    return { messages: [], userMap: {} };
  }

  // Map messages with current user context
  const mappedMessages = (messages || []).map((m: any) => ({
    id: m.id,
    message_type: m.message_type,
    context_type: m.context_type,
    subject: m.subject,
    body: m.body,
    status: m.status,
    author_id: m.author_id,
    recipient_ids: m.recipient_ids || [],
    cc_user_ids: m.cc_user_ids || [],
    is_read: m.is_read || false,
    current_user_is_author: m.author_id === currentUser.id,
    created_at: m.created_at,
    sent_at: m.sent_at,
  }));

  // Load user names for display
  const userIds = new Set<string>();
  mappedMessages.forEach((m) => {
    userIds.add(m.author_id);
    m.recipient_ids.forEach((id: string) => userIds.add(id));
    m.cc_user_ids.forEach((id: string) => userIds.add(id));
  });

  const userMap: Record<string, { email: string; full_name: string }> = {};

  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from("ceo_users")
      .select("id, email, full_name")
      .in("id", Array.from(userIds));

    if (users) {
      users.forEach((u) => {
        userMap[u.id] = { email: u.email, full_name: u.full_name || u.email };
      });
    }
  }

  return { messages: mappedMessages, userMap };
}
