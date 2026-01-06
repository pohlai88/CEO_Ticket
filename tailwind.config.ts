/* ============================================================================
   TAILWIND CSS v4 CONFIGURATION — NEXUS UI GUARD INTEGRATION
   ============================================================================
   
   Tailwind v4 is CSS-FIRST:
   - Design tokens are defined in CSS (@theme blocks in globals.css)
   - This config is MINIMAL - only for content paths and plugins
   - Color system is inherited from @nexus/ui-guard upstream
   
   Constitutional Hierarchy:
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ @nexus/ui-guard/style.css   →  Palette + Semantic tokens (upstream)    │
   │ app/globals.css             →  Dark mode + Legacy compatibility        │
   │ tailwind.config.ts          →  Content paths only (this file)          │
   └─────────────────────────────────────────────────────────────────────────┘
   
   @see RFC-DM-001 Dark Mode Doctrine
   @see https://tailwindcss.com/docs/v4-upgrade
   ============================================================================ */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  /* ═══════════════════════════════════════════════════════════════════════
     THEME EXTENSION (LEGACY COMPATIBILITY)
     ═══════════════════════════════════════════════════════════════════════
     
     In Tailwind v4, theme configuration moves to CSS @theme blocks.
     These extensions provide backward compatibility with shadcn/ui components
     until full migration to nx-* semantic classes is complete.
     
     TODO: Remove after migration - all tokens should come from UI_GUARD CSS
     ═══════════════════════════════════════════════════════════════════════ */
  theme: {
    extend: {
      colors: {
        /* shadcn/ui compatibility - maps to CSS variables */
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
    },
  },

  plugins: [],
};

export default config;
