"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { z } from "zod";

import { supabase } from "@/lib/supabase/client";

const OnboardingSchema = z.object({
  orgName: z.string().min(1, "Organization name is required"),
  managerEmails: z.string().optional(),
  announcement: z.string().optional(),
});

type OnboardingData = z.infer<typeof OnboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<"org" | "announcement">("org");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<OnboardingData>({
    orgName: "",
    managerEmails: "",
    announcement: "",
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Check auth on mount (wait for session to propagate after signup)
  useEffect(() => {
    void (async () => {
      // First check session (more reliable after signup)
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        // If no session, wait 1s and check again (session might be propagating)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }
        setUserId(user.id);
      } else {
        setUserId(session.session.user.id);
      }
    })();
  }, [router]);

  const handleScreenOne = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        const validation = OnboardingSchema.pick({ orgName: true }).safeParse({
          orgName: formData.orgName,
        });

        if (!validation.success) {
          setError(validation.error.errors[0]?.message || "Invalid input");
          setLoading(false);
          return;
        }

        // Update org name
        if (!userId) throw new Error("No user context");

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Get org_id from ceo_users table
        const { data: userRecord } = await supabase
          .from("ceo_users")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (!userRecord?.org_id) {
          setError("Organization not found. Please try signing up again.");
          setLoading(false);
          return;
        }

        setOrgId(userRecord.org_id);

        // Update org name via server action (in next step)
        // For now, just move to screen 2
        setScreen("announcement");
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    },
    [formData.orgName, userId, router]
  );

  const handleScreenTwo = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        if (!userId || !orgId) {
          throw new Error("Missing org context");
        }

        // Parse manager emails
        const emailsText = formData.managerEmails || "";
        const emails = emailsText
          .split(/[\n,;]/)
          .map((e) => e.trim())
          .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

        // Send invites via API route
        if (emails.length > 0) {
          const { error: inviteError } = await fetch("/api/admin/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails }),
          }).then(async (r) => r.json());

          if (inviteError) {
            throw new Error(inviteError);
          }
        }

        // Create announcement if provided
        if (formData.announcement) {
          const { error: announcementError } = await supabase
            .from("ceo_announcements")
            .insert({
              org_id: orgId,
              type: "info",
              title: "Welcome to CEO Request System",
              message: formData.announcement,
              published_by: userId,
              published_at: new Date().toISOString(),
            });

          if (announcementError) {
            throw announcementError;
          }
        }

        // Redirect to dashboard
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    },
    [formData.managerEmails, formData.announcement, userId, orgId, router]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-nx-canvas py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-nx-text-main">
            {screen === "org"
              ? "Set Up Your Organization"
              : "Optional Announcement"}
          </h2>
          <p className="mt-2 text-center text-sm text-nx-text-sub">
            {screen === "org" ? "Screen 1 of 2" : "Screen 2 of 2"}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-nx-danger-bg p-4">
            <p className="text-sm font-medium text-nx-danger-text">{error}</p>
          </div>
        )}

        {screen === "org" ? (
          <form className="mt-8 space-y-6" onSubmit={handleScreenOne}>
            <div>
              <label
                htmlFor="orgName"
                className="block text-sm font-medium text-nx-text-sub"
              >
                Organization Name
              </label>
              <input
                id="orgName"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-nx-border-strong rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-nx-ring focus:border-nx-primary sm:text-sm"
                placeholder="e.g., Acme Corp"
                value={formData.orgName}
                onChange={(e) =>
                  setFormData({ ...formData, orgName: e.target.value })
                }
              />
            </div>

            <div>
              <label
                htmlFor="managerEmails"
                className="block text-sm font-medium text-nx-text-sub"
              >
                Invite Managers (optional)
              </label>
              <textarea
                id="managerEmails"
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-nx-border-strong rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-nx-ring focus:border-nx-primary sm:text-sm"
                placeholder="Enter email addresses separated by commas or new lines"
                value={formData.managerEmails}
                onChange={(e) =>
                  setFormData({ ...formData, managerEmails: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-nx-text-inverse bg-nx-primary hover:bg-nx-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nx-ring disabled:opacity-50"
            >
              {loading ? "Processing..." : "Next"}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleScreenTwo}>
            <div>
              <label
                htmlFor="announcement"
                className="block text-sm font-medium text-nx-text-sub"
              >
                Welcome Announcement (optional)
              </label>
              <textarea
                id="announcement"
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-nx-border-strong rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-nx-ring focus:border-nx-primary sm:text-sm"
                placeholder="Enter a welcome message for your team"
                value={formData.announcement}
                onChange={(e) =>
                  setFormData({ ...formData, announcement: e.target.value })
                }
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setScreen("org")}
                disabled={loading}
                className="flex-1 flex justify-center py-2 px-4 border border-nx-border-strong rounded-md shadow-sm text-sm font-medium text-nx-text-sub bg-nx-surface hover:bg-nx-canvas focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nx-ring disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-nx-text-inverse bg-nx-primary hover:bg-nx-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nx-ring disabled:opacity-50"
              >
                {loading ? "Processing..." : "Finish"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
