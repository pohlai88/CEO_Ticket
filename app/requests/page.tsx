import { Suspense } from "react";

import Link from "next/link";

import { RequestFilters } from "@/components/requests/RequestFilters";
import { RequestsTable } from "@/components/requests/RequestsTable";
import { getRequests } from "@/lib/server/requests";

type SearchParams = Promise<{
  status?: string;
  priority?: string;
  show_deleted?: string;
}>;

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requests = await getRequests({
    status: params.status,
    priority: params.priority,
    showDeleted: params.show_deleted === "true",
  });

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
            <Link
              href="/requests/new"
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            >
              New Request
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="border-b bg-card h-16" />}>
        <RequestFilters count={requests.length} />
      </Suspense>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <RequestsTable requests={requests} />
      </div>
    </div>
  );
}
