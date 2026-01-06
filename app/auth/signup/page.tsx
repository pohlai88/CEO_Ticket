"use client";

import { useCallback, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, Eye, EyeOff } from "lucide-react";

import { AuthShell, ClearanceBar } from "@/components/auth";
import { supabase } from "@/lib/supabase/client";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SIGNUP PAGE — Organization Genesis Flow
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This is NOT account creation. This is AUTHORITY INITIALIZATION.
 *
 * 3-STEP GENESIS RITUAL:
 *   Step 1: DESIGNATION    → Full name (who you are)
 *   Step 2: IDENTITY       → Email (how you're recognized)
 *   Step 3: CREDENTIAL     → Password (how you prove authority)
 *
 * LANGUAGE LAW:
 *   - Signup      → Initialize
 *   - Name        → DESIGNATION
 *   - Email       → IDENTITY
 *   - Password    → CREDENTIAL
 *   - Submit      → INITIALIZE COMMAND NODE
 *   - Loading     → PROVISIONING AUTHORITY
 *
 * This page is a CONSUMER of AuthShell. It does NOT define tone.
 */

type GenesisStep = 1 | 2 | 3;

const STEP_CONFIG = {
  1: {
    title: "Organization Genesis",
    subtitle: "Step 1 of 3 — Establish your designation.",
  },
  2: {
    title: "Organization Genesis",
    subtitle: "Step 2 of 3 — Register your identity.",
  },
  3: {
    title: "Organization Genesis",
    subtitle: "Step 3 of 3 — Secure your authority.",
  },
} as const;

export default function SignupPage() {
  const router = useRouter();

  // Genesis step
  const [step, setStep] = useState<GenesisStep>(1);

  // Form state (canonical naming)
  const [designation, setDesignation] = useState("");
  const [identity, setIdentity] = useState("");
  const [credential, setCredential] = useState("");
  const [showCredential, setShowCredential] = useState(false);

  // Status state
  const [clearanceLevel, setClearanceLevel] = useState(0);
  const [provisioning, setProvisioning] = useState(false);
  const [genesisError, setGenesisError] = useState("");

  // Calculate clearance level based on current step and field completion
  const calculateClearance = useCallback(() => {
    let level = 0;

    // Step 1: Designation (33% max)
    if (designation.length >= 2) level += 33;

    // Step 2: Identity (33% max)
    if (identity.includes("@") && identity.includes(".")) level += 33;

    // Step 3: Credential (34% max)
    if (credential.length >= 6) level += 34;

    setClearanceLevel(Math.min(level, 100));
  }, [designation, identity, credential]);

  // Recalculate on field changes
  const handleDesignationChange = (value: string) => {
    setDesignation(value);
    setTimeout(calculateClearance, 0);
  };

  const handleIdentityChange = (value: string) => {
    setIdentity(value);
    setTimeout(calculateClearance, 0);
  };

  const handleCredentialChange = (value: string) => {
    setCredential(value);
    setTimeout(calculateClearance, 0);
  };

  // Step navigation
  const advanceStep = () => {
    setGenesisError("");

    if (step === 1) {
      if (designation.trim().length < 2) {
        setGenesisError("Designation requires at least 2 characters.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!identity.includes("@") || !identity.includes(".")) {
        setGenesisError("Invalid identity format.");
        return;
      }
      setStep(3);
    }
  };

  const retreatStep = () => {
    setGenesisError("");
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  // Final initialization
  const initializeCommandNode = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setGenesisError("");

      // Validate final step
      if (credential.length < 6) {
        setGenesisError("Credential must be at least 6 characters.");
        return;
      }

      setProvisioning(true);

      try {
        // Deliberate authority delay — genesis is weighty
        await new Promise((resolve) => setTimeout(resolve, 600));

        const { data, error: signupError } = await supabase.auth.signUp({
          email: identity,
          password: credential,
          options: {
            data: {
              full_name: designation,
            },
          },
        });

        if (signupError) {
          setGenesisError(signupError.message);
          setProvisioning(false);
          return;
        }

        if (!data.user) {
          setGenesisError("Genesis failed: no authority node returned.");
          setProvisioning(false);
          return;
        }

        // Verify session establishment
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          setGenesisError("Session not established. Refresh and authenticate.");
          setProvisioning(false);
          return;
        }

        // Command node initialized — proceed to onboarding
        router.push("/onboarding");
      } catch (err) {
        setGenesisError(
          err instanceof Error ? err.message : "Genesis initialization failed"
        );
        setProvisioning(false);
      }
    },
    [designation, identity, credential, router]
  );

  // Determine if current step is complete
  const isStepComplete = () => {
    if (step === 1) return designation.trim().length >= 2;
    if (step === 2) return identity.includes("@") && identity.includes(".");
    if (step === 3) return credential.length >= 6;
    return false;
  };

  return (
    <AuthShell
      title={STEP_CONFIG[step].title}
      subtitle={STEP_CONFIG[step].subtitle}
      footer={
        <p className="text-xs text-[var(--color-nx-text-muted)]">
          Already initialized?{" "}
          <Link
            href="/auth/login"
            className="text-[var(--color-nx-success)] font-medium hover:text-[var(--color-nx-success-text)] transition-colors"
          >
            Authenticate →
          </Link>
        </p>
      }
    >
      <form onSubmit={initializeCommandNode}>
        {/* Genesis Progress Bar */}
        <ClearanceBar level={clearanceLevel} label="GENESIS PROGRESS" />

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-mono transition-all ${
                  s < step
                    ? "bg-[var(--color-nx-success)] text-nx-text-inverse"
                    : s === step
                    ? "bg-[var(--color-nx-success)]/20 border border-[var(--color-nx-success)] text-[var(--color-nx-success)]"
                    : "bg-[var(--color-nx-surface-well)] text-[var(--color-nx-text-muted)]"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-8 h-0.5 transition-colors ${
                    s < step
                      ? "bg-[var(--color-nx-success)]"
                      : "bg-[var(--color-nx-surface-well)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {genesisError && !provisioning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg border border-[var(--color-nx-danger)]/50 bg-[var(--color-nx-danger-bg)] p-4"
          >
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-[var(--color-nx-danger-text)] shrink-0" />
              <div className="text-sm text-[var(--color-nx-danger-text)]">
                <p className="font-medium">Genesis Error</p>
                <p className="mt-1 text-[var(--color-nx-danger-text)]/80">
                  {genesisError}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* ─────────────────────────────────────────────────────────────
              STEP 1: DESIGNATION
              ───────────────────────────────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="mb-6">
                <label
                  htmlFor="designation"
                  className="block text-xs font-mono text-[var(--color-nx-text-muted)] tracking-wider mb-2"
                >
                  DESIGNATION
                </label>
                <input
                  id="designation"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  required
                  value={designation}
                  onChange={(e) => handleDesignationChange(e.target.value)}
                  placeholder="Commander Name"
                  className="w-full rounded-lg bg-[var(--color-nx-canvas)] border border-[var(--color-nx-border)] px-4 py-3 font-mono text-sm text-[var(--color-nx-text-main)] placeholder:text-[var(--color-nx-text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--color-nx-success)] focus:border-[var(--color-nx-success)] transition-all"
                />
                <p className="mt-2 text-xs text-[var(--color-nx-text-faint)]">
                  Your authority designation within the system.
                </p>
              </div>

              <button
                type="button"
                onClick={advanceStep}
                disabled={!isStepComplete()}
                className="w-full rounded-lg bg-[var(--color-nx-success)] hover:bg-[var(--color-nx-success-text)] py-3.5 text-sm font-semibold tracking-wide text-nx-text-inverse transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-nx-success)] flex items-center justify-center gap-2"
              >
                PROCEED
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 2: IDENTITY
              ───────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="mb-6">
                <label
                  htmlFor="identity"
                  className="block text-xs font-mono text-[var(--color-nx-text-muted)] tracking-wider mb-2"
                >
                  IDENTITY
                </label>
                <input
                  id="identity"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={identity}
                  onChange={(e) => handleIdentityChange(e.target.value)}
                  placeholder="commander@organization.com"
                  className="w-full rounded-lg bg-[var(--color-nx-canvas)] border border-[var(--color-nx-border)] px-4 py-3 font-mono text-sm text-[var(--color-nx-text-main)] placeholder:text-[var(--color-nx-text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--color-nx-success)] focus:border-[var(--color-nx-success)] transition-all"
                />
                <p className="mt-2 text-xs text-[var(--color-nx-text-faint)]">
                  Primary communication channel for authority verification.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={retreatStep}
                  className="flex-1 rounded-lg border border-[var(--color-nx-border-strong)] bg-[var(--color-nx-surface)] hover:bg-[var(--color-nx-surface-well)] py-3.5 text-sm font-semibold tracking-wide text-[var(--color-nx-text-sub)] transition-all"
                >
                  BACK
                </button>
                <button
                  type="button"
                  onClick={advanceStep}
                  disabled={!isStepComplete()}
                  className="flex-1 rounded-lg bg-[var(--color-nx-success)] hover:bg-[var(--color-nx-success-text)] py-3.5 text-sm font-semibold tracking-wide text-nx-text-inverse transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-nx-success)] flex items-center justify-center gap-2"
                >
                  PROCEED
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 3: CREDENTIAL
              ───────────────────────────────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="mb-6">
                <label
                  htmlFor="credential"
                  className="block text-xs font-mono text-[var(--color-nx-text-muted)] tracking-wider mb-2"
                >
                  CREDENTIAL
                </label>
                <div className="relative">
                  <input
                    id="credential"
                    type={showCredential ? "text" : "password"}
                    autoComplete="new-password"
                    autoFocus
                    required
                    value={credential}
                    onChange={(e) => handleCredentialChange(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg bg-[var(--color-nx-canvas)] border border-[var(--color-nx-border)] px-4 py-3 pr-12 font-mono text-sm text-[var(--color-nx-text-main)] tracking-widest placeholder:text-[var(--color-nx-text-faint)] placeholder:tracking-widest focus:outline-none focus:ring-1 focus:ring-[var(--color-nx-success)] focus:border-[var(--color-nx-success)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCredential(!showCredential)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-nx-text-muted)] hover:text-[var(--color-nx-text-sub)] transition-colors"
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
                <p className="mt-2 text-xs text-[var(--color-nx-text-faint)]">
                  Minimum 6 characters. This secures your command authority.
                </p>
              </div>

              {/* Terms Agreement */}
              <p className="text-xs text-[var(--color-nx-text-muted)] mb-6">
                By initializing, you accept the{" "}
                <Link
                  href="#"
                  className="text-[var(--color-nx-success)] hover:text-[var(--color-nx-success-text)] transition-colors"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="#"
                  className="text-[var(--color-nx-success)] hover:text-[var(--color-nx-success-text)] transition-colors"
                >
                  Privacy Protocol
                </Link>
                .
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={retreatStep}
                  disabled={provisioning}
                  className="flex-1 rounded-lg border border-[var(--color-nx-border-strong)] bg-[var(--color-nx-surface)] hover:bg-[var(--color-nx-surface-well)] py-3.5 text-sm font-semibold tracking-wide text-[var(--color-nx-text-sub)] transition-all disabled:opacity-50"
                >
                  BACK
                </button>
                <motion.button
                  type="submit"
                  disabled={!isStepComplete() || provisioning}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 rounded-lg bg-[var(--color-nx-success)] hover:bg-[var(--color-nx-success-text)] py-3.5 text-sm font-semibold tracking-wide text-nx-text-inverse transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-nx-success)]"
                >
                  {provisioning ? (
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
                      PROVISIONING…
                    </span>
                  ) : (
                    "INITIALIZE"
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </AuthShell>
  );
}
