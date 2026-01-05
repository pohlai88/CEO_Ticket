import { z } from 'zod';

export type RequestStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CLOSED';
export type RequestPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type ApprovalDecision = 'pending' | 'approved' | 'rejected';

// Valid status transitions
const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['IN_REVIEW', 'CANCELLED'],
  IN_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['CLOSED'],
  REJECTED: ['SUBMITTED'],
  CANCELLED: [],
  CLOSED: [],
};

export function isValidStatusTransition(from: RequestStatus, to: RequestStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export const RequestStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'CLOSED']);
export const RequestPrioritySchema = z.enum(['P1', 'P2', 'P3', 'P4', 'P5']);
export const ApprovalDecisionSchema = z.enum(['pending', 'approved', 'rejected']);

export const priorityDisplayNames: Record<RequestPriority, string> = {
  P1: 'Blocker',
  P2: 'High',
  P3: 'Medium',
  P4: 'Low',
  P5: 'Trivial',
};

export const statusDisplayNames: Record<RequestStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CLOSED: 'Closed',
};

export const priorityColors: Record<RequestPriority, string> = {
  P1: '#FF0000', // Red - Blocker
  P2: '#FF9900', // Orange - High
  P3: '#FFCC00', // Yellow - Medium
  P4: '#0066FF', // Blue - Low
  P5: '#CCCCCC', // Gray - Trivial
};

export const statusColors: Record<RequestStatus, string> = {
  DRAFT: '#999999',    // Gray
  SUBMITTED: '#0066FF', // Blue
  IN_REVIEW: '#0066FF', // Blue
  APPROVED: '#00AA00',  // Green
  REJECTED: '#FF0000',  // Red
  CANCELLED: '#FF0000', // Red
  CLOSED: '#666666',    // Dark Gray
};
