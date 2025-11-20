'use client';

import type { ReactNode } from 'react';

interface ReportThemeBridgeProps {
  children: ReactNode;
}

// Provides chart theme tokens derived from Tailwind CSS variables
export function ReportThemeBridge({ children }: ReportThemeBridgeProps) {
  // Read CSS variables from :root to build a theme object for charts
  // Keep it simple: expose via CSS vars on a wrapper to avoid prop drilling
  return (
    <div
      className="[--rp-fg:var(--foreground)] [--rp-bg:var(--background)] [--rp-primary:var(--primary)] [--rp-accent:var(--accent)] [--rp-muted:var(--muted-foreground)] [--rp-border:var(--border)] [--rp-series-1:theme(colors.sky.400)] [--rp-series-2:theme(colors.violet.400)] [--rp-series-3:theme(colors.emerald.400)] [--rp-series-4:theme(colors.amber.400)] [--rp-series-5:theme(colors.rose.400)] [--rp-series-6:theme(colors.indigo.300)] [--rp-heat-positive:theme(colors.sky.400)] [--rp-heat-negative:theme(colors.rose.400)]"
    >
      {children}
    </div>
  );
}

// Optionally export a minimal token reader for client charts
export function getReportThemeFromCSS(): {
  foreground: string;
  background: string;
  primary: string;
  accent: string;
  muted: string;
  border: string;
} {
  const cs = getComputedStyle(document.documentElement);
  const read = (name: string) => cs.getPropertyValue(name).trim() || '#fff';
  return {
    foreground: read('--foreground'),
    background: read('--background'),
    primary: read('--primary'),
    accent: read('--accent'),
    muted: read('--muted'),
    border: read('--border'),
  } as const;
}



