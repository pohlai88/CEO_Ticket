/**
 * Request Status Constants & Lifecycle
 * IMMUTABLE: Locked in code per REQUEST_CONSTITUTION.md
 */

import type { RequestStatus, PriorityCode } from '@/lib/types/database';

// Status lifecycle transitions (what can transition to what)
export const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['IN_REVIEW', 'CANCELLED'],
  IN_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['CLOSED'],
  REJECTED: ['SUBMITTED'], // Can resubmit
  CANCELLED: [], // Terminal
  CLOSED: [], // Terminal
};

// Status display metadata
export const STATUS_METADATA: Record<RequestStatus, {
  label: string;
  color: string;
  description: string;
}> = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-muted text-muted-foreground',
    description: 'Request is being prepared'
  },
  SUBMITTED: {
    label: 'Submitted',
    color: 'bg-info-bg text-info-fg border-info-border',
    description: 'Awaiting CEO review'
  },
  IN_REVIEW: {
    label: 'In Review',
    color: 'bg-warning-bg text-warning-fg border-warning-border',
    description: 'CEO is reviewing'
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-success-bg text-success-fg border-success-border',
    description: 'CEO approved'
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-error-bg text-error-fg border-error-border',
    description: 'CEO rejected, can resubmit'
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-muted text-muted-foreground',
    description: 'Cancelled by requester'
  },
  CLOSED: {
    label: 'Closed',
    color: 'bg-muted text-muted-foreground',
    description: 'Completed and archived'
  }
};

// Priority metadata (codes locked, labels customizable via ceo_config)
export const DEFAULT_PRIORITY_METADATA: Record<PriorityCode, {
  label: string;
  color: string;
  description: string;
}> = {
  P1: {
    label: 'Blocker',
    color: '#FF0000',
    description: 'Critical blocker, requires immediate attention'
  },
  P2: {
    label: 'High',
    color: '#FF9900',
    description: 'High priority, needs prompt resolution'
  },
  P3: {
    label: 'Medium',
    color: '#FFCC00',
    description: 'Normal priority, standard timeline'
  },
  P4: {
    label: 'Low',
    color: '#0066FF',
    description: 'Low priority, can be deferred'
  },
  P5: {
    label: 'Trivial',
    color: '#CCCCCC',
    description: 'Minimal impact, lowest priority'
  }
};

// Validate status transition
export function canTransitionTo(
  currentStatus: RequestStatus,
  targetStatus: RequestStatus
): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

// Check if status is terminal
export function isTerminalStatus(status: RequestStatus): boolean {
  return STATUS_TRANSITIONS[status]?.length === 0;
}

// Material change detection (invalidates approval)
export function isMaterialChange(
  oldRequest: Partial<{ title: string; description: string | null; priority_code: string; category_id: string | null }>,
  newRequest: Partial<{ title: string; description: string | null | undefined; priority_code: string; category_id: string | null | undefined }>
): boolean {
  return (
    oldRequest.title !== newRequest.title ||
    oldRequest.description !== newRequest.description ||
    oldRequest.priority_code !== newRequest.priority_code ||
    oldRequest.category_id !== newRequest.category_id
  );
}
