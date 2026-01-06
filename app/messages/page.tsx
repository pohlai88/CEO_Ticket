import Link from "next/link";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { MessageList } from "@/components/messages/MessageList";
import { MessageStatusTabs } from "@/components/messages/MessageStatusTabs";
import { getMessages, type MessageStatus } from "@/lib/server/messages";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = (params.status || "all") as MessageStatus | "all";

  const { messages, userMap } = await getMessages({ status: statusFilter });

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
        <MessageStatusTabs />

        {/* Message List */}
        <MessageList
          messages={messages}
          userMap={userMap}
          filter={statusFilter}
        />
      </div>
    </div>
  );
}
