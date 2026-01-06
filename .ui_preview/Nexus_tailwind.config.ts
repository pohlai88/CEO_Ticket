/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./scripts/**/*.ts",
    "./ui/**/*.html",
    "./ui/**/*.css",
    "./apps/portal/**/*.tsx",
    "./apps/portal/**/*.ts",
  ],

  /**
   * NEXUS DESIGN CONSTITUTION v1.0.0
   * 
   * Theme extensions reference Nexus tokens from canonical.ts
   * All tokens use --nx-* prefix for namespace isolation
   */
  theme: {
    extend: {
      // Spacing uses NX tokens from input.css via canonical.ts
      spacing: {
        0: 'var(--nx-space-0)',
        1: 'var(--nx-space-1)',
        2: 'var(--nx-space-2)',
        3: 'var(--nx-space-3)',
        4: 'var(--nx-space-4)',
        5: 'var(--nx-space-5)',
        6: 'var(--nx-space-6)',
        8: 'var(--nx-space-8)',
        10: 'var(--nx-space-10)',
        12: 'var(--nx-space-12)',
        16: 'var(--nx-space-16)',
      },
      // Sizing tokens from canonical.ts
      width: {
        'shell': 'var(--nx-width-shell)',
        'nav': 'var(--nx-width-nav)',
        'content': 'var(--nx-width-content)',
      },
      height: {
        'header': 'var(--nx-height-header)',
        'row': 'var(--nx-height-row)',
      },
      maxWidth: {
        'shell': 'var(--nx-width-shell)',
        'content': 'var(--nx-width-content)',
        'prose': 'var(--nx-width-prose)',
      },
    },
  },

  /**
   * HYBRID MODE — LAYOUT FREEDOM + DESIGN SYSTEM LOCK
   * 
   * PHILOSOPHY:
   * - ✅ Layout utilities ENABLED (flex, grid, position) - rapid prototyping
   * - ❌ Design tokens LOCKED (colors, spacing, shadows) - P1-P10 enforced
   * 
   * RESULT:
   * - Developers can use Tailwind layout patterns from shadcn/community
   * - Design system prevents color/spacing/shadow drift via input.css tokens
   * - Best of both worlds: speed + discipline
   */
  corePlugins: {
    // ✅ LAYOUT — ENABLED (composable utilities for rapid prototyping)
    display: true,           // flex, grid, block, inline, hidden
    flexbox: true,           // flex-row, items-center, justify-between
    grid: true,              // grid-cols-3, gap-4 (gap values from P4)
    position: true,          // relative, absolute, fixed, sticky
    inset: true,             // top-0, left-0 (values from P4)
    overflow: true,          // overflow-hidden, overflow-auto
    alignContent: true,      // content-center, content-between
    alignItems: true,        // items-start, items-center
    alignSelf: true,         // self-start, self-center
    justifyContent: true,    // justify-start, justify-center
    justifyItems: true,      // justify-items-center
    justifySelf: true,       // justify-self-center
    flex: true,              // flex-1, flex-auto
    flexDirection: true,     // flex-row, flex-col
    flexGrow: true,          // grow, grow-0
    flexShrink: true,        // shrink, shrink-0
    flexWrap: true,          // flex-wrap, flex-nowrap
    gridAutoColumns: true,   // auto-cols-auto
    gridAutoFlow: true,      // grid-flow-row
    gridAutoRows: true,      // auto-rows-auto
    gridColumn: true,        // col-span-3
    gridColumnEnd: true,     // col-end-3
    gridColumnStart: true,   // col-start-1
    gridRow: true,           // row-span-2
    gridRowEnd: true,        // row-end-2
    gridRowStart: true,      // row-start-1
    gridTemplateColumns: true, // grid-cols-12
    gridTemplateRows: true,  // grid-rows-3
    order: true,             // order-1, order-last

    // ✅ SPACING — ENABLED but values from @theme (P4 tokens)
    padding: true,           // p-4, px-6 (uses --space-* from P4)
    margin: true,            // m-4, mx-auto (uses --space-* from P4)
    space: true,             // space-x-4, space-y-2
    gap: true,               // gap-4, gap-x-2

    // ✅ SIZING — ENABLED but values from @theme (P5 tokens)
    width: true,             // w-full, w-64 (uses --width-* from P5)
    height: true,            // h-full, h-screen
    minWidth: true,          // min-w-0, min-w-full
    minHeight: true,         // min-h-screen
    maxWidth: true,          // max-w-prose, max-w-7xl
    maxHeight: true,         // max-h-screen

    // ❌ SHAPE — LOCKED to P6 (use rounded-* from input.css)
    borderRadius: false,
    borderWidth: false,

    // ❌ ELEVATION — LOCKED to P7 (use shadow-* from input.css)
    boxShadow: false,
    zIndex: false,

    // ❌ COLORS — LOCKED to P2 (use bg-*, text-*, border-* from input.css)
    backgroundColor: false,
    textColor: false,
    borderColor: false,

    // ❌ TYPOGRAPHY — LOCKED to P3 (use text-*, font-* from input.css)
    fontSize: false,
    fontWeight: false,
    lineHeight: false,
    letterSpacing: false,

    // ❌ MOTION — LOCKED to P8 (use duration-* from input.css)
    transitionDuration: false,
    transitionTimingFunction: false,
    transitionDelay: false,
    animation: false,
  },

  plugins: [],
}
