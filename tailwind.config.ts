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

  /* ═══════════════════════════════════════════════════════════════════════
     HYBRID MODE — TAILWIND v4 CSS-FIRST APPROACH
     ═══════════════════════════════════════════════════════════════════════
     
     In Tailwind v4, corePlugins restrictions are handled via CSS, not config.
     The nexus_input_v2.css defines semantic tokens in @theme blocks.
     
     Enforcement happens via:
     1. nx:check script — scans for forbidden patterns (bg-gray-*, text-red-*)
     2. CI gate — blocks PRs with violations
     3. ESLint canonical-purity — prevents hardcoded values
     
     Layout utilities (flex, grid, position) remain fully available.
     Design tokens (colors, shadows, typography) come from CSS variables.
     
     @see .ui_preview/Nexus_tailwind.config.ts (v3 reference, not applicable to v4)
     ═══════════════════════════════════════════════════════════════════════ */

  plugins: [],
};

export default config;
