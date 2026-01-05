/**
 * Database Types (SSOT from Schema)
 * All tables use ceo_ prefix for shared instance isolation
 * Generated from Supabase schema
 */

// Role codes
export type RoleCode = 'MANAGER' | 'CEO' | 'ADMIN';

// Request status lifecycle
export type RequestStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'IN_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'CANCELLED' 
  | 'CLOSED';

// Priority codes (P1-P5)
export type PriorityCode = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

// Announcement types
export type AnnouncementType = 'info' | 'important' | 'urgent';

// Message types
export type MessageType = 'consultation' | 'direction' | 'clarification';

// Organization
export interface Organization {
  id: string;
  name: string;
  constitution_version: string | null;
  constitution_signed_by: string | null;
  constitution_signed_at: string | null;
  created_at: string;
  updated_at: string;
}

// User
export interface User {
  id: string;
  org_id: string;
  email: string;
  role_code: RoleCode;
  notification_preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Request
export interface Request {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  request_version: number;
  status_code: RequestStatus;
  priority_code: PriorityCode;
  category_id: string | null;
  requester_id: string;
  created_at: string;
  updated_at: string;
  status_changed_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  closed_at: string | null;
  last_activity_at: string | null;
  deleted_at: string | null;
  deleted_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
}

// Category
export interface Category {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  order_position: number | null;
  created_at: string;
  updated_at: string;
}

// Approval
export interface Approval {
  id: string;
  org_id: string;
  request_id: string;
  request_version: number;
  approval_round: number;
  decision: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  notes: string | null;
  request_snapshot: Record<string, unknown> | null;
  is_valid: boolean;
  invalidated_at: string | null;
  invalidated_by: string | null;
  invalidated_reason: 'material_edit' | 'resubmit' | 'manual_revocation' | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

// Request Comment
export interface RequestComment {
  id: string;
  org_id: string;
  request_id: string;
  author_id: string;
  content: string;
  mentioned_user_ids: string[] | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

// Request Attachment
export interface RequestAttachment {
  id: string;
  org_id: string;
  request_id: string;
  file_name: string;
  file_size: number;
  file_type: string | null;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
}
