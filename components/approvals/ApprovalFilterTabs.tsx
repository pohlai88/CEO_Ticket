"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

export function ApprovalFilterTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("status") || "pending";

  const setFilter = (newFilter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFilter === "pending") {
      params.delete("status");
    } else {
      params.set("status", newFilter);
    }
    router.push(`/approvals?${params.toString()}`);
  };

  return (
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
  );
}
