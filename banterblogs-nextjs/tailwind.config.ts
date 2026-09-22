import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const MONO_STACK = ["var(--font-mono)", "ui-monospace", "monospace"];

// The parts of the two label roles a fontSize entry cannot carry.
const labelRoles = plugin(({ addUtilities }) => {
  addUtilities({
    ".text-label-13": { fontVariantNumeric: "tabular-nums" },
    ".text-label-12-mono": { fontFamily: MONO_STACK.join(", "), textTransform: "uppercase" },
  });
});

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
    },
    extend: {
      // Motion tokens (pinned by motion.test.ts), from the researched motion
      // brief (2026-09-12): responses stay 150-400ms and read as obvious
      // through size and staging, not length. globals.css mirrors the
      // durations as --duration-* beside the distance, scale, blur, stagger and
      // spring tokens, so all tuning happens in these two places.
      // fast = colour and opacity feedback; press = a pointer press; hover =
      // hover in; base = small parts easing back, overlays, the tab highlight;
      // enter = arrivals, a page rising in, card hover out; route = the page
      // slide; morph = the shared report figure and the landing's push-in;
      // reveal = scroll reveals and the archive entrance; exit = a page
      // leaving; handoff = the pause before the next page fades in. Springs
      // are sampled linear() curves in globals.css.
      transitionDuration: {
        fast: "150ms",
        press: "160ms",
        hover: "200ms",
        base: "250ms",
        enter: "300ms",
        route: "350ms",
        morph: "400ms",
        reveal: "600ms",
        exit: "120ms",
        handoff: "40ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        "strong-out": "cubic-bezier(0.23, 1, 0.32, 1)",
        "strong-in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
        move: "cubic-bezier(0.42, 0, 0.58, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
        "spring-gentle": "var(--ease-spring-gentle)",
        "spring-snappy": "var(--ease-spring-snappy)",
        "spring-bouncy": "var(--ease-spring-bouncy)",
      },
      // Type roles (pinned by designTokens.test.ts), after Geist's names at
      // the sizes R1 and R2 shipped. They extend the default scale, so pages
      // not yet on the roles keep rendering. heading-48 is the page title on
      // every interior page and steps 28 -> 36 -> 48px through
      // --type-heading-48 (globals.css); the two display roles take its
      // weight at the size their surface sets: display-72 on /show, and
      // display-32 in the landing's hero panel, which holds both lines of
      // its heading unbroken at 22px on phones and 32px from md. Titles sit
      // at 540 and headings at 560 on the variable Manrope axis; copy-17 is
      // the page lede; label-13 sets tabular figures and label-12-mono is
      // the one mono eyebrow (labelRoles below).
      fontSize: {
        "display-72": ["var(--type-display-72)", { lineHeight: "0.95", letterSpacing: "-0.04em", fontWeight: "540" }],
        "display-32": ["var(--type-display-32)", { lineHeight: "var(--leading-heading-48)", letterSpacing: "-0.03em", fontWeight: "540" }],
        "heading-48": ["var(--type-heading-48)", { lineHeight: "var(--leading-heading-48)", letterSpacing: "-0.03em", fontWeight: "540" }],
        "heading-32": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "560" }],
        "heading-24": ["1.5rem", { lineHeight: "1.3333", letterSpacing: "-0.02em", fontWeight: "560" }],
        "heading-20": ["1.25rem", { lineHeight: "1.375", letterSpacing: "-0.015em", fontWeight: "560" }],
        // the standfirst under a short page title (/work), at the copy weight
        "copy-24": ["1.5rem", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        "copy-20": ["1.25rem", { lineHeight: "1.45", letterSpacing: "-0.005em" }],
        "copy-18": ["1.125rem", { lineHeight: "1.6" }],
        "copy-17": ["1.0625rem", { lineHeight: "1.6" }],
        "copy-16": ["1rem", { lineHeight: "1.625" }],
        "copy-14": ["0.875rem", { lineHeight: "1.6" }],
        "label-13": ["0.8125rem", { lineHeight: "1.25rem" }],
        "label-12-mono": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.06em", fontWeight: "500" }],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // reading text, brighter than muted (globals.css report page block)
        prose: "hsl(var(--prose))",
        // status hues for badges and dots; ember is primary
        status: {
          green: "hsl(var(--status-green))",
          amber: "hsl(var(--status-amber))",
          blue: "hsl(var(--status-blue))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: MONO_STACK,
      },
    },
  },
  // The typography plugin builds into the reading routes' stylesheet only
  // (tailwind.reading.config.ts), not the sheet every page loads.
  plugins: [labelRoles],
};

export default config;
