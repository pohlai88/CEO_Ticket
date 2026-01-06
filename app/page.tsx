import Link from "next/link";
import { redirect } from "next/navigation";

import { createServerAuthClient } from "@/lib/supabase/server-auth";

export default async function Home() {
  const supabase = await createServerAuthClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if user has org, if not go to onboarding
    const { data: userProfile } = await supabase
      .from("ceo_users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (userProfile?.org_id) {
      redirect("/dashboard");
    } else {
      redirect("/onboarding");
    }
  }

  // Unauthenticated - show landing page
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-8 max-w-md">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            CEO Request Ticketing System
          </h1>
          <p className="text-xl text-gray-600">
            Executive decision-making and approval system
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            Get started with our CEO request and approval system for executive
            decision-making.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/auth/signup"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Organization
            </Link>

            <Link
              href="/auth/login"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-2 text-sm text-gray-600">
          <p className="font-semibold">Features:</p>
          <ul className="space-y-1 text-left">
            <li>✓ Request management and tracking</li>
            <li>✓ Executive approvals</li>
            <li>✓ Team announcements</li>
            <li>✓ Audit logs</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
