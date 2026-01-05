/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        error: {
          bg: 'hsl(var(--error-bg))',
          border: 'hsl(var(--error-border))',
          fg: 'hsl(var(--error-fg))',
        },
        warning: {
          bg: 'hsl(var(--warning-bg))',
          border: 'hsl(var(--warning-border))',
          fg: 'hsl(var(--warning-fg))',
        },
        info: {
          bg: 'hsl(var(--info-bg))',
          border: 'hsl(var(--info-border))',
          fg: 'hsl(var(--info-fg))',
        },
        success: {
          bg: 'hsl(var(--success-bg))',
          border: 'hsl(var(--success-border))',
          fg: 'hsl(var(--success-fg))',
        },
      },
    },
  },
  plugins: [],
};
