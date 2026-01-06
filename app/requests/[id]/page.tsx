import { notFound } from "next/navigation";

import {
  BackButton,
  RequestActions,
} from "@/components/requests/RequestActions";
import {
  DEFAULT_PRIORITY_METADATA,
  STATUS_METADATA,
} from "@/lib/constants/status";
import { getRequest } from "@/lib/server/requests";
import type { PriorityCode, RequestStatus } from "@/lib/types/database";

type Params = Promise<{ id: string }>;

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RequestDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const result = await getRequest(id);

  if (!result || !result.request) {
    notFound();
  }

  const { request } = result;
  const statusMeta = STATUS_METADATA[request.status_code as RequestStatus];
  const priorityMeta =
    DEFAULT_PRIORITY_METADATA[request.priority_code as PriorityCode];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <BackButton />
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                {request.title}
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                    statusMeta?.color || ""
                  }`}
                >
                  {statusMeta?.label || request.status_code}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: priorityMeta?.color || "#888" }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {request.priority_code} - {priorityMeta?.label || "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <RequestActions
              requestId={request.id}
              statusCode={request.status_code}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Metadata */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Details
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Requester</dt>
              <dd className="text-foreground font-medium mt-1">
                {request.ceo_users?.email || "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Version</dt>
              <dd className="text-foreground font-medium mt-1">
                v{request.request_version}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground font-medium mt-1">
                {formatDate(request.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="text-foreground font-medium mt-1">
                {formatDate(request.updated_at)}
              </dd>
            </div>
            {request.submitted_at && (
              <div>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="text-foreground font-medium mt-1">
                  {formatDate(request.submitted_at)}
                </dd>
              </div>
            )}
            {request.approved_at && (
              <div>
                <dt className="text-muted-foreground">Approved</dt>
                <dd className="text-foreground font-medium mt-1">
                  {formatDate(request.approved_at)}
                </dd>
              </div>
            )}
            {request.ceo_categories && (
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="text-foreground font-medium mt-1">
                  {request.ceo_categories.name}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Description */}
        {request.description && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Description
            </h2>
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
              {request.description}
            </div>
          </div>
        )}

        {/* Deleted Notice */}
        {request.deleted_at && (
          <div className="rounded-lg border p-4 bg-error-bg border-error-border text-error-fg">
            <p className="font-semibold">This request has been deleted</p>
            <p className="text-sm mt-1">
              Deleted on {formatDate(request.deleted_at)}
              {request.deleted_reason && ` - ${request.deleted_reason}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
