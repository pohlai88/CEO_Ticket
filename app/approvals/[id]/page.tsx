'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface ApprovalDetail {
  approval_id: string;
  request_id: string;
  approval_round: number;
  decision: string;
  decision_notes?: string;
  is_valid: boolean;
  submitted_at: string;
  decided_at?: string;
  request_snapshot: {
    title: string;
    description?: string;
    priority: string;
    category: string;
  };
  ceo_requests: {
    request_id: string;
    title: string;
    status_code: string;
    ceo_users: {
      full_name: string;
      email: string;
    };
  };
}

export default function ApprovalDecisionPage() {
  const router = useRouter();
  const params = useParams();
  const approvalId = params.id as string;

  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');

  useEffect(() => {
    loadApproval();
  }, [approvalId]);

  async function loadApproval() {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals?status=all`);
      if (!res.ok) throw new Error('Failed to fetch approval');

      const data = await res.json();
      const found = data.approvals?.find((a: ApprovalDetail) => a.approval_id === approvalId);

      if (found) {
        setApproval(found);
        setDecisionNotes(found.decision_notes || '');
      }
    } catch (error) {
      console.error('Error loading approval:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(decision: 'approved' | 'rejected') {
    if (!approval) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          decision_notes: decisionNotes || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit decision');
      }

      // Success - redirect back to queue
      router.push('/approvals');
    } catch (error) {
      console.error('Error submitting decision:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getPriorityColor(priority: string) {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12 text-muted-foreground">
          Loading approval...
        </div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Approval not found</p>
            <Button className="mt-4" onClick={() => router.push('/approvals')}>
              Back to Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPending = approval.decision === 'pending' && approval.is_valid;
  const isDecided = approval.decision !== 'pending';
  const isInvalidated = !approval.is_valid;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/approvals')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Queue
        </Button>
      </div>

      {/* Status Alerts */}
      {isInvalidated && (
        <Card className="mb-6 border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">
                This approval has been invalidated due to material changes. Request must be resubmitted.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isDecided && (
        <Card className={`mb-6 ${approval.decision === 'approved' ? 'border-green-500' : 'border-red-500'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {approval.decision === 'approved' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <p className="font-medium">
                Decision made: {approval.decision.toUpperCase()}
                {approval.decided_at && ` on ${formatDate(approval.decided_at)}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Details */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle>{approval.request_snapshot.title}</CardTitle>
                {approval.approval_round > 1 && (
                  <Badge variant="outline">Round {approval.approval_round}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Submitted by {approval.ceo_requests.ceo_users.full_name} •{' '}
                {formatDate(approval.submitted_at)}
              </p>
            </div>
            <Badge variant={getPriorityColor(approval.request_snapshot.priority)}>
              {approval.request_snapshot.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <p className="mt-1">{approval.request_snapshot.category}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                {approval.request_snapshot.description || 'No description provided'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isPending ? 'Make Decision' : 'Decision Notes'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes (optional, max 500 characters)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this decision..."
                value={decisionNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDecisionNotes(e.target.value.slice(0, 500))}
                disabled={!isPending || submitting}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {decisionNotes.length}/500 characters
              </p>
            </div>
          </div>
        </CardContent>
        {isPending && (
          <CardFooter className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => handleDecision('rejected')}
              disabled={submitting}
              className="min-w-32"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={() => handleDecision('approved')}
              disabled={submitting}
              className="min-w-32 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
