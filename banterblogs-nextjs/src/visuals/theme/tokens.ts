export const chartTokens = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radii: { sm: 4, md: 8 },
  stroke: { thin: 1, normal: 2 },
  grid: { opacity: 0.2 },
  motion: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
  colors: {
    foreground: 'hsl(var(--foreground))',
    background: 'hsl(var(--background))',
    primary: 'hsl(var(--primary))',
    accent: 'hsl(var(--accent))',
    muted: 'hsl(var(--muted))',
    border: 'hsl(var(--border))',
  },
} as const;



