"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function RequestFilters({ count }: { count: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFilter = searchParams.get("status") || "all";
  const priorityFilter = searchParams.get("priority") || "all";
  const showDeleted = searchParams.get("show_deleted") === "true";

  const updateFilter = (key: string, value: string | boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "show_deleted") {
      if (value) {
        params.set(key, "true");
      } else {
        params.delete(key);
      }
    } else if (value === "all" || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    router.push(`/requests?${params.toString()}`);
  };

  return (
    <div className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="status"
              className="text-sm font-medium text-foreground"
            >
              Status:
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => updateFilter("status", e.target.value)}
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
            <label
              htmlFor="priority"
              className="text-sm font-medium text-foreground"
            >
              Priority:
            </label>
            <select
              id="priority"
              value={priorityFilter}
              onChange={(e) => updateFilter("priority", e.target.value)}
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
              onChange={(e) => updateFilter("show_deleted", e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-foreground">Show deleted</span>
          </label>

          {/* Count */}
          <div className="ml-auto text-sm text-muted-foreground">
            {count} {count === 1 ? "request" : "requests"}
          </div>
        </div>
      </div>
    </div>
  );
}
