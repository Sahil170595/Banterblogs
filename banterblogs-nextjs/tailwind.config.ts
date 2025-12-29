import type { Config } from "tailwindcss";

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
    extend: {
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
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.5s ease-out",
        "slide-left": "slideLeft 0.5s ease-out",
        "slide-right": "slideRight 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "scale-out": "scaleOut 0.3s ease-in",
        "bounce-in": "bounceIn 0.6s ease-out",
        "wiggle": "wiggle 1s ease-in-out infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "gradient-shift": "gradientShift 3s ease infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite alternate",
        "shimmer": "shimmer 2s linear infinite",
        "morph": "morph 8s ease-in-out infinite",
        "liquid-flow": "liquidFlow 4s ease-in-out infinite",
        "magnetic-pulse": "magneticPulse 2s ease-in-out infinite",
        "particle-float": "particleFloat 6s ease-in-out infinite",
        "text-reveal": "textReveal 1s ease-out",
        "gradient-x": "gradient-x 15s ease infinite",
        "gradient-y": "gradient-y 15s ease infinite",
        "gradient-xy": "gradient-xy 15s ease infinite",
        "spin-slow": "spin 3s linear infinite",
        "bounce-subtle": "bounceSubtle 2s ease-in-out infinite",
        "glow-subtle": "glowSubtle 3s ease-in-out infinite",
        "float-gentle": "floatGentle 4s ease-in-out infinite",
        "pulse-gentle": "pulseGentle 2s ease-in-out infinite",
        "wiggle-gentle": "wiggleGentle 2s ease-in-out infinite",
        "scale-gentle": "scaleGentle 2s ease-in-out infinite",
        "rotate-gentle": "rotateGentle 3s ease-in-out infinite",
        "slide-gentle": "slideGentle 3s ease-in-out infinite",
        "fade-gentle": "fadeGentle 2s ease-in-out infinite",
        "glow-intense": "glowIntense 1.5s ease-in-out infinite alternate",
        "morph-complex": "morphComplex 6s ease-in-out infinite",
        "liquid-complex": "liquidComplex 5s ease-in-out infinite",
        "particle-complex": "particleComplex 8s ease-in-out infinite",
        "text-complex": "textComplex 2s ease-in-out infinite",
        "gradient-complex": "gradientComplex 4s ease-in-out infinite",
        "magnetic-complex": "magneticComplex 3s ease-in-out infinite",
        "shimmer-complex": "shimmerComplex 3s linear infinite",
        "pulse-complex": "pulseComplex 2.5s ease-in-out infinite",
        "float-complex": "floatComplex 5s ease-in-out infinite",
        "bounce-complex": "bounceComplex 2s ease-in-out infinite",
        "rotate-complex": "rotateComplex 4s ease-in-out infinite",
        "scale-complex": "scaleComplex 3s ease-in-out infinite",
        "slide-complex": "slideComplex 4s ease-in-out infinite",
        "fade-complex": "fadeComplex 3s ease-in-out infinite",
        "glow-complex": "glowComplex 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideLeft: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideRight: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        scaleOut: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0)", opacity: "0" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)", opacity: "0.8" },
          "70%": { transform: "scale(0.9)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        glowPulse: {
          "0%": { boxShadow: "0 0 20px hsl(var(--accent) / 0.3)" },
          "100%": { boxShadow: "0 0 40px hsl(var(--accent) / 0.6)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        morph: {
          "0%, 100%": { borderRadius: "20px" },
          "25%": { borderRadius: "30px 20px 30px 20px" },
          "50%": { borderRadius: "20px 30px 20px 30px" },
          "75%": { borderRadius: "30px 20px 30px 20px" },
        },
        liquidFlow: {
          "0%": { transform: "translateX(-100%) rotate(0deg)" },
          "50%": { transform: "translateX(0%) rotate(180deg)" },
          "100%": { transform: "translateX(100%) rotate(360deg)" },
        },
        magneticPulse: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        particleFloat: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px) rotate(0deg)" },
          "25%": { transform: "translateY(-20px) translateX(10px) rotate(90deg)" },
          "50%": { transform: "translateY(-10px) translateX(-5px) rotate(180deg)" },
          "75%": { transform: "translateY(-30px) translateX(15px) rotate(270deg)" },
        },
        textReveal: {
          "0%": { clipPath: "inset(0 100% 0 0)" },
          "100%": { clipPath: "inset(0 0 0 0)" },
        },
        "gradient-x": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center"
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center"
          },
        },
        "gradient-y": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "center top"
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "center bottom"
          },
        },
        "gradient-xy": {
          "0%, 100%": {
            "background-size": "400% 400%",
            "background-position": "left center"
          },
          "50%": {
            "background-size": "400% 400%",
            "background-position": "right center"
          },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        glowSubtle: {
          "0%, 100%": { boxShadow: "0 0 10px hsl(var(--accent) / 0.2)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--accent) / 0.4)" },
        },
        floatGentle: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-8px) rotate(2deg)" },
        },
        pulseGentle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        wiggleGentle: {
          "0%, 100%": { transform: "rotate(-1deg)" },
          "50%": { transform: "rotate(1deg)" },
        },
        scaleGentle: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
        rotateGentle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "50%": { transform: "rotate(5deg)" },
        },
        slideGentle: {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(3px)" },
        },
        fadeGentle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.9" },
        },
        glowIntense: {
          "0%": { boxShadow: "0 0 30px hsl(var(--accent) / 0.5)" },
          "100%": { boxShadow: "0 0 60px hsl(var(--accent) / 0.8)" },
        },
        morphComplex: {
          "0%, 100%": { borderRadius: "20px", transform: "scale(1)" },
          "25%": { borderRadius: "30px 20px 30px 20px", transform: "scale(1.02)" },
          "50%": { borderRadius: "20px 30px 20px 30px", transform: "scale(1)" },
          "75%": { borderRadius: "30px 20px 30px 20px", transform: "scale(0.98)" },
        },
        liquidComplex: {
          "0%": { transform: "translateX(-100%) rotate(0deg) scale(1)" },
          "25%": { transform: "translateX(-50%) rotate(90deg) scale(1.1)" },
          "50%": { transform: "translateX(0%) rotate(180deg) scale(1)" },
          "75%": { transform: "translateX(50%) rotate(270deg) scale(0.9)" },
          "100%": { transform: "translateX(100%) rotate(360deg) scale(1)" },
        },
        particleComplex: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px) rotate(0deg) scale(1)" },
          "25%": { transform: "translateY(-25px) translateX(15px) rotate(90deg) scale(1.1)" },
          "50%": { transform: "translateY(-15px) translateX(-10px) rotate(180deg) scale(0.9)" },
          "75%": { transform: "translateY(-35px) translateX(20px) rotate(270deg) scale(1.2)" },
        },
        textComplex: {
          "0%": { clipPath: "inset(0 100% 0 0)", transform: "scale(1)" },
          "50%": { clipPath: "inset(0 50% 0 0)", transform: "scale(1.05)" },
          "100%": { clipPath: "inset(0 0 0 0)", transform: "scale(1)" },
        },
        gradientComplex: {
          "0%, 100%": { backgroundPosition: "0% 50%", backgroundSize: "200% 200%" },
          "25%": { backgroundPosition: "25% 25%", backgroundSize: "300% 300%" },
          "50%": { backgroundPosition: "100% 50%", backgroundSize: "200% 200%" },
          "75%": { backgroundPosition: "75% 75%", backgroundSize: "300% 300%" },
        },
        magneticComplex: {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "25%": { transform: "scale(1.05) rotate(1deg)" },
          "50%": { transform: "scale(1.1) rotate(0deg)" },
          "75%": { transform: "scale(1.05) rotate(-1deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        shimmerComplex: {
          "0%": { transform: "translateX(-100%) scale(1)" },
          "50%": { transform: "translateX(0%) scale(1.1)" },
          "100%": { transform: "translateX(100%) scale(1)" },
        },
        pulseComplex: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "25%": { transform: "scale(1.05)", opacity: "0.9" },
          "50%": { transform: "scale(1.1)", opacity: "0.8" },
          "75%": { transform: "scale(1.05)", opacity: "0.9" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        floatComplex: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg) scale(1)" },
          "25%": { transform: "translateY(-12px) rotate(2deg) scale(1.02)" },
          "50%": { transform: "translateY(-8px) rotate(0deg) scale(1)" },
          "75%": { transform: "translateY(-15px) rotate(-2deg) scale(0.98)" },
        },
        bounceComplex: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "25%": { transform: "translateY(-8px) scale(1.05)" },
          "50%": { transform: "translateY(-4px) scale(1)" },
          "75%": { transform: "translateY(-12px) scale(0.95)" },
        },
        rotateComplex: {
          "0%, 100%": { transform: "rotate(0deg) scale(1)" },
          "25%": { transform: "rotate(90deg) scale(1.1)" },
          "50%": { transform: "rotate(180deg) scale(1)" },
          "75%": { transform: "rotate(270deg) scale(0.9)" },
        },
        scaleComplex: {
          "0%, 100%": { transform: "scale(1) rotate(0deg)" },
          "25%": { transform: "scale(1.1) rotate(5deg)" },
          "50%": { transform: "scale(1.05) rotate(0deg)" },
          "75%": { transform: "scale(0.95) rotate(-5deg)" },
        },
        slideComplex: {
          "0%, 100%": { transform: "translateX(0) scale(1)" },
          "25%": { transform: "translateX(10px) scale(1.02)" },
          "50%": { transform: "translateX(0) scale(1)" },
          "75%": { transform: "translateX(-10px) scale(0.98)" },
        },
        fadeComplex: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "25%": { opacity: "0.8", transform: "scale(1.05)" },
          "50%": { opacity: "0.9", transform: "scale(1)" },
          "75%": { opacity: "0.7", transform: "scale(0.95)" },
        },
        glowComplex: {
          "0%": { boxShadow: "0 0 20px hsl(var(--accent) / 0.3)", transform: "scale(1)" },
          "25%": { boxShadow: "0 0 40px hsl(var(--accent) / 0.5)", transform: "scale(1.02)" },
          "50%": { boxShadow: "0 0 60px hsl(var(--accent) / 0.7)", transform: "scale(1)" },
          "75%": { boxShadow: "0 0 40px hsl(var(--accent) / 0.5)", transform: "scale(0.98)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
