"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ApprovalDecisionForm({
  approvalId,
  initialNotes,
}: {
  approvalId: string;
  initialNotes?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState(initialNotes || "");

  async function handleDecision(decision: "approved" | "rejected") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          decision_notes: decisionNotes || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit decision");
      }

      router.push("/approvals");
      router.refresh();
    } catch (error) {
      console.error("Error submitting decision:", error);
      alert(
        error instanceof Error ? error.message : "Failed to submit decision"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make Decision</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="notes">Notes (optional, max 500 characters)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this decision..."
              value={decisionNotes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDecisionNotes(e.target.value.slice(0, 500))
              }
              disabled={submitting}
              rows={4}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {decisionNotes.length}/500 characters
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => handleDecision("rejected")}
          disabled={submitting}
          className="min-w-32"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
        <Button
          onClick={() => handleDecision("approved")}
          disabled={submitting}
          className="min-w-32 bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Approve
        </Button>
      </CardFooter>
    </Card>
  );
}

export function BackToQueueButton() {
  const router = useRouter();
  return (
    <Button variant="ghost" onClick={() => router.push("/approvals")}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to Queue
    </Button>
  );
}
