"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Loader2,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";

import { AuthShell } from "@/components/auth";
import { supabase } from "@/lib/supabase/client";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ONBOARDING PAGE — Command Center Initialization
 * ════════════════════════════════════════════════════════════════════════════
 *
 * POST-GENESIS FLOW:
 *   Step 1: NAME YOUR COMMAND CENTER → Organization name
 *   Step 2: ASSEMBLE YOUR TEAM       → Invite managers (optional)
 *   Step 3: FIRST BROADCAST          → Welcome announcement (optional)
 *
 * PRINCIPLE: "I DO NOT NEED TO KNOW WHAT'S NEXT — THE SYSTEM SHOWS ME"
 *   - Progress is always visible
 *   - Current action is highlighted
 *   - Next action is previewed
 *   - Back navigation is always available
 *   - Skip options are clearly marked
 */

type OnboardingStep = 1 | 2 | 3;

const STEP_CONFIG = {
  1: {
    icon: Building2,
    title: "Name Your Command Center",
    subtitle: "This is how your organization will be identified in the system.",
    hint: "You can change this later in settings.",
  },
  2: {
    icon: Users,
    title: "Assemble Your Team",
    subtitle: "Invite managers to help you handle requests.",
    hint: "Skip this step if you're working solo — you can invite later.",
  },
  3: {
    icon: Megaphone,
    title: "First Broadcast",
    subtitle: "Send a welcome message to your team.",
    hint: "Skip to go straight to your dashboard.",
  },
} as const;

