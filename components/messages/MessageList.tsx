"use client";

import { useRouter } from "next/navigation";

import { CheckCircle2, Clock, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { ExecutiveMessage } from "@/lib/server/messages";

interface MessageListProps {
  messages: ExecutiveMessage[];
  userMap: Record<string, { email: string; full_name: string }>;
  filter: string;
}

export function MessageList({ messages, userMap, filter }: MessageListProps) {
  const router = useRouter();

  function getStatusIcon(status: string) {
    switch (status) {
      case "draft":
        return <Clock className="h-4 w-4" />;
      case "sent":
        return <Zap className="h-4 w-4" />;
      case "acknowledged":
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

  if (messages.length === 0) {
    return (
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
    );
  }

  return (
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
                  {new Date(msg.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
  );
}
