import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  ApprovalDecisionForm,
  BackToQueueButton,
} from "@/components/approvals/ApprovalDecisionForm";
import { getApprovalDetail } from "@/lib/server/approvals-data";

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getApprovalDetail(id);

  if (!result?.approval) {
    notFound();
  }

  const { approval } = result;

  // Handle Supabase array returns
  const request = Array.isArray(approval.ceo_requests)
    ? approval.ceo_requests[0]
    : approval.ceo_requests;
  const requester = request
    ? Array.isArray(request.ceo_users)
      ? request.ceo_users[0]
      : request.ceo_users
    : null;
  const category = request
    ? Array.isArray(request.ceo_categories)
      ? request.ceo_categories[0]
      : request.ceo_categories
    : null;

  const isPending = approval.decision === "pending";
  const isInvalidated = !approval.is_valid;

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getPriorityVariant(priority: string) {
    switch (priority) {
      case "P1":
        return "destructive";
      case "P2":
        return "secondary";
      default:
        return "outline";
    }
  }

  function getDecisionVariant(decision: string) {
    switch (decision) {
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <BackToQueueButton />
        <Badge variant={getDecisionVariant(approval.decision)}>
          {approval.decision.toUpperCase()}
        </Badge>
      </div>

      {/* Status Alerts */}
      {isInvalidated && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <p className="text-amber-700 dark:text-amber-300 font-medium">
              ⚠️ This approval has been invalidated due to version drift. The
              request may have been modified.
            </p>
          </CardContent>
        </Card>
      )}

      {approval.decision !== "pending" && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="py-4">
            <p className="text-blue-700 dark:text-blue-300 font-medium">
              ℹ️ This request has already been {approval.decision}
              {approval.decided_at
                ? ` on ${formatDate(approval.decided_at)}`
                : ""}
              .
            </p>
          </CardContent>
        </Card>
      )}

      {/* Request Details */}
      <Card>
        <CardHeader>
          <CardTitle>{request?.title || "Request"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Requester</p>
              <p className="font-medium">{requester?.full_name || "Unknown"}</p>
              <p className="text-sm text-muted-foreground">
                {requester?.email || ""}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{category?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <Badge
                variant={getPriorityVariant(request?.priority_code || "P3")}
              >
                {request?.priority_code || "P3"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="font-medium">{formatDate(request?.submitted_at)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Description</p>
            <p className="whitespace-pre-wrap bg-muted p-4 rounded-md">
              {request?.description || "No description provided."}
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>Approval Round: {approval.approval_round}</p>
            <p>Request Version: {approval.request_version}</p>
          </div>
        </CardContent>
      </Card>

      {/* Decision Form - Only show for pending, valid approvals */}
      {isPending && !isInvalidated && (
        <ApprovalDecisionForm
          approvalId={approval.id}
          initialNotes={approval.notes || ""}
        />
      )}
    </div>
  );
}