interface OnboardingData {
  orgName: string;
  managerEmails: string;
  announcement: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<OnboardingData>({
    orgName: "",
    managerEmails: "",
    announcement: "",
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Calculate progress percentage
  const progress = ((step - 1) / 2) * 100;

  // Check auth and load org on mount
  useEffect(() => {
    void (async () => {
      setInitializing(true);

      // Check session
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        router.push("/auth/login");
        return;
      }

      const user = session.session.user;
      setUserId(user.id);

      // Load existing org data
      const { data: userRecord } = await supabase
        .from("ceo_users")
        .select("org_id, full_name, ceo_organizations(name)")
        .eq("id", user.id)
        .single();

      if (userRecord?.org_id) {
        setOrgId(userRecord.org_id);
        // Pre-fill org name if it exists
        const orgName =
          (userRecord.ceo_organizations as { name?: string } | null)?.name ||
          "";
        if (orgName && !orgName.includes("'s Organization")) {
          // Org already configured, skip to dashboard
          router.push("/dashboard");
          return;
        }
        // Pre-fill with user's name for better UX
        setFormData((prev) => ({
          ...prev,
          orgName: userRecord.full_name
            ? `${userRecord.full_name}'s Organization`
            : "",
        }));
      }

      setInitializing(false);
    })();
  }, [router]);

  // Step 1: Save organization name
  const handleStepOne = useCallback(async () => {
    setError("");

    if (!formData.orgName.trim()) {
      setError("Please enter your organization name.");
      return;
    }

    setLoading(true);

    try {
      if (!orgId) {
        throw new Error("Organization not initialized. Please refresh.");
      }

      // Update org name
      const { error: updateError } = await supabase
        .from("ceo_organizations")
        .update({ name: formData.orgName.trim() })
        .eq("id", orgId);

      if (updateError) throw updateError;

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }, [formData.orgName, orgId]);

  // Step 2: Invite managers (optional)
  const handleStepTwo = useCallback(
    async (skip = false) => {
      setError("");
      setLoading(true);

      try {
        if (!skip && formData.managerEmails?.trim()) {
          // Parse emails
          const emails = formData.managerEmails
            .split(/[\n,;]/)
            .map((e) => e.trim())
            .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

          if (emails.length > 0) {
            // Send invites via API
            const response = await fetch("/api/admin/invite", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ emails }),
            });

            const result = await response.json();
            if (result.error) {
              throw new Error(result.error);
            }
          }
        }

        setStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send invites");
      } finally {
        setLoading(false);
      }
    },
    [formData.managerEmails]
  );

  // Step 3: Create announcement (optional) and finish
  const handleStepThree = useCallback(
    async (skip = false) => {
      setError("");
      setLoading(true);

      try {
        if (!skip && formData.announcement?.trim() && orgId && userId) {
          const { error: announcementError } = await supabase
            .from("ceo_announcements")
            .insert({
              org_id: orgId,
              type: "info",
              title: "Welcome to CEO Request System",
              message: formData.announcement.trim(),
              published_by: userId,
              published_at: new Date().toISOString(),
            });

          if (announcementError) throw announcementError;
        }

        // All done — navigate to dashboard
        router.push("/dashboard");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create announcement"
        );
        setLoading(false);
      }
    },
    [formData.announcement, orgId, userId, router]
  );

  const goBack = () => {
    setError("");
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  // Loading state
  if (initializing) {
    return (
      <AuthShell
        title="Initializing"
        subtitle="Preparing your command center..."
      >
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-nx-success" />
          <p className="mt-4 text-sm text-nx-text-muted">
            Loading your organization...
          </p>
        </div>
      </AuthShell>
    );
  }

  const currentConfig = STEP_CONFIG[step];
  const StepIcon = currentConfig.icon;

  return (
    <AuthShell
      title="Command Center Setup"
      subtitle={`Step ${step} of 3`}
      footer={
        <p className="text-xs text-nx-text-muted">
          Need help?{" "}
          <Link
            href="#"
            className="text-nx-success font-medium hover:text-nx-success-text transition-colors"
          >
            View Setup Guide
          </Link>
        </p>
      }
    >
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-nx-text-muted">
            SETUP PROGRESS
          </span>
          <span className="text-xs font-mono text-nx-success">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1 bg-nx-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-nx-success"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex items-center gap-2 ${
                s === step
                  ? "text-nx-success"
                  : s < step
                  ? "text-nx-success/60"
                  : "text-nx-text-muted"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                  s < step
                    ? "bg-nx-success text-nx-canvas"
                    : s === step
                    ? "bg-nx-success/20 border border-nx-success text-nx-success"
                    : "bg-nx-border text-nx-text-muted"
                }`}
              >
                {s < step ? <Check className="h-3 w-3" /> : s}
              </div>
              <span className="text-xs hidden sm:inline">
                {s === 1 ? "Name" : s === 2 ? "Team" : "Broadcast"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-lg border border-nx-danger/50 bg-nx-danger-bg p-4"
        >
          <p className="text-sm text-nx-danger-text">{error}</p>
        </motion.div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-nx-success/10">
              <StepIcon className="h-6 w-6 text-nx-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-nx-text-main">
                {currentConfig.title}
              </h3>
              <p className="text-sm text-nx-text-sub">
                {currentConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Step 1: Organization Name */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="orgName"
                  className="block text-xs font-mono text-nx-text-muted tracking-wider mb-2"
                >
                  ORGANIZATION NAME
                </label>
                <input
                  id="orgName"
                  type="text"
                  required
                  autoFocus
                  disabled={loading}
                  value={formData.orgName}
                  onChange={(e) =>
                    setFormData({ ...formData, orgName: e.target.value })
                  }
                  placeholder="Acme Corporation"
                  className="w-full rounded-lg bg-nx-canvas border border-nx-border px-4 py-3 font-mono text-sm text-nx-text-main placeholder:text-nx-text-faint focus:outline-none focus:ring-1 focus:ring-nx-success focus:border-nx-success disabled:opacity-50 transition-all"
                />
                <p className="mt-2 text-xs text-nx-text-muted">
                  {currentConfig.hint}
                </p>
              </div>

              <button
                type="button"
                onClick={handleStepOne}
                disabled={loading || !formData.orgName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-nx-success text-nx-canvas font-medium hover:bg-nx-success/90 focus:outline-none focus:ring-2 focus:ring-nx-success focus:ring-offset-2 focus:ring-offset-nx-canvas disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Invite Managers */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="managerEmails"
                  className="block text-xs font-mono text-nx-text-muted tracking-wider mb-2"
                >
                  MANAGER EMAILS
                </label>
                <textarea
                  id="managerEmails"
                  rows={4}
                  disabled={loading}
                  value={formData.managerEmails}
                  onChange={(e) =>
                    setFormData({ ...formData, managerEmails: e.target.value })
                  }
                  placeholder="manager1@company.com&#10;manager2@company.com"
                  className="w-full rounded-lg bg-nx-canvas border border-nx-border px-4 py-3 font-mono text-sm text-nx-text-main placeholder:text-nx-text-faint focus:outline-none focus:ring-1 focus:ring-nx-success focus:border-nx-success disabled:opacity-50 transition-all resize-none"
                />
                <p className="mt-2 text-xs text-nx-text-muted">
                  {currentConfig.hint}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-nx-border text-nx-text-sub font-medium hover:bg-nx-surface focus:outline-none focus:ring-2 focus:ring-nx-border focus:ring-offset-2 focus:ring-offset-nx-canvas disabled:opacity-50 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleStepTwo(false)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-nx-success text-nx-canvas font-medium hover:bg-nx-success/90 focus:outline-none focus:ring-2 focus:ring-nx-success focus:ring-offset-2 focus:ring-offset-nx-canvas disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {formData.managerEmails?.trim() ? "Send Invites" : "Skip"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Welcome Announcement */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="announcement"
                  className="block text-xs font-mono text-nx-text-muted tracking-wider mb-2"
                >
                  WELCOME MESSAGE
                </label>
                <textarea
                  id="announcement"
                  rows={4}
                  disabled={loading}
                  value={formData.announcement}
                  onChange={(e) =>
                    setFormData({ ...formData, announcement: e.target.value })
                  }
                  placeholder="Welcome to our new CEO Request System! Submit your requests and track their progress in real-time."
                  className="w-full rounded-lg bg-nx-canvas border border-nx-border px-4 py-3 font-mono text-sm text-nx-text-main placeholder:text-nx-text-faint focus:outline-none focus:ring-1 focus:ring-nx-success focus:border-nx-success disabled:opacity-50 transition-all resize-none"
                />
                <p className="mt-2 text-xs text-nx-text-muted">
                  {currentConfig.hint}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-nx-border text-nx-text-sub font-medium hover:bg-nx-surface focus:outline-none focus:ring-2 focus:ring-nx-border focus:ring-offset-2 focus:ring-offset-nx-canvas disabled:opacity-50 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleStepThree(false)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-nx-success text-nx-canvas font-medium hover:bg-nx-success/90 focus:outline-none focus:ring-2 focus:ring-nx-success focus:ring-offset-2 focus:ring-offset-nx-canvas disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {formData.announcement?.trim()
                        ? "Broadcast & Launch"
                        : "Launch Dashboard"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
