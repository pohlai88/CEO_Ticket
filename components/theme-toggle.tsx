/* ============================================================================
   THEME TOGGLE — Dark/Light Mode Switch
   ============================================================================
   
   A button component to cycle through theme modes:
   - light → dark → system → light
   
   Uses NEXUS semantic tokens for styling.
   
   @see RFC-DM-001 Canonical Dark Mode Doctrine
   ============================================================================ */

"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle(): React.ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const cycleTheme = (): void => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = (): string => {
    if (theme === "dark") return "🌙";
    if (theme === "light") return "☀️";
    return "💻";
  };

  const getLabel = (): string => {
    if (theme === "dark") return "Dark";
    if (theme === "light") return "Light";
    return "System";
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-2 px-3 py-2 text-sm rounded-nx-md 
                 bg-nx-surface hover:bg-nx-ghost-hover
                 text-nx-text-sub hover:text-nx-text-main
                 border border-nx-border
                 transition-colors duration-200"
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
    >
      <span>{getIcon()}</span>
      <span className="hidden sm:inline">{getLabel()}</span>
    </button>
  );
}
