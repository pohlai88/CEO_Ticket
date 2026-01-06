"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AlertCircle, CheckCircle2, Clock, Plus, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";

interface ExecutiveMessage {
  id: string;
  message_type: "consultation" | "direction" | "clarification";
  context_type: "request" | "announcement" | "general";
  subject: string;
  body: string;
  status: "draft" | "sent" | "acknowledged" | "resolved";
  author_id: string;
  author_role: string;
  recipient_ids: string[];
  cc_user_ids: string[];
  is_read: boolean;
  is_acknowledged: boolean;
  current_user_is_author: boolean;
  created_at: string;
  sent_at: string | null;
}

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ExecutiveMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<
    "all" | "draft" | "sent" | "acknowledged" | "resolved"
  >("all");
  const [userMap, setUserMap] = useState<
    Record<string, { email: string; full_name: string }>
  >({});

  useEffect(() => {
    void loadMessages();
  }, [filter]);

  async function loadMessages() {
    try {
      setLoading(true);
      const url =
        filter === "all" ? "/api/messages" : `/api/messages?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load messages");

      const data = await res.json();
      setMessages(data.messages || []);

      // Load user names for display
      await loadUserNames(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function loadUserNames(msgs: ExecutiveMessage[]) {
    const userIds = new Set<string>();
    msgs.forEach((m) => {
      userIds.add(m.author_id);
      m.recipient_ids.forEach((id) => userIds.add(id));
      m.cc_user_ids.forEach((id) => userIds.add(id));
    });

    if (userIds.size === 0) return;

    const { data: users } = await supabase
      .from("ceo_users")
      .select("id, email, full_name")
      .in("id", Array.from(userIds));

    if (users) {
      const map: Record<string, { email: string; full_name: string }> = {};
      users.forEach((u) => {
        map[u.id] = { email: u.email, full_name: u.full_name || u.email };
      });
      setUserMap(map);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "draft":
        return <Clock className="h-4 w-4" />;
      case "sent":
        return <Zap className="h-4 w-4" />;
      case "acknowledged":
        return <CheckCircle2 className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "acknowledged":
        return "bg-green-100 text-green-800";
      case "resolved":
        return "bg-purple-100 text-purple-800";
      default:
        return "";
    }
  }

  function getMessageTypeLabel(type: string) {
    const labels: Record<string, string> = {
      consultation: "❓ Consultation",
      direction: "📋 Direction",
      clarification: "💬 Clarification",
    };
    return labels[type] || type;
  }

  function getContextLabel(type: string) {
    const labels: Record<string, string> = {
      request: "Request",
      announcement: "Announcement",
      general: "General",
    };
    return labels[type] || type;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-1">Executive communication inbox</p>
          </div>
          <Link href="/messages/send">
            <Button className="gap-2">
              <Plus className="h-5 w-5" />
              New Message
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(["all", "draft", "sent", "acknowledged", "resolved"] as const).map(
            (f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            )
          )}
        </div>

        {error && (
          <Card className="bg-red-50 border-red-200 p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </Card>
        )}

        {messages.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-gray-500">
              <p className="text-lg font-medium mb-2">No messages</p>
              <p className="text-sm">
                {filter === "draft"
                  ? "You have no draft messages"
                  : filter === "all"
                  ? "Your inbox is empty"
                  : `No ${filter} messages`}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <Card
                key={msg.id}
                className={`p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                  !msg.is_read && !msg.current_user_is_author
                    ? "border-l-4 border-l-blue-500"
                    : ""
                }`}
                onClick={() => router.push(`/messages/${msg.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {msg.subject}
                      </h3>
                      <Badge
                        className={`flex-shrink-0 capitalize ${getStatusColor(
                          msg.status
                        )}`}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(msg.status)}
                          {msg.status}
                        </span>
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {msg.body}
                    </p>

                    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                      <span>{getMessageTypeLabel(msg.message_type)}</span>
                      <span>•</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {getContextLabel(msg.context_type)}
                      </span>
                      <span>•</span>
                      <span>
                        from{" "}
                        <span className="font-medium text-gray-700">
                          {userMap[msg.author_id]?.full_name || "Unknown"}
                        </span>
                      </span>
                      {msg.recipient_ids.length > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            to{" "}
                            <span className="font-medium text-gray-700">
                              {msg.recipient_ids.length} recipient
                              {msg.recipient_ids.length !== 1 ? "s" : ""}
                            </span>
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(msg.created_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {msg.current_user_is_author && msg.status === "draft" && (
                    <div className="flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          router.push(`/messages/${msg.id}/edit`);
                        }}
                      >
                        Edit & Send
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
