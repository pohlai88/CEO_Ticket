# UI CONSTITUTION — Authority Design System

**Date:** January 6, 2026  
**Status:** LOCKED — NON-NEGOTIABLE  
**Purpose:** Prevent visual drift in the authority-based design system  
**Enforcement:** CI + Manual Review

---

## EXECUTIVE SUMMARY

This document defines the **immutable laws** governing the visual system of QuantumNexus.

Any deviation from this constitution is a **violation**, not a "style preference."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  THIS IS NOT A GUIDELINE. THIS IS LAW.                                      │
│  Violations are blocked at CI. No exceptions. No "just this once."          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART I — LANGUAGE LAW

### §1.1 Canonical Verbs (APPROVED)

These are the **only** approved verbs for user-facing actions:

| Context          | FORBIDDEN                         | CANONICAL                                       |
| ---------------- | --------------------------------- | ----------------------------------------------- |
| Authentication   | Login, Sign in, Log in            | **AUTHENTICATE**                                |
| Account Creation | Sign up, Register, Create account | **INITIALIZE**                                  |
| Form Submission  | Submit, Send, Save                | **AUTHORIZE**, **CONFIRM**, **EXECUTE**         |
| Loading States   | Loading, Please wait, Submitting  | **VERIFYING**, **PROVISIONING**, **PROCESSING** |
| Navigation       | Go to, Continue to                | **PROCEED**, **ENTER**                          |
| Cancellation     | Cancel, Go back, Return           | **ABORT**, **RETREAT**                          |

### §1.2 Canonical Nouns (APPROVED)

| Context        | FORBIDDEN                        | CANONICAL                               |
| -------------- | -------------------------------- | --------------------------------------- |
| Email Field    | Email, Email address, Your email | **IDENTITY**                            |
| Password Field | Password, Your password          | **CREDENTIAL**                          |
| Name Field     | Name, Full name, Your name       | **DESIGNATION**                         |
| Progress       | Progress, Loading bar            | **CLEARANCE LEVEL**                     |
| Error          | Error, Problem, Issue            | **CLEARANCE DENIED**, **GENESIS ERROR** |
| Success        | Success, Done, Complete          | **AUTHORIZED**, **INITIALIZED**         |
| Dashboard      | Dashboard, Home, Main            | **COMMAND BRIDGE**                      |
| Organization   | Organization, Company, Team      | **COMMAND NODE**                        |

### §1.3 Forbidden Language Patterns

The following patterns are **NEVER** acceptable:

```
❌ "Welcome back!"
❌ "Hello, [Name]!"
❌ "Thanks for signing up!"
❌ "Oops! Something went wrong"
❌ "Please try again later"
❌ "Click here"
❌ "Learn more"
❌ "Get started"
❌ "It's free!"
❌ Any emoji in auth flows (✨ 🎉 👋 etc.)
```

### §1.4 Approved Language Patterns

```
✅ "Authenticate to access the command bridge."
✅ "Clearance denied."
✅ "Insufficient clearance. Complete all fields."
✅ "Verifying clearance…"
✅ "Provisioning authority…"
✅ "Command node initialized."
✅ "Session not established. Retry authentication."
```

---

## PART II — VISUAL LAW

### §2.1 Color System (IMMUTABLE)

