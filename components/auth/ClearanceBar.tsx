"use client";

import { motion } from "framer-motion";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CLEARANCE BAR — Progress Indicator for Auth Rituals
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Visual representation of form completion as "security clearance level".
 *
 * COLOR LAW:
 *   - 0-49%:   Red (insufficient)
 *   - 50-99%:  Amber (partial)
 *   - 100%:    Emerald (authorized)
 *
 * No other colors. No gradients. No playful animations.
 */

interface ClearanceBarProps {
  /** Current clearance level (0-100) */
  level: number;
  /** Optional label override (default: "CLEARANCE LEVEL") */
  label?: string;
}

export function ClearanceBar({
  level,
  label = "CLEARANCE LEVEL",
}: ClearanceBarProps) {
  // Clamp to valid range
  const clampedLevel = Math.max(0, Math.min(100, level));

  // Determine color based on level
  const getBarColor = () => {
    if (clampedLevel === 100) return "bg-nx-success";
    if (clampedLevel >= 50) return "bg-nx-warning";
    return "bg-nx-danger";
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-nx-text-muted font-mono">
        <span>{label}</span>
        <span>{clampedLevel}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-nx-surface-well overflow-hidden">
        <motion.div
          className={`h-full transition-colors duration-300 ${getBarColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedLevel}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
        />
      </div>
    </div>
  );
}
