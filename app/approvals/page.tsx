"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Approval {
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
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");

  useEffect(() => {
    void loadApprovals();
  }, [filter]);

  async function loadApprovals() {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals?status=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch approvals");

      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error("Error loading approvals:", error);
    } finally {
      setLoading(false);
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "normal":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">CEO Approval Queue</h1>
        <p className="text-muted-foreground">
          Review and decide on pending requests
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Pending
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          onClick={() => setFilter("approved")}
        >
          Approved
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "outline"}
          onClick={() => setFilter("rejected")}
        >
          Rejected
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
      </div>

      {/* Approval List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading approvals...
        </div>
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No {filter !== "all" && filter} approvals found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card
              key={approval.approval_id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push(`/approvals/${approval.approval_id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">
                        {approval.ceo_requests.title}
                      </CardTitle>
                      {approval.approval_round > 1 && (
                        <Badge variant="outline">
                          Round {approval.approval_round}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      Submitted by {approval.ceo_requests.ceo_users.full_name} •{" "}
                      {formatDate(approval.submitted_at)}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={getPriorityColor(approval.ceo_requests.priority)}
                    >
                      {approval.ceo_requests.priority}
                    </Badge>
                    {approval.decision === "pending" ? (
                      <Badge variant="secondary">Pending Decision</Badge>
                    ) : approval.decision === "approved" ? (
                      <Badge variant="default" className="bg-green-600">
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Rejected</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
