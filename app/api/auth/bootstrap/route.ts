import 'server-only';

import { NextResponse } from 'next/server';

import { bootstrapOrgIfNeeded } from '@/lib/auth/bootstrap';
import { createServerAuthClient } from '@/lib/supabase/server-auth';

/**
 * POST /api/auth/bootstrap
 *
 * Server-side bootstrap endpoint.
 * Called from dashboard when user logs in for the first time.
 * Creates org + seeds ceo_config via service role.
 */
export async function POST() {
  try {
    // Get current user (using server auth client that reads cookies)
    const supabaseAuth = await createServerAuthClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Bootstrap org if needed (uses service role internally)
    const { org_id, created } = await bootstrapOrgIfNeeded(user.id);

    return NextResponse.json(
      {
        org_id,
        created,
        message: created ? 'Organization created' : 'Organization already exists',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Bootstrap API error:', err);
    return NextResponse.json({ error: 'Bootstrap failed' }, { status: 500 });
  }
}
