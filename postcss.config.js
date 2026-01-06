/* ============================================================================
   POSTCSS CONFIGURATION — Tailwind CSS v4
   ============================================================================
   
   Tailwind v4 uses @tailwindcss/postcss instead of the tailwindcss plugin.
   This is the only PostCSS plugin needed - autoprefixer is built-in.
   
   @see https://tailwindcss.com/docs/v4-upgrade
   ============================================================================ */

module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