**Primary Accent:** Emerald (`emerald-500`, `emerald-600`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ONE ACCENT COLOR. NO EXCEPTIONS.                                           │
│  No purple. No blue. No orange. No gradients on interactive elements.       │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Use Case        | Color      | Tailwind Class                                       |
| --------------- | ---------- | ---------------------------------------------------- |
| Primary Actions | Emerald    | `bg-emerald-600 hover:bg-emerald-500`                |
| Success States  | Emerald    | `text-emerald-500`, `bg-emerald-500`                 |
| Warning States  | Amber      | `text-amber-500`, `bg-amber-500`                     |
| Error States    | Red        | `text-red-400`, `bg-red-950/30`, `border-red-900/50` |
| Neutral Text    | Gray       | `text-neutral-100` through `text-neutral-600`        |
| Backgrounds     | Near-black | `bg-neutral-950`, `bg-neutral-900`                   |

### §2.2 Background System (IMMUTABLE)

All auth pages and landing MUST include:

1. **Blueprint Grid**

   ```css
   background-image: linear-gradient(
       to right,
       rgba(255, 255, 255, 0.5) 1px,
       transparent 1px
     ), linear-gradient(to bottom, rgba(255, 255, 255, 0.5) 1px, transparent 1px);
   background-size: 48px 48px;
   opacity: 0.04;
   ```

2. **Scan Line** (client component)
   - Duration: 10-12 seconds
   - Easing: `linear` ONLY
   - Color: `rgba(16,185,129,0.03)` to `rgba(16,185,129,0.06)`

### §2.3 Typography System

| Element     | Style                                                         |
| ----------- | ------------------------------------------------------------- |
| Page Titles | `text-xl font-semibold tracking-wide`                         |
| Subtitles   | `text-sm text-neutral-400`                                    |
| Labels      | `text-xs font-mono text-neutral-500 tracking-wider uppercase` |
| Inputs      | `font-mono text-sm`                                           |
| Buttons     | `text-sm font-semibold tracking-wide uppercase`               |
| Body Text   | `text-sm text-neutral-400`                                    |

### §2.4 Input Fields (IMMUTABLE)

```tsx
// CANONICAL INPUT STYLING
className="w-full rounded-lg bg-neutral-950 border border-neutral-800
           px-4 py-3 font-mono text-sm text-neutral-100
           placeholder:text-neutral-600
           focus:outline-none focus:ring-1 focus:ring-emerald-500
           focus:border-emerald-500
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-all"
```

**FORBIDDEN input patterns:**

- White backgrounds
- Rounded-full inputs
- Shadow on inputs
- Colored borders (except emerald on focus)
- Placeholder icons inside inputs

### §2.5 Button System (IMMUTABLE)

**Primary Button:**

```tsx
className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500
           py-3.5 text-sm font-semibold tracking-wide text-white
           transition-all
           disabled:opacity-40 disabled:cursor-not-allowed
           disabled:hover:bg-emerald-600"
```

**Secondary Button:**

```tsx
className="rounded-lg border border-neutral-700 bg-neutral-900
           hover:bg-neutral-800 py-3.5 text-sm font-semibold
           tracking-wide text-neutral-300 transition-all"
```

**FORBIDDEN button patterns:**

- Gradient backgrounds
- Rounded-full buttons in forms
- Shadow-lg on primary buttons (shadow-emerald allowed)
- Outline/ghost as primary action
- Icon-only buttons without aria-label

---

## PART III — MOTION LAW

### §3.1 Approved Easings

| Use Case              | Easing                | Duration      |
| --------------------- | --------------------- | ------------- |
| Page transitions      | `easeOut`             | 500-600ms     |
| Form step transitions | `easeOut`             | 300ms         |
| Progress bars         | `easeOut`             | 400ms         |
| Scan line             | `linear`              | 10-12s        |
| Spinners              | `linear`              | 1s (infinite) |
| Button press          | none or `scale(0.98)` | instant       |

### §3.2 FORBIDDEN Motion Patterns

```
❌ spring() easing
❌ bounce() easing
❌ Elastic animations
❌ Wiggle/shake effects
❌ Confetti
❌ Particle explosions
❌ 3D transforms on forms
❌ Auto-playing video backgrounds
❌ Parallax scrolling on auth pages
```

### §3.3 Deliberate Delay Doctrine

Authentication actions MUST include a **gravitas delay**:

| Action                 | Minimum Delay |
| ---------------------- | ------------- |
| Login submit           | 300-500ms     |
| Signup submit          | 500-700ms     |
| Critical confirmations | 200-400ms     |

**Purpose:** Crossing a boundary should feel weighty, not instant.

---

## PART IV — COMPONENT LAW

### §4.1 AuthShell Requirements

All pages under `/auth/*` MUST:

1. Use `<AuthShell>` wrapper
2. Use `<ClearanceBar>` for progress
3. Not define their own background/grid
4. Not introduce custom colors

### §4.2 Landing Page Requirements

The landing page (`/`) MUST:

1. Have ONE dominant CTA
2. Not contain any form fields
3. Use the same visual system as auth pages
4. Minimize secondary paths

### §4.3 Form Requirements

All forms MUST:

1. Show clearance/progress bar
2. Disable submit until 100% clearance
3. Show monospace labels in UPPERCASE
4. Use canonical language only

---

## PART V — FORBIDDEN PATTERNS (BLOCKLIST)

### §5.1 Visual Violations

```
❌ White/light mode on auth pages
❌ Multiple accent colors
❌ Gradients as interactive element backgrounds
❌ Card shadows heavier than shadow-2xl
❌ Borders thicker than 1px on inputs
❌ Non-monospace labels
❌ Centered labels (must be left-aligned)
❌ Inline validation (use clearance bar instead)
```

### §5.2 Behavioral Violations

```
❌ Instant form submission (no delay)
❌ Auto-submit on last field
❌ Confetti/celebration on success
❌ Modal dialogs in auth flow
❌ Tooltips on form fields
❌ "Show password" as checkbox (use icon toggle)
```

### §5.3 Language Violations

```
❌ First-person plural ("We", "Our")
❌ Exclamation marks in system messages
❌ Casual contractions ("don't", "can't", "won't")
❌ Questions as headings ("Ready to get started?")
❌ Time estimates ("This will take 2 minutes")
```

---

## PART VI — ENFORCEMENT

### §6.1 CI Checks

The following MUST be enforced at CI:

1. **Language scan:** Grep for forbidden patterns in TSX files
2. **Color scan:** No unauthorized color classes
3. **Motion scan:** No spring/bounce/elastic in framer-motion usage
4. **AuthShell usage:** All `/auth/*` pages import AuthShell

### §6.2 Review Checklist

Before merging any UI change:

- [ ] Uses canonical language only
- [ ] Single accent color (emerald)
- [ ] Monospace uppercase labels
- [ ] ClearanceBar for progress
- [ ] Gravitas delay on submit
- [ ] No forbidden motion patterns
- [ ] AuthShell wrapper (if auth page)

### §6.3 Violation Response

| Severity           | Response               |
| ------------------ | ---------------------- |
| Language violation | Block merge            |
| Color violation    | Block merge            |
| Motion violation   | Block merge            |
| Missing AuthShell  | Block merge            |
| Minor formatting   | Warning + fix required |

---

## PART VII — CANONICAL IMPORTS

### §7.1 Auth Components

```tsx
import { AuthShell, ClearanceBar } from "@/components/auth";
```

### §7.2 Motion

```tsx
import { motion, AnimatePresence } from "framer-motion";
```

### §7.3 Icons

```tsx
import {
  Command,
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
```

---

## APPENDIX A — Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTHORITY DESIGN SYSTEM — QUICK REFERENCE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  COLORS:        emerald (accent), neutral (everything else), red (error)   │
│  BACKGROUND:    neutral-950, 48px grid at 4% opacity, scan line           │
│  TYPOGRAPHY:    monospace labels, tracking-wide, UPPERCASE                 │
│  MOTION:        easeOut only, linear for loops, 300-600ms                  │
│  DELAY:         300-500ms on auth submit (gravitas)                        │
│                                                                             │
│  APPROVED VERBS:                                                           │
│    AUTHENTICATE, AUTHORIZE, INITIALIZE, PROCEED, VERIFY, PROVISION        │
│                                                                             │
│  FORBIDDEN:                                                                │
│    Login, Sign up, Welcome, Oops, Please, Click here, Get started         │
│    spring(), bounce(), gradients, white backgrounds, emojis                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CHANGELOG

| Date       | Change                           | Author |
| ---------- | -------------------------------- | ------ |
| 2026-01-06 | Initial constitution established | System |

---

**END OF CONSTITUTION**

_This document is immutable. Changes require architectural review._
