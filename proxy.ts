import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

/**
 * Next.js Proxy for Supabase Auth Session Refresh
 *
 * This proxy runs on every matched request and:
 * - Refreshes the Supabase auth token if expired
 * - Syncs the refreshed token between server and browser cookies
 *
 * @see https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Common image formats
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
