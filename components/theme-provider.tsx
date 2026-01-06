/* ============================================================================
   THEME PROVIDER — next-themes Integration
   ============================================================================
   
   Provides dark/light/system theme switching with:
   - Class-based toggle (adds .dark to <html>)
   - System preference detection (prefers-color-scheme)
   - Local storage persistence
   - SSR-safe (suppressHydrationWarning)
   
   @see RFC-DM-001 Canonical Dark Mode Doctrine
   @see https://github.com/pacocoursey/next-themes
   ============================================================================ */

"use client";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps): React.ReactElement {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
