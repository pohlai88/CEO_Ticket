"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { canTransitionTo } from "@/lib/constants/status";
import type { RequestStatus } from "@/lib/types/database";

export function RequestActions({
  requestId,
  statusCode,
}: {
  requestId: string;
  statusCode: string;
}) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);

  const handleStatusTransition = async (targetStatus: string) => {
    if (
      !canTransitionTo(
        statusCode as RequestStatus,
        targetStatus as RequestStatus
      )
    ) {
      alert(`Cannot transition from ${statusCode} to ${targetStatus}`);
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_status: targetStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (statusCode !== "DRAFT") {
    return null;
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => router.push(`/requests/${requestId}/edit`)}
        className="px-4 py-2 rounded-lg border bg-card text-foreground font-semibold hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
      >
        Edit
      </button>
      <button
        onClick={() => handleStatusTransition("SUBMITTED")}
        disabled={actionLoading}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 transition-colors"
      >
        {actionLoading ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
}

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/requests")}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      ← Back
    </button>
  );
}

export function ErrorBackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/requests")}
      className="mt-4 px-4 py-2 rounded-lg bg-error-fg text-error-bg font-semibold hover:opacity-90 transition-opacity"
    >
      Back to Requests
    </button>
  );
}
