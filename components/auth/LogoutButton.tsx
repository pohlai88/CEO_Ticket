"use client";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium text-gray-600 hover:text-gray-900"
    >
      Sign out
    </button>
  );
}
