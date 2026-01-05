'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_METADATA, DEFAULT_PRIORITY_METADATA } from '@/lib/constants/status';
import type { Request } from '@/lib/types/database';

type RequestWithRequester = Request & {
  ceo_users: { email: string } | null;
};

export default function RequestsPage() {
  const router = useRouter();
  
  const [requests, setRequests] = useState<RequestWithRequester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, priorityFilter, showDeleted]);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (showDeleted) params.set('show_deleted', 'true');

      const res = await fetch(`/api/requests?${params.toString()}`);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch requests');
      }

      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Requests</h1>
              <p className="text-sm text-muted-foreground mt-2">
                All requests submitted for CEO review
              </p>
            </div>
            <button
              onClick={() => router.push('/requests/new')}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            >
              New Request
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="status" className="text-sm font-medium text-foreground">
                Status:
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="priority" className="text-sm font-medium text-foreground">
                Priority:
              </label>
              <select
                id="priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All</option>
                <option value="P1">P1 - Blocker</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
                <option value="P5">P5 - Trivial</option>
              </select>
            </div>

            {/* Show Deleted Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-foreground">Show deleted</span>
            </label>

            {/* Count */}
            <div className="ml-auto text-sm text-muted-foreground">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border p-4 bg-error-bg border-error-border text-error-fg">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground mt-4">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <p className="text-lg font-medium text-foreground">No requests found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first request to get started'}
            </p>
            {statusFilter === 'all' && priorityFilter === 'all' && !showDeleted && (
              <button
                onClick={() => router.push('/requests/new')}
                className="mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              >
                Create Request
              </button>
            )}
          </div>
        ) : (
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
                  const statusMeta = STATUS_METADATA[request.status_code];
                  const priorityMeta = DEFAULT_PRIORITY_METADATA[request.priority_code];
                  
                  return (
                    <tr
                      key={request.id}
                      onClick={() => router.push(`/requests/${request.id}`)}
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                        request.deleted_at ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{request.title}</div>
                        {request.deleted_at && (
                          <span className="text-xs text-error-fg">Deleted</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: priorityMeta.color }}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {request.priority_code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {request.ceo_users?.email || 'Unknown'}
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
        )}
      </div>
    </div>
  );
}
