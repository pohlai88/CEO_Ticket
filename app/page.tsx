import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowRight, Command } from "lucide-react";

import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { CommandBridgeClient } from "./CommandBridgeClient";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LANDING PAGE — COMMAND BRIDGE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Establish power, scale, inevitability.
 * EMOTION: "This already runs without me."
 *
 * This page answers ONE question:
 *   "Is this serious enough for me to proceed?"
 *
 * DOCTRINE:
 *   ❌ No signup emphasis
 *   ❌ No feature laundry list
 *   ❌ No "Welcome" language
 *   ❌ No forms
 *   ✅ ONE dominant CTA: ENTER COMMAND BRIDGE
 *   ✅ Authority aesthetic inherited from auth system
 */

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

  // Unauthenticated - show Command Bridge entry
  return (
    <div className="relative min-h-screen bg-[var(--color-nx-canvas)] text-[var(--color-nx-text-main)] overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 1: Blueprint Grid (Architect Authority)
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 2: Radial Glow (Command Presence)
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 70%)",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 3: Animated Scan Line (Client Component)
          ═══════════════════════════════════════════════════════════════════ */}
      <CommandBridgeClient />

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 4: Header / Brand Mark
          ═══════════════════════════════════════════════════════════════════ */}
      <header className="absolute top-0 left-0 w-full py-6 px-8 z-20 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--color-nx-success)]/10 border border-[var(--color-nx-success)]/20 flex items-center justify-center">
            <Command className="h-4 w-4 text-[var(--color-nx-success)]" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[var(--color-nx-text-main)]">
            Quantum<span className="text-[var(--color-nx-success)]">Nexus</span>
          </span>
        </div>

        {/* Secondary entry for returning operators */}
        <Link
          href="/auth/login"
          className="text-sm text-[var(--color-nx-text-muted)] hover:text-[var(--color-nx-text-sub)] transition-colors"
        >
          Authenticate →
        </Link>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 5: Central Command Content
          ═══════════════════════════════════════════════════════════════════ */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          {/* Authority Mark */}
          <div className="mb-8 flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-[var(--color-nx-success)]/10 border border-[var(--color-nx-success)]/20 flex items-center justify-center">
              <Command className="h-10 w-10 text-[var(--color-nx-success)]" />
            </div>
          </div>

          {/* Title Block */}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--color-nx-text-main)] mb-4">
            Command Bridge
          </h1>

          <p className="text-lg md:text-xl text-[var(--color-nx-text-muted)] mb-2">
            Executive Decision Fabric
          </p>

          <p className="text-sm text-[var(--color-nx-text-faint)] max-w-md mx-auto mb-12">
            Zero-latency authority routing. Request orchestration.
            Organizational command and control.
          </p>

          {/* Primary CTA — ONE DOMINANT ACTION */}
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[var(--color-nx-success)] hover:bg-[var(--color-nx-success-text)] text-white font-semibold tracking-wide transition-all shadow-lg shadow-[var(--color-nx-success)]/20 hover:shadow-[var(--color-nx-success)]/30 group"
          >
            ENTER COMMAND BRIDGE
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Secondary path — minimal, de-emphasized */}
          <p className="mt-6 text-xs text-[var(--color-nx-text-faint)]">
            New organization?{" "}
            <Link
              href="/auth/signup"
              className="text-[var(--color-nx-success)]/70 hover:text-[var(--color-nx-success-text)] transition-colors"
            >
              Initialize Command Node
            </Link>
          </p>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 6: Footer
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="absolute bottom-0 left-0 w-full py-6 px-8 z-20">
        <div className="flex justify-center gap-8 text-xs text-[var(--color-nx-text-faint)]">
          <Link
            href="#"
            className="hover:text-[var(--color-nx-text-muted)] transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="#"
            className="hover:text-[var(--color-nx-text-muted)] transition-colors"
          >
            Privacy Protocol
          </Link>
          <span className="text-[var(--color-nx-text-faint)]/50">
            © 2026 QuantumNexus
          </span>
        </div>
      </footer>
    </div>
  );
}
