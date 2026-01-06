import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import "server-only";
import { z } from "zod";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

// Simple HTML sanitization for Node.js (prevents XSS)
function sanitizeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char] || char);
}

// Zod DTO for creating comment
const CreateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment too long"),
});

// Helper: Extract @mentions from text
function extractMentions(text: string): string[] {
  const mentionRegex =
    /@([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
  const matches = text.match(mentionRegex);
  if (!matches) return [];

  return [...new Set(matches.map((m) => m.substring(1)))]; // Remove @ and dedupe
}

// POST /api/requests/[id]/comments - Create comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const supabase = await createServerAuthClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("ceo_users")
      .select("org_id, role_code")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Zod validation
    const validation = CreateCommentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { content } = validation.data;

    // Verify request exists and user has access (org-scoped)
    const { data: request } = await supabase
      .from("ceo_requests")
      .select("id, requester_id, org_id")
      .eq("id", requestId)
      .eq("org_id", profile.org_id)
      .single();

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check if user can comment (requester, watcher, or CEO/ADMIN)
    const isRequester = request.requester_id === user.id;
    const isCEOorAdmin = ["CEO", "ADMIN"].includes(profile.role_code);

    const { data: watcher } = await supabase
      .from("ceo_request_watchers")
      .select("watcher_id")
      .eq("request_id", requestId)
      .eq("watcher_id", user.id)
      .eq("org_id", profile.org_id)
      .single();

    const isWatcher = !!watcher;

    if (!isRequester && !isWatcher && !isCEOorAdmin) {
      return NextResponse.json(
        { error: "Only requester, watchers, or CEO/Admin can comment" },
        { status: 403 }
      );
    }

    // Sanitize content (prevent XSS)
    const sanitizedContent = sanitizeHtml(content);

    // Extract @mentions
    const mentionedUserIds = extractMentions(content);

    // Get CEO config for mention limits
    const { data: config } = await supabase
      .from("ceo_config")
      .select("max_mentions_per_comment")
      .eq("org_id", profile.org_id)
      .single();

    const maxMentions = config?.max_mentions_per_comment || 5;

    if (mentionedUserIds.length > maxMentions) {
      return NextResponse.json(
        { error: `Maximum ${maxMentions} mentions allowed per comment` },
        { status: 400 }
      );
    }

    // Verify mentioned users exist in org
    if (mentionedUserIds.length > 0) {
      const { data: mentionedUsers } = await supabase
        .from("ceo_users")
        .select("id")
        .in("id", mentionedUserIds)
        .eq("org_id", profile.org_id);

      if (
        !mentionedUsers ||
        mentionedUsers.length !== mentionedUserIds.length
      ) {
        return NextResponse.json(
          { error: "One or more mentioned users not found in organization" },
          { status: 400 }
        );
      }
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from("ceo_request_comments")
      .insert({
        request_id: requestId,
        org_id: profile.org_id,
        author_id: user.id,
        content: sanitizedContent,
        mentioned_user_ids:
          mentionedUserIds.length > 0 ? mentionedUserIds : null,
      })
      .select("*, author:ceo_users(email, full_name)")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("ceo_audit_logs").insert({
      org_id: profile.org_id,
      entity_type: "request",
      entity_id: requestId,
      action: "comment_added",
      user_id: user.id,
      new_values: {
        comment_id: comment.id,
        mentioned_users: mentionedUserIds.length,
      },
    });

    // Log notifications for mentioned users
    if (mentionedUserIds.length > 0) {
      const notificationRecords = [];
      for (const mentionedUserId of mentionedUserIds) {
        const { data: mentionedUser } = await supabase
          .from("ceo_users")
          .select("email")
          .eq("id", mentionedUserId)
          .eq("org_id", profile.org_id)
          .single();

        if (mentionedUser) {
          notificationRecords.push({
            org_id: profile.org_id,
            event_type: "user_mentioned",
            recipient_id: mentionedUserId,
            recipient_email: mentionedUser.email,
            related_entity_type: "comment",
            related_entity_id: comment.id,
            status: "sent",
            sent_at: new Date().toISOString(),
          });
        }
      }

      if (notificationRecords.length > 0) {
        await supabase.from("ceo_notification_log").insert(notificationRecords);
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
