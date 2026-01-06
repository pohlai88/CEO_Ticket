"use client";

import { motion } from "framer-motion";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * COMMAND BRIDGE CLIENT — Animated Elements
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Client-side animations for the Command Bridge landing page.
 * Kept minimal — only what requires client-side rendering.
 *
 * This component provides:
 *   - Scan line animation (10s loop, emerald tint)
 *   - Consistent with AuthShell visual system
 */

export function CommandBridgeClient() {
  return (
    <>
      {/* Scan Line (Terminal Authority) */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        initial={{ y: "-100%" }}
        animate={{ y: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 12,
          ease: "linear",
        }}
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(16,185,129,0.04) 50%, transparent 100%)",
          height: "200%",
        }}
      />
    </>
  );
}
