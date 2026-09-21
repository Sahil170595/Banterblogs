import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

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
      // enter = arrivals and card hover out; route = the page slide; morph =
      // the shared title; reveal = scroll reveals and the archive entrance;
      // exit = a page leaving; handoff = the pause before the next page fades
      // in. Springs are sampled linear() curves in globals.css.
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
        handoff: "100ms",
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
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [typography],
};

export default config;
