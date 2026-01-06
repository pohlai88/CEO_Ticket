import { Suspense } from "react";

import { ApprovalFilterTabs } from "@/components/approvals/ApprovalFilterTabs";
import { ApprovalsList } from "@/components/approvals/ApprovalsList";
import { getApprovals } from "@/lib/server/approvals-data";

type SearchParams = Promise<{
  status?: "pending" | "approved" | "rejected" | "all";
}>;

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filter = params.status || "pending";
  const approvals = await getApprovals({ status: filter });

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">CEO Approval Queue</h1>
        <p className="text-muted-foreground">
          Review and decide on pending requests
        </p>
      </div>

      {/* Filter Tabs */}
      <Suspense fallback={<div className="h-10 mb-6" />}>
        <ApprovalFilterTabs />
      </Suspense>

      {/* Approval List */}
      <ApprovalsList approvals={approvals} filter={filter} />
    </div>
  );
}
