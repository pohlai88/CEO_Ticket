"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { motion } from "framer-motion";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

import { AuthShell, ClearanceBar } from "@/components/auth";
import { supabase } from "@/lib/supabase/client";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LOGIN PAGE — Security Clearance Gate
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This page is a CONSUMER of AuthShell. It does NOT define tone.
 * The system owns tone. This page implements the ritual.
 *
 * LANGUAGE LAW (inherited from AuthShell doctrine):
 *   - Email      → IDENTITY
 *   - Password   → CREDENTIAL
 *   - Submit     → AUTHORIZE ACCESS
 *   - Loading    → VERIFYING CLEARANCE
 */

export default function LoginPage() {
  const router = useRouter();

  // Form state (canonical naming)
  const [identity, setIdentity] = useState("");
  const [credential, setCredential] = useState("");
  const [showCredential, setShowCredential] = useState(false);

  // Clearance state
  const [clearanceLevel, setClearanceLevel] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [clearanceError, setClearanceError] = useState("");

  // Calculate clearance level based on field completion
  useEffect(() => {
    let level = 0;

    // Identity validation (email format check)
    if (identity.length > 0) level += 20;
    if (identity.includes("@")) level += 15;
    if (identity.includes(".")) level += 15;

    // Credential validation
    if (credential.length > 0) level += 20;
    if (credential.length >= 6) level += 30;

    setClearanceLevel(Math.min(level, 100));
  }, [identity, credential]);

  const authenticate = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setClearanceError("");

      // Clearance must be 100% to proceed
      if (clearanceLevel < 100) {
        setClearanceError("Insufficient clearance. Complete all fields.");
        return;
      }

      setVerifying(true);

      try {
        // Deliberate authority delay — crossing a boundary
        await new Promise((resolve) => setTimeout(resolve, 420));

        const { error: authError } = await supabase.auth.signInWithPassword({
          email: identity,
          password: credential,
        });

        if (authError) {
          setClearanceError(authError.message);
          setVerifying(false);
          return;
        }

        // Verify session establishment
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          setClearanceError("Session not established. Retry authentication.");
          setVerifying(false);
          return;
        }

        // Access granted — proceed to command bridge
        router.push("/dashboard");
      } catch (err) {
        setClearanceError(
          err instanceof Error ? err.message : "Authentication failed"
        );
        setVerifying(false);
      }
    },
    [identity, credential, clearanceLevel, router]
  );

  return (
    <AuthShell
      title="Security Clearance"
      subtitle="Authenticate to access the command bridge."
      footer={
        <p className="text-xs text-nx-text-muted">
          No organization?{" "}
          <Link
            href="/auth/signup"
            className="text-nx-success font-medium hover:text-nx-success-text transition-colors"
          >
            Initialize Command Node →
          </Link>
        </p>
      }
    >
      <form onSubmit={authenticate}>
        {/* Clearance Level Bar */}
        <ClearanceBar level={clearanceLevel} />

        {/* Error Alert (Clearance Denied) */}
        {clearanceError && !verifying && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg border border-nx-danger/50 bg-nx-danger-bg p-4"
          >
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-nx-danger-text shrink-0" />
              <div className="text-sm text-nx-danger-text">
                <p className="font-medium">Clearance Denied</p>
                <p className="mt-1 text-nx-danger-text/80">
                  {clearanceError}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Identity Field */}
        <div className="mb-4">
          <label
            htmlFor="identity"
            className="block text-xs font-mono text-nx-text-muted tracking-wider mb-2"
          >
            IDENTITY
          </label>
          <input
            id="identity"
            type="email"
            autoComplete="email"
            required
            disabled={verifying}
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="executive@organization.com"
            className="w-full rounded-lg bg-nx-canvas border border-nx-border px-4 py-3 font-mono text-sm text-nx-text-main placeholder:text-nx-text-faint focus:outline-none focus:ring-1 focus:ring-nx-success focus:border-nx-success disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
        </div>

        {/* Credential Field */}
        <div className="mb-6">
          <label
            htmlFor="credential"
            className="block text-xs font-mono text-nx-text-muted tracking-wider mb-2"
          >
            CREDENTIAL
          </label>
          <div className="relative">
            <input
              id="credential"
              type={showCredential ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={verifying}
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-nx-canvas border border-nx-border px-4 py-3 pr-12 font-mono text-sm text-nx-text-main tracking-widest placeholder:text-nx-text-faint placeholder:tracking-widest focus:outline-none focus:ring-1 focus:ring-nx-success focus:border-nx-success disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
            <button
              type="button"
              onClick={() => setShowCredential(!showCredential)}
              disabled={verifying}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-nx-text-muted hover:text-nx-text-sub transition-colors disabled:opacity-50"
              aria-label={
                showCredential ? "Hide credential" : "Show credential"
              }
            >
              {showCredential ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Authorize Access Button */}
        <motion.button
          type="submit"
          disabled={clearanceLevel < 100 || verifying}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-lg bg-nx-success hover:bg-nx-success-text py-3.5 text-sm font-semibold tracking-wide text-nx-text-inverse transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-nx-success"
        >
          {verifying ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 1,
                  ease: "linear",
                }}
              />
              VERIFYING CLEARANCE…
            </span>
          ) : (
            "AUTHORIZE ACCESS"
          )}
        </motion.button>
      </form>
    </AuthShell>
  );
}
