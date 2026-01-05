import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { createServerAuthClient } from '@/lib/supabase/server-auth';
import { supabaseAdmin, writeAuditLog } from '@/lib/supabase/server';
import { z } from 'zod';

const InviteSchema = z.object({
  emails: z.array(z.string().email('Invalid email address')).min(1, 'At least one email is required'),
});

/**
 * POST /api/admin/invite
 *
 * Server-side invite endpoint (uses service role).
 *
 * SECURITY:
 * - Authenticates user session (must be logged in)
 * - Fetches role from DB (NOT from client/request body)
 * - Verifies CEO/ADMIN role before inviting
 * - Uses service role ONLY for auth.admin.inviteUserByEmail()
 * - Logs invites to audit_logs
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated (using server auth client that reads cookies)
    const supabaseAuth = await createServerAuthClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's org_id and role from DB (NOT from client)
    const { data: userRecord, error: userError } = await supabaseAdmin.from('ceo_users').select('org_id, role_code').eq('id', user.id).single();

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    const { org_id: orgId, role_code: roleCode } = userRecord;

    // 3. Verify CEO/ADMIN role (gated at DB level)
    if (!['CEO', 'ADMIN'].includes(roleCode)) {
      return NextResponse.json({ error: 'Only CEO/ADMIN can invite users' }, { status: 403 });
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validation = InviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { emails } = validation.data;

    // 5. Invite users via service role
    const inviteResults = [];
    const correlationId = `invite-${user.id}-${Date.now()}`;

    for (const email of emails) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${siteUrl}/auth/callback`,
        });

        if (inviteError) {
          throw inviteError;
        }

        // Create user record in ceo_users table (manager role)
        if (data?.user?.id) {
          const { error: userInsertError } = await supabaseAdmin.from('ceo_users').insert({
            id: data.user.id,
            org_id: orgId,
            email,
            role_code: 'MANAGER',
            is_active: true,
          });

          if (userInsertError) {
            console.error('Failed to create user record:', { email, error: userInsertError });
          }

          // Audit log the invite
          await writeAuditLog({
            org_id: orgId,
            entity_type: 'user_invite',
            entity_id: data.user.id,
            action: 'invited',
            new_values: {
              email,
              role_code: 'MANAGER',
              invited_by: user.id,
            },
            correlation_id: correlationId,
          });
        }

        inviteResults.push({ email, status: 'sent' });
      } catch (err) {
        console.error('Invite failed:', { email, error: err instanceof Error ? err.message : String(err) });
        inviteResults.push({ email, status: 'failed', reason: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    // 6. Return results
    const failedCount = inviteResults.filter((r) => r.status === 'failed').length;
    if (failedCount > 0) {
      return NextResponse.json(
        {
          message: `Invited ${emails.length - failedCount} of ${emails.length} users`,
          results: inviteResults,
        },
        { status: 207 } // Multi-status
      );
    }

    return NextResponse.json(
      {
        message: `Invited ${emails.length} user${emails.length === 1 ? '' : 's'} successfully`,
        results: inviteResults,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Invite API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
