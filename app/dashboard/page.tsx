import Link from "next/link";

import { Bell, FileText, Plus } from "lucide-react";

import {
  ImportantAnnouncementBanner,
  UrgentAnnouncementBanner,
} from "@/components/announcements/AnnouncementBanners";
import { AppShell } from "@/components/app";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/lib/server/dashboard";

export default async function DashboardPage() {
  const { user, org, userRole, unreadAnnouncementCount } =
    await getDashboardData();

  return (
    <AppShell
      userEmail={user.email ?? undefined}
      banners={
        <>
          <UrgentAnnouncementBanner />
          <ImportantAnnouncementBanner />
        </>
      }
      navActions={
        <>
          <Link href="/announcements" className="relative">
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
              {unreadAnnouncementCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-nx-danger text-nx-text-inverse text-xs flex items-center justify-center">
                  {unreadAnnouncementCount}
                </span>
              )}
            </Button>
          </Link>
          <LogoutButton />
        </>
      }
    >
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Quick Actions */}
          <Link href="/requests/new">
            <div className="bg-nx-surface rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-nx-primary-light rounded-lg">
                  <Plus className="h-6 w-6 text-nx-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-nx-text-main">
                    New Request
                  </h3>
                  <p className="text-sm text-nx-text-sub">
                    Submit a request to CEO
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/requests">
            <div className="bg-nx-surface rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-nx-success-bg rounded-lg">
                  <FileText className="h-6 w-6 text-nx-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-nx-text-main">
                    My Requests
                  </h3>
                  <p className="text-sm text-nx-text-sub">
                    View all your requests
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/announcements">
            <div className="bg-nx-surface rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-nx-info-bg rounded-lg">
                  <Bell className="h-6 w-6 text-nx-info" />
                </div>
                <div>
                  <h3 className="font-semibold text-nx-text-main">
                    Announcements
                  </h3>
                  <p className="text-sm text-nx-text-sub">
                    {unreadAnnouncementCount > 0
                      ? `${unreadAnnouncementCount} unread`
                      : "View all updates"}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-nx-surface rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-nx-text-main mb-4">
            Welcome
          </h2>
          <div className="space-y-2 text-nx-text-sub">
            <p>Organization: {org?.name || "Not set"}</p>
            <p>Email: {user.email}</p>
            <p>Role: {userRole}</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
