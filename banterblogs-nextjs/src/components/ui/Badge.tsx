import type { ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const BADGE_TONES = ['neutral', 'ember', 'green', 'amber', 'blue'] as const;
export type BadgeTone = (typeof BADGE_TONES)[number];

// Status colours come from the theme (--status-* in globals.css); a tint
// behind the label, no border.
const badge = cva('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-label-12-mono', {
  variants: {
    tone: {
      neutral: 'bg-foreground/10 text-foreground/80',
      ember: 'bg-primary/15 text-primary',
      green: 'bg-status-green/15 text-status-green',
      amber: 'bg-status-amber/15 text-status-amber',
      blue: 'bg-status-blue/15 text-status-blue',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

/** The tone each paper status reads in: presented, public preprint, under review, in preparation. */
export const PAPER_STATUS_TONE = {
  Presented: 'green',
  Preprint: 'blue',
  Submitted: 'amber',
  'In preparation': 'neutral',
  Synthesis: 'neutral',
  'Pre-execution': 'neutral',
} as const satisfies Record<string, BadgeTone>;

export interface BadgeProps {
  tone?: BadgeTone;
  /** a leading dot in the badge's colour */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone, dot = false, className, children }: BadgeProps) {
  return (
    <span className={cn(badge({ tone }), className)}>
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}
