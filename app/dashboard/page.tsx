import Link from "next/link";

import { Bell, FileText, Plus } from "lucide-react";

import {
  ImportantAnnouncementBanner,
  UrgentAnnouncementBanner,
} from "@/components/announcements/AnnouncementBanners";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/lib/server/dashboard";

export default async function DashboardPage() {
  const { user, org, userRole, unreadAnnouncementCount } =
    await getDashboardData();

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
                  {unreadAnnouncementCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {unreadAnnouncementCount}
                    </span>
                  )}
                </Button>
              </Link>
              <span className="text-sm text-gray-600">{user.email}</span>
              <LogoutButton />
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
                    {unreadAnnouncementCount > 0
                      ? `${unreadAnnouncementCount} unread`
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
            <p>Organization: {org?.name || "Not set"}</p>
            <p>Email: {user.email}</p>
            <p>Role: {userRole}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
