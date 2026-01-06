"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Bell, FileText, Plus } from "lucide-react";

import {
  ImportantAnnouncementBanner,
  UrgentAnnouncementBanner,
} from "@/components/announcements/AnnouncementBanners";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current user
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push("/auth/login");
          return;
        }

        setUser(authUser);

        // Get user profile (org_id, role)
        const { data: userProfile } = await supabase
          .from("ceo_users")
          .select("org_id, role_code")
          .eq("id", authUser.id)
          .single();

        if (!userProfile) {
          // First login - need to bootstrap
          const response = await fetch("/api/auth/bootstrap", {
            method: "POST",
          });
          if (!response.ok) {
            throw new Error("Bootstrap failed");
          }
          const { org_id } = await response.json();
          setOrg({ id: org_id });
        } else {
          // Get org details
          const { data: orgData } = await supabase
            .from("ceo_organizations")
            .select("*")
            .eq("id", userProfile.org_id)
            .single();
          setOrg(orgData);
          setUserRole(userProfile.role_code);

          // Get unread announcement count
          if (userProfile.role_code !== "ceo") {
            const res = await fetch("/api/announcements");
            if (res.ok) {
              const data = await res.json();
              const unread =
                data.announcements?.filter((a: any) => !a.is_read).length || 0;
              setUnreadCount(unread);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Announcement Banners */}
      <UrgentAnnouncementBanner />
      <ImportantAnnouncementBanner />

      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                CEO Request System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/announcements" className="relative">
                <Button variant="ghost" size="sm">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Quick Actions */}
          <Link href="/requests/new">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">New Request</h3>
                  <p className="text-sm text-gray-600">
                    Submit a request to CEO
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/requests">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">My Requests</h3>
                  <p className="text-sm text-gray-600">
                    View all your requests
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/announcements">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Bell className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Announcements</h3>
                  <p className="text-sm text-gray-600">
                    {unreadCount > 0
                      ? `${unreadCount} unread`
                      : "View all updates"}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Welcome</h2>
          <div className="space-y-2 text-gray-600">
            <p>Organization: {org?.name || "Loading..."}</p>
            <p>Email: {user?.email}</p>
            <p>Role: {userRole || "Loading..."}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
