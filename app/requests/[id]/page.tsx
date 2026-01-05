'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_METADATA, DEFAULT_PRIORITY_METADATA, canTransitionTo } from '@/lib/constants/status';
import type { Request, RequestComment, RequestAttachment, Approval } from '@/lib/types/database';

type RequestWithRelations = Request & {
  requester: { id: string; email: string } | null;
  category: { id: string; name: string } | null;
  approvals: Approval[];
  comments: (RequestComment & { author: { email: string } | null })[];
  attachments: RequestAttachment[];
};

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [request, setRequest] = useState<RequestWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/requests/${id}`);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch request');
      }

      const data = await res.json();
      setRequest(data.request);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusTransition = async (targetStatus: string) => {
    if (!request) return;

    if (!canTransitionTo(request.status_code, targetStatus as any)) {
      alert(`Cannot transition from ${request.status_code} to ${targetStatus}`);
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_status: targetStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }

      await fetchRequest();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground mt-4">Loading request...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-6">
          <div className="rounded-lg border p-6 bg-error-bg border-error-border text-error-fg text-center">
            <p className="font-semibold text-lg">Error</p>
            <p className="text-sm mt-2">{error || 'Request not found'}</p>
            <button
              onClick={() => router.push('/requests')}
              className="mt-4 px-4 py-2 rounded-lg bg-error-fg text-error-bg font-semibold hover:opacity-90 transition-opacity"
            >
              Back to Requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_METADATA[request.status_code];
  const priorityMeta = DEFAULT_PRIORITY_METADATA[request.priority_code];
  const latestApproval = request.approvals
    .filter(a => a.is_valid)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => router.push('/requests')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
              </div>
              <h1 className="text-3xl font-bold text-foreground">{request.title}</h1>
              <div className="flex items-center gap-3 mt-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusMeta.color}`}>
                  {statusMeta.label}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: priorityMeta.color }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {request.priority_code} - {priorityMeta.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {request.status_code === 'DRAFT' && (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/requests/${id}/edit`)}
                  className="px-4 py-2 rounded-lg border bg-card text-foreground font-semibold hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleStatusTransition('SUBMITTED')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Metadata */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Details</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Requester</dt>
              <dd className="text-foreground font-medium mt-1">
                {request.requester?.email || 'Unknown'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Version</dt>
              <dd className="text-foreground font-medium mt-1">v{request.request_version}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground font-medium mt-1">{formatDate(request.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="text-foreground font-medium mt-1">{formatDate(request.updated_at)}</dd>
            </div>
            {request.submitted_at && (
              <div>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="text-foreground font-medium mt-1">{formatDate(request.submitted_at)}</dd>
              </div>
            )}
            {request.approved_at && (
              <div>
                <dt className="text-muted-foreground">Approved</dt>
                <dd className="text-foreground font-medium mt-1">{formatDate(request.approved_at)}</dd>
              </div>
            )}
            {request.category && (
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="text-foreground font-medium mt-1">{request.category.name}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Description */}
        {request.description && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Description</h2>
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
              {request.description}
            </div>
          </div>
        )}

        {/* Approval Status */}
        {latestApproval && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Approval Status</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Decision: </span>
                <span className={`text-sm font-medium ${
                  latestApproval.decision === 'approved'
                    ? 'text-success-fg'
                    : latestApproval.decision === 'rejected'
                    ? 'text-error-fg'
                    : 'text-warning-fg'
                }`}>
                  {latestApproval.decision.toUpperCase()}
                </span>
              </div>
              {latestApproval.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes: </span>
                  <p className="text-sm text-foreground mt-1">{latestApproval.notes}</p>
                </div>
              )}
              {latestApproval.decided_at && (
                <div>
                  <span className="text-sm text-muted-foreground">Decided at: </span>
                  <span className="text-sm text-foreground">{formatDate(latestApproval.decided_at)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attachments */}
        {request.attachments.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Attachments ({request.attachments.length})
            </h2>
            <div className="space-y-2">
              {request.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                      FILE
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{attachment.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(attachment.file_size / 1024).toFixed(2)} KB • {formatDate(attachment.uploaded_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        {request.comments.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Comments ({request.comments.length})
            </h2>
            <div className="space-y-4">
              {request.comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-primary pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-foreground">
                      {comment.author?.email || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
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
