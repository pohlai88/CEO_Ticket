"use client";

import { useRouter } from "next/navigation";

import {
  DEFAULT_PRIORITY_METADATA,
  STATUS_METADATA,
} from "@/lib/constants/status";
import type { RequestWithRequester } from "@/lib/server/requests";
import type { PriorityCode, RequestStatus } from "@/lib/types/database";

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RequestsTable({
  requests,
}: {
  requests: RequestWithRequester[];
}) {
  const router = useRouter();

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border">
        <p className="text-lg font-medium text-foreground">No requests found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your filters or create your first request
        </p>
        <button
          onClick={() => router.push("/requests/new")}
          className="mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        >
          Create Request
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted border-b">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
              Priority
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
              Requester
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {requests.map((request) => {
            const statusMeta =
              STATUS_METADATA[request.status_code as RequestStatus];
            const priorityMeta =
              DEFAULT_PRIORITY_METADATA[request.priority_code as PriorityCode];

            return (
              <tr
                key={request.id}
                onClick={() => router.push(`/requests/${request.id}`)}
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                  request.deleted_at ? "opacity-50" : ""
                }`}
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">
                    {request.title}
                  </div>
                  {request.deleted_at && (
                    <span className="text-xs text-error-fg">Deleted</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                      statusMeta?.color || ""
                    }`}
                  >
                    {statusMeta?.label || request.status_code}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: priorityMeta?.color || "#888" }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {request.priority_code}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {request.ceo_users?.email || "Unknown"}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {formatDate(request.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
