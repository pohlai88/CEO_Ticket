"use client";

import { ReactNode } from "react";

import Link from "next/link";

import { motion } from "framer-motion";
import { Command } from "lucide-react";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTHSHELL — CONSTITUTIONAL INFRASTRUCTURE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This is NOT a layout. This is LAW.
 *
 * Any auth-related page MUST live inside this shell.
 * No page can:
 *   - Change easing
 *   - Introduce new accent colors
 *   - Add playful motion
 *   - Rename canonical verbs
 *
 * IMMUTABLE (enforced by this component):
 *   - Background (blueprint grid + scan line)
 *   - Color system (emerald accent only)
 *   - Motion discipline (no bounce, no playful easing)
 *   - Typography hierarchy
 *   - Z-layering (world → shell → ritual)
 *
 * VARIABLE (slots only):
 *   - title
 *   - subtitle
 *   - children (form content)
 *   - footer (optional link/text)
 */

interface AuthShellProps {
  /** Page title (e.g., "Security Clearance", "Organization Genesis") */
  title: string;
  /** Subtitle text below the title */
  subtitle: string;
  /** Main content (form fields, buttons, etc.) */
  children: ReactNode;
  /** Optional footer content (e.g., link to login/signup) */
  footer?: ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen bg-[var(--color-nx-canvas)] text-[var(--color-nx-text-main)] overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 1: Blueprint Grid (Architect Authority)
          Immutable. 48px grid. 4% opacity. No modifications allowed.
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
          LAYER 2: Scan Line (Terminal Authority)
          10s loop. Emerald tint. Linear easing only.
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ y: "-100%" }}
        animate={{ y: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 10,
          ease: "linear",
        }}
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(16,185,129,0.03) 50%, transparent 100%)",
          height: "200%",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 3: Header / Brand Mark
          Fixed position. Consistent across all auth pages.
          ═══════════════════════════════════════════════════════════════════ */}
      <header className="absolute top-0 left-0 w-full py-6 px-8 z-20">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-[var(--color-nx-success)]/10 border border-[var(--color-nx-success)]/20 flex items-center justify-center transition-colors group-hover:bg-[var(--color-nx-success)]/20">
            <Command className="h-4 w-4 text-[var(--color-nx-success)]" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[var(--color-nx-text-main)]">
            Quantum<span className="text-[var(--color-nx-success)]">Nexus</span>
          </span>
        </Link>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 4: Centered Content Container
          Fade-in + slide-up. easeOut only. No bounce.
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Glassmorphic Container */}
          <div className="rounded-2xl border border-[var(--color-nx-border)] bg-[var(--color-nx-surface)]/60 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="p-8">
              {/* Title Block */}
              <div className="mb-6">
                <h1 className="text-xl font-semibold tracking-wide text-[var(--color-nx-text-main)]">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-[var(--color-nx-text-muted)]">
                  {subtitle}
                </p>
              </div>

              {/* Content Slot */}
              {children}
            </div>

            {/* Footer Slot (optional) */}
            {footer && (
              <div className="bg-[var(--color-nx-surface)]/50 border-t border-[var(--color-nx-border)] px-8 py-4 text-center">
                {footer}
              </div>
            )}
          </div>

          {/* Legal Footer — Always present */}
          <div className="mt-6 flex justify-center gap-6 text-xs text-[var(--color-nx-text-faint)]">
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
