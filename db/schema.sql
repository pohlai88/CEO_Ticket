-- ============================================================================
-- CEO REQUEST TICKETING SYSTEM - COMPLETE SCHEMA
-- ============================================================================
-- Multi-tenant, RLS-enforced, audit-complete
-- All tables prefixed with 'ceo_' for shared instance isolation
-- Last Updated: 2026-01-05
-- ============================================================================

-- CEO_ORGANIZATIONS (multi-tenant root)
CREATE TABLE IF NOT EXISTS ceo_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  constitution_version TEXT,
  constitution_signed_by UUID REFERENCES auth.users(id),
  constitution_signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CEO_USERS (roles: MANAGER, CEO, ADMIN)
CREATE TABLE IF NOT EXISTS ceo_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role_code TEXT NOT NULL CHECK (role_code IN ('MANAGER', 'CEO', 'ADMIN')),
  notification_preferences JSONB DEFAULT '{"email_frequency": "instant", "in_app_realtime": true}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES ceo_users(id),
  updated_by UUID REFERENCES ceo_users(id),
  UNIQUE(org_id, email)
);

-- CEO_CONFIG (SINGLE TABLE - PRIMARY DECISION ENGINE)
CREATE TABLE IF NOT EXISTS ceo_config (
  id INT PRIMARY KEY DEFAULT 1,
  org_id UUID NOT NULL UNIQUE REFERENCES ceo_organizations(id) ON DELETE CASCADE,

  -- Storage
  max_attachment_mb INT DEFAULT 10,

  -- Draft lifecycle
  auto_cancel_drafts_days INT DEFAULT 30,
  restore_window_days INT DEFAULT 7,
  audit_retention_days INT DEFAULT 365,

  -- Defaults
  default_priority_code TEXT DEFAULT 'P3',
  default_category_id UUID,

  -- Priority labels (customizable)
  priority_labels JSONB DEFAULT '{
    "P1": {"label": "Blocker", "color": "#FF0000"},
    "P2": {"label": "High", "color": "#FF9900"},
    "P3": {"label": "Medium", "color": "#FFCC00"},
    "P4": {"label": "Low", "color": "#0066FF"},
    "P5": {"label": "Trivial", "color": "#CCCCCC"}
  }',

  -- Mentions (constrained by default)
  mention_scope TEXT[] DEFAULT ARRAY['requester','watchers','approver'],
  mention_max_per_comment INT DEFAULT 5,

  -- Notifications
  notification_defaults JSONB DEFAULT '{
    "email_frequency": "instant",
    "in_app_realtime": true,
    "mention_always_instant": true
  }',

  -- Announcements
  announcement_defaults JSONB DEFAULT '{
    "default_type": "info",
    "require_ack_on_urgent": true,
    "announcement_retention_days": 90
  }',

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES ceo_users(id)
);

-- CEO_CATEGORIES
CREATE TABLE IF NOT EXISTS ceo_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  order_position INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES ceo_users(id),
  UNIQUE(org_id, name)
);

