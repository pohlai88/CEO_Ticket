import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Updates the user's Supabase session by refreshing the auth token.
 *
 * This follows Supabase's official SSR pattern:
 * - Refreshes the Auth token via supabase.auth.getUser()
 * - Passes refreshed token to Server Components via request.cookies.set
 * - Passes refreshed token to browser via response.cookies.set
 *
 * @see https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not add code between createServerClient and getUser()
  // A simple mistake could cause users to be randomly logged out.

  // This refreshes the auth token and syncs cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If there's no user and we're not on auth/public pages, we could redirect
  // But for now, we just ensure the session is refreshed
  // The individual pages handle their own auth requirements
  void user; // Acknowledge we're not using it for redirects here

  // IMPORTANT: Return supabaseResponse as-is
  // It contains the refreshed cookies that must be sent to the browser
  return supabaseResponse;
}
