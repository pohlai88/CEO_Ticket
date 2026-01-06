/* ============================================================================
   APPSHELL — POST-AUTH LAYOUT INFRASTRUCTURE
   ============================================================================
   
   This component provides consistent navigation and theming for all
   authenticated pages EXCEPT auth pages (which use AuthShell).
   
   INCLUDES:
   - Theme toggle (light/dark/system)
   - Consistent nav bar
   - Announcement banners slot
   - Main content area
   
   PAGES THAT USE THIS:
   - /dashboard
   - /requests/*
   - /approvals/*
   - /announcements/*
   - /messages/*
   - /admin/*
   
   PAGES THAT DO NOT USE THIS (use AuthShell instead):
   - /auth/login
   - /auth/signup
   - / (landing page)
   - /onboarding
   
   @see UI_CONSTITUTION.md §5.1 — Auth pages are dark-only
   @see RFC-DM-001 Canonical Dark Mode Doctrine
   ============================================================================ */

import type { ReactNode } from "react";

import Link from "next/link";

import { Command } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

interface AppShellProps {
  /** Main content */
  children: ReactNode;
  /** Optional slot for announcement banners (rendered above nav) */
  banners?: ReactNode;
  /** Optional slot for nav actions (right side, before theme toggle) */
  navActions?: ReactNode;
  /** User email to display */
  userEmail?: string;
}

export function AppShell({
  children,
  banners,
  navActions,
  userEmail,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-nx-canvas">
      {/* Announcement Banners (optional) */}
      {banners}

      {/* Navigation Bar */}
      <nav className="bg-nx-surface border-b border-nx-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Brand */}
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <div className="h-8 w-8 rounded-lg bg-nx-success/10 border border-nx-success/20 flex items-center justify-center transition-colors group-hover:bg-nx-success/20">
                  <Command className="h-4 w-4 text-nx-success" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-nx-text-main">
                  Quantum<span className="text-nx-success">Nexus</span>
                </span>
              </Link>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-4">
              {/* Custom nav actions slot */}
              {navActions}

              {/* User email */}
              {userEmail && (
                <span className="text-sm text-nx-text-sub hidden sm:inline">
                  {userEmail}
                </span>
              )}

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