-- CEO_REQUESTS (requests & approvals)
CREATE TABLE IF NOT EXISTS ceo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  request_version INT DEFAULT 1,

  status_code TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status_code IN ('DRAFT','SUBMITTED','IN_REVIEW','APPROVED','REJECTED','CANCELLED','CLOSED')),
  priority_code TEXT NOT NULL DEFAULT 'P3' CHECK (priority_code IN ('P1','P2','P3','P4','P5')),
  category_id UUID REFERENCES ceo_categories(id),
  requester_id UUID NOT NULL REFERENCES ceo_users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status_changed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE,

  -- Soft-delete (orthogonal to status)
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_reason TEXT,

  created_by UUID REFERENCES ceo_users(id),
  updated_by UUID REFERENCES ceo_users(id),

  UNIQUE(org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ceo_requests_org_status ON ceo_requests(org_id, status_code);
CREATE INDEX IF NOT EXISTS idx_ceo_requests_org_requester ON ceo_requests(org_id, requester_id);
CREATE INDEX IF NOT EXISTS idx_ceo_requests_org_deleted ON ceo_requests(org_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_ceo_requests_org_created ON ceo_requests(org_id, created_at);

-- CEO_REQUEST_APPROVALS (with snapshot)
CREATE TABLE IF NOT EXISTS ceo_request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES ceo_requests(id) ON DELETE CASCADE,
  request_version INT NOT NULL,
  approval_round INT DEFAULT 0,
  decision TEXT DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected')),
  approved_by UUID REFERENCES ceo_users(id),
  notes TEXT,

  request_snapshot JSONB,

  is_valid BOOLEAN DEFAULT true,
  invalidated_at TIMESTAMP WITH TIME ZONE,
  invalidated_by UUID REFERENCES ceo_users(id),
  invalidated_reason TEXT,

  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(request_id, approval_round)
);

CREATE INDEX IF NOT EXISTS idx_ceo_request_approvals_org_decision ON ceo_request_approvals(org_id, decision);

-- CEO_REQUEST_WATCHERS (manual, no auto-defaults)
CREATE TABLE IF NOT EXISTS ceo_request_watchers (
  request_id UUID NOT NULL REFERENCES ceo_requests(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  watcher_id UUID NOT NULL REFERENCES ceo_users(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL CHECK (role_code IN ('OBSERVER','CONTRIBUTOR','ESCALATION_CONTACT')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  added_by UUID REFERENCES ceo_users(id),

  PRIMARY KEY (request_id, watcher_id)
);

-- CEO_REQUEST_COMMENTS (with @mention support)
CREATE TABLE IF NOT EXISTS ceo_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES ceo_requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES ceo_users(id),
  content TEXT NOT NULL,
  mentioned_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  idempotency_key UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(org_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ceo_request_comments_request ON ceo_request_comments(request_id);

-- CEO_REQUEST_ATTACHMENTS (Supabase Storage only)
CREATE TABLE IF NOT EXISTS ceo_request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES ceo_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INT CHECK (file_size <= 10485760),
  file_type TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES ceo_users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CEO_ANNOUNCEMENTS (CEO broadcasts)
CREATE TABLE IF NOT EXISTS ceo_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT DEFAULT 'info' CHECK (announcement_type IN ('info','important','urgent')),

  target_scope TEXT DEFAULT 'all' CHECK (target_scope IN ('all','team','individuals')),
  target_user_ids UUID[] DEFAULT ARRAY[]::UUID[],

  require_acknowledgement BOOLEAN DEFAULT false,
  sticky_until TIMESTAMP WITH TIME ZONE,

  published_by UUID NOT NULL REFERENCES ceo_users(id),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES ceo_users(id),

  UNIQUE(org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ceo_announcements_org_date ON ceo_announcements(org_id, published_at DESC);

-- CEO_ANNOUNCEMENT_READS (read & ack tracking)
CREATE TABLE IF NOT EXISTS ceo_announcement_reads (
  announcement_id UUID NOT NULL REFERENCES ceo_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES ceo_users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,

  PRIMARY KEY (announcement_id, user_id)
);

-- CEO_EXECUTIVE_MESSAGES (2-way communication, not chat)
CREATE TABLE IF NOT EXISTS ceo_executive_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,

  message_type TEXT NOT NULL CHECK (message_type IN ('consultation','direction','clarification')),
  context_type TEXT NOT NULL CHECK (context_type IN ('request','announcement','general')),
  context_id UUID,

  author_id UUID NOT NULL REFERENCES ceo_users(id),
  author_role TEXT NOT NULL CHECK (author_role IN ('MANAGER','CEO','ADMIN')),
  recipient_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  cc_user_ids UUID[] DEFAULT ARRAY[]::UUID[],

  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  parent_message_id UUID REFERENCES ceo_executive_messages(id),

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','acknowledged','resolved')),
  sent_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES ceo_users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES ceo_users(id),

  UNIQUE(org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ceo_executive_messages_org_date ON ceo_executive_messages(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ceo_executive_messages_status ON ceo_executive_messages(org_id, status);
CREATE INDEX IF NOT EXISTS idx_ceo_executive_messages_author ON ceo_executive_messages(author_id);

-- CEO_EXECUTIVE_MESSAGE_READS (read tracking)
CREATE TABLE IF NOT EXISTS ceo_executive_message_reads (
  message_id UUID NOT NULL REFERENCES ceo_executive_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES ceo_users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,

  PRIMARY KEY (message_id, user_id)
);

-- CEO_AUDIT_LOGS (immutable, everything logged)
CREATE TABLE IF NOT EXISTS ceo_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,
  correlation_id UUID,

  entity_type TEXT NOT NULL CHECK (entity_type IN ('request','approval','comment','watcher','attachment','announcement','message','ceo_config','organization','user_invite')),
  entity_id UUID,

  action TEXT NOT NULL CHECK (action IN ('created','updated','deleted','soft_deleted','restored','status_transitioned','approved','rejected','invalidated','comment_added','watcher_added','announcement_published','message_sent','message_acknowledged','config_changed','invited')),

  user_id UUID REFERENCES ceo_users(id),
  actor_role_code TEXT CHECK (actor_role_code IN ('MANAGER','CEO','ADMIN')),

  old_values JSONB,
  new_values JSONB,
  metadata JSONB,

  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ceo_audit_entity ON ceo_audit_logs(org_id, entity_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ceo_audit_time ON ceo_audit_logs(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ceo_audit_action ON ceo_audit_logs(org_id, action);

-- CEO_NOTIFICATION_LOG (outbound tracking)
CREATE TABLE IF NOT EXISTS ceo_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES ceo_organizations(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN ('request_created','approval_decision','status_change','mention','watcher_added','announcement_published','message_sent')),

  recipient_id UUID NOT NULL REFERENCES ceo_users(id),
  recipient_email TEXT NOT NULL,

  related_entity_type TEXT CHECK (related_entity_type IN ('request','announcement','message')),
  related_entity_id UUID,

  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','failed','bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(org_id, event_type, recipient_id, related_entity_id)
);

-- CEO_REF_REASON_CODES (optional reference table)
CREATE TABLE IF NOT EXISTS ceo_ref_reason_codes (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  applies_to TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE ceo_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_request_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_request_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_executive_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_executive_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_ref_reason_codes ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION auth.current_org_id() RETURNS UUID AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'org_id')::UUID,
    (SELECT org_id FROM ceo_users WHERE id = auth.uid() LIMIT 1)
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.current_role_code() RETURNS TEXT AS $$
  SELECT role_code FROM ceo_users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_ceo_or_admin() RETURNS BOOLEAN AS $$
  SELECT auth.current_role_code() IN ('CEO', 'ADMIN');
$$ LANGUAGE SQL STABLE;

-- CEO_USERS: can view own profile and org users
CREATE POLICY "Users can view self" ON ceo_users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view org members" ON ceo_users
  FOR SELECT USING (org_id = auth.current_org_id());

CREATE POLICY "Admins can update users" ON ceo_users
  FOR UPDATE USING (auth.is_ceo_or_admin() AND org_id = auth.current_org_id());

-- CEO_REQUESTS: can view if requester, watcher, or CEO
CREATE POLICY "View own or watched requests" ON ceo_requests
  FOR SELECT USING (
    org_id = auth.current_org_id() AND (
      requester_id = auth.uid() OR
      auth.is_ceo_or_admin() OR
      EXISTS (SELECT 1 FROM ceo_request_watchers WHERE request_id = id AND watcher_id = auth.uid())
    )
  );

CREATE POLICY "Create own requests" ON ceo_requests
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND
    requester_id = auth.uid()
  );

CREATE POLICY "Update own or admin" ON ceo_requests
  FOR UPDATE USING (
    org_id = auth.current_org_id() AND (
      requester_id = auth.uid() OR
      auth.is_ceo_or_admin()
    )
  );

-- CEO_CONFIG: only CEO can access
CREATE POLICY "Only CEO/admin can access config" ON ceo_config
  FOR ALL USING (
    org_id = auth.current_org_id() AND
    auth.is_ceo_or_admin()
  );

-- CEO_REQUEST_APPROVALS: requester, CEO, or watchers
CREATE POLICY "View approvals" ON ceo_request_approvals
  FOR SELECT USING (
    org_id = auth.current_org_id() AND (
      auth.is_ceo_or_admin() OR
      EXISTS (SELECT 1 FROM ceo_requests WHERE id = request_id AND requester_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM ceo_request_watchers rw JOIN ceo_requests r ON r.id = rw.request_id WHERE r.id = request_id AND rw.watcher_id = auth.uid())
    )
  );

CREATE POLICY "CEO can approve" ON ceo_request_approvals
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND
    auth.is_ceo_or_admin()
  );

-- CEO_ANNOUNCEMENTS: all org members can read, CEO can write
CREATE POLICY "View announcements" ON ceo_announcements
  FOR SELECT USING (org_id = auth.current_org_id());

CREATE POLICY "CEO can publish" ON ceo_announcements
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND
    auth.is_ceo_or_admin()
  );

CREATE POLICY "CEO can update announcements" ON ceo_announcements
  FOR UPDATE USING (
    org_id = auth.current_org_id() AND
    auth.is_ceo_or_admin()
  );

-- CEO_ANNOUNCEMENT_READS: users can read/update own records
CREATE POLICY "View own announcement reads" ON ceo_announcement_reads
  FOR SELECT USING (
    org_id = auth.current_org_id() AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can mark announcements read/ack" ON ceo_announcement_reads
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can update own reads" ON ceo_announcement_reads
  FOR UPDATE USING (
    org_id = auth.current_org_id() AND
    user_id = auth.uid()
  );

-- CEO_AUDIT_LOGS: all org members can read (filtered by entity access)
CREATE POLICY "View audit logs" ON ceo_audit_logs
  FOR SELECT USING (org_id = auth.current_org_id());

-- CRITICAL: Only service role can insert audit logs (not users)
-- This is enforced at application layer via service key
-- No INSERT policy = only service role can write

-- Prevent audit log modification
CREATE POLICY "No modifications to audit logs" ON ceo_audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "No deletions of audit logs" ON ceo_audit_logs
  FOR DELETE USING (false);

-- CEO_CATEGORIES: all org members can read, CEO can manage
CREATE POLICY "View org categories" ON ceo_categories
  FOR SELECT USING (org_id = auth.current_org_id());

CREATE POLICY "CEO can manage categories" ON ceo_categories
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND
    auth.is_ceo_or_admin()
  );

CREATE POLICY "CEO can update categories" ON ceo_categories
  FOR UPDATE USING (
    org_id = auth.current_org_id() AND
    auth.is_ceo_or_admin()
  );

-- CEO_REQUEST_COMMENTS: requester, CEO, watchers can view and comment
CREATE POLICY "View request comments" ON ceo_request_comments
  FOR SELECT USING (
    org_id = auth.current_org_id() AND EXISTS (
      SELECT 1 FROM ceo_requests r 
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        auth.is_ceo_or_admin() OR
        EXISTS (SELECT 1 FROM ceo_request_watchers rw WHERE rw.request_id = r.id AND rw.watcher_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can add comments to visible requests" ON ceo_request_comments
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM ceo_requests r 
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        auth.is_ceo_or_admin() OR
        EXISTS (SELECT 1 FROM ceo_request_watchers rw WHERE rw.request_id = r.id AND rw.watcher_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update own comments" ON ceo_request_comments
  FOR UPDATE USING (
    org_id = auth.current_org_id() AND
    author_id = auth.uid()
  );

-- CEO_REQUEST_WATCHERS: requester and CEO can manage, all can view
CREATE POLICY "View request watchers" ON ceo_request_watchers
  FOR SELECT USING (
    org_id = auth.current_org_id() AND EXISTS (
      SELECT 1 FROM ceo_requests r 
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        auth.is_ceo_or_admin()
      )
    )
  );

CREATE POLICY "Requester and CEO can add watchers" ON ceo_request_watchers
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND EXISTS (
      SELECT 1 FROM ceo_requests r 
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        auth.is_ceo_or_admin()
      )
    )
  );

CREATE POLICY "Requester and CEO can remove watchers" ON ceo_request_watchers
  FOR DELETE USING (
    org_id = auth.current_org_id() AND EXISTS (
      SELECT 1 FROM ceo_requests r 
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        auth.is_ceo_or_admin()
      )
    )
  );

-- CEO_REQUEST_ATTACHMENTS: requester, CEO, watchers can view; requester can upload
CREATE POLICY "View request attachments" ON ceo_request_attachments
  FOR SELECT USING (
    org_id = auth.current_org_id() AND EXISTS (
      SELECT 1 FROM ceo_requests r 
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        auth.is_ceo_or_admin() OR
        EXISTS (SELECT 1 FROM ceo_request_watchers rw WHERE rw.request_id = r.id AND rw.watcher_id = auth.uid())
      )
    )
  );

CREATE POLICY "Requester can upload attachments" ON ceo_request_attachments
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM ceo_requests r 
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    )
  );

CREATE POLICY "Requester and CEO can delete attachments" ON ceo_request_attachments
  FOR DELETE USING (
    org_id = auth.current_org_id() AND EXISTS (
      SELECT 1 FROM ceo_requests r 
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        auth.is_ceo_or_admin()
      )
    )
  );

-- CEO_EXECUTIVE_MESSAGES: recipients, CC'd, and author can view; author can send
CREATE POLICY "View messages where you're author, recipient, or CC'd" ON ceo_executive_messages
  FOR SELECT USING (
    org_id = auth.current_org_id() AND (
      author_id = auth.uid() OR
      recipient_ids @> ARRAY[auth.uid()::TEXT] OR
      cc_user_ids @> ARRAY[auth.uid()::TEXT]
    )
  );

CREATE POLICY "Users can create draft messages" ON ceo_executive_messages
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND
    author_id = auth.uid()
  );

CREATE POLICY "Author can update own draft messages" ON ceo_executive_messages
  FOR UPDATE USING (
    org_id = auth.current_org_id() AND
    author_id = auth.uid() AND
    status = 'draft'
  );

-- CEO_EXECUTIVE_MESSAGE_READS: users can manage own read status
CREATE POLICY "View own message reads" ON ceo_executive_message_reads
  FOR SELECT USING (
    org_id = auth.current_org_id() AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can mark messages read/ack" ON ceo_executive_message_reads
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can update own read status" ON ceo_executive_message_reads
  FOR UPDATE USING (
    org_id = auth.current_org_id() AND
    user_id = auth.uid()
  );

-- CEO_NOTIFICATION_LOG: users can read own notifications; service role can insert
CREATE POLICY "View own notifications" ON ceo_notification_log
  FOR SELECT USING (
    org_id = auth.current_org_id() AND
    recipient_id = auth.uid()
  );

-- CRITICAL: Only service role can insert notification logs (not users)
-- No INSERT policy = only service role can write

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- No seed data required. Organizations/ceo_config created on first signup.
