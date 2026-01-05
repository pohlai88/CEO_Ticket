import 'server-only';

import { supabaseAdmin, writeAuditLog } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Bootstrap on first login: create org + seed ceo_config
 * This is server-side only (uses service role)
 * Called from dashboard/layout.tsx during auth check
 */
export async function bootstrapOrgIfNeeded(userId: string): Promise<{ org_id: string; created: boolean }> {
  try {
    // Check if user already has an org
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('ceo_users')
      .select('org_id')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 = not found (expected on first login)
      throw userError;
    }

    // User already has an org
    if (userRecord?.org_id) {
      return { org_id: userRecord.org_id, created: false };
    }

    // Create org
    const orgId = uuidv4();
    const { error: orgError } = await supabaseAdmin.from('ceo_organizations').insert({
      id: orgId,
      name: 'My Organization', // Placeholder, user customizes in onboarding
    });

    if (orgError) {
      throw orgError;
    }

    // Create user record in ceo_users table
    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const authUser = authUserData.user;
    const { error: userInsertError } = await supabaseAdmin.from('ceo_users').insert({
      id: userId,
      org_id: orgId,
      email: authUser?.email || 'unknown@example.com',
      full_name: (authUser?.user_metadata?.full_name as string | undefined) || '',
      role_code: 'CEO', // First user is always CEO
      is_active: true,
    });

    if (userInsertError) {
      throw userInsertError;
    }

    // Seed ceo_config with defaults
    const { error: configError } = await supabaseAdmin.from('ceo_config').insert({
      org_id: orgId,
      max_attachment_mb: 10,
      auto_cancel_drafts_days: 30,
      restore_window_days: 7,
      audit_retention_days: 365,
      default_priority_code: 'P3',
      priority_labels: {
        P1: { label: 'Blocker', color: '#FF0000' },
        P2: { label: 'High', color: '#FF9900' },
        P3: { label: 'Medium', color: '#FFCC00' },
        P4: { label: 'Low', color: '#0066FF' },
        P5: { label: 'Trivial', color: '#CCCCCC' },
      },
      mention_scope: ['requester', 'watchers', 'approver'],
      mention_max_per_comment: 5,
      notification_defaults: {
        email_frequency: 'instant',
        in_app_realtime: true,
        mention_always_instant: true,
      },
      announcement_defaults: {
        default_type: 'info',
        require_ack_on_urgent: true,
        announcement_retention_days: 90,
      },
      updated_by: userId,
    });

    if (configError) {
      throw configError;
    }

    // Audit log org creation
    await writeAuditLog({
      org_id: orgId,
      entity_type: 'organization',
      entity_id: orgId,
      action: 'created',
      new_values: {
        id: orgId,
        name: 'My Organization',
      },
      correlation_id: `bootstrap-${userId}-${Date.now()}`,
    });

    return { org_id: orgId, created: true };
  } catch (error) {
    console.error('Bootstrap failed:', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
