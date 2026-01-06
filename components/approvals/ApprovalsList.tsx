"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ApprovalWithRequest } from "@/lib/server/approvals-data";

function getPriorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case "p1":
    case "urgent":
      return "destructive";
    case "p2":
    case "high":
      return "default";
    case "p3":
    case "normal":
      return "secondary";
    case "p4":
    case "p5":
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

export function ApprovalsList({
  approvals,
  filter,
}: {
  approvals: ApprovalWithRequest[];
  filter: string;
}) {
  const router = useRouter();

  if (approvals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No {filter !== "all" && filter} approvals found
        </CardContent>
      </Card>
    );
  }

  return (
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
                  <Badge variant="default" className="bg-nx-success">
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
  );
}
