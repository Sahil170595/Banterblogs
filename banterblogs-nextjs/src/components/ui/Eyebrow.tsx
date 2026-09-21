import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { BadgeTone } from './Badge';

const DOT_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-muted-foreground',
  ember: 'bg-primary',
  green: 'bg-status-green',
  amber: 'bg-status-amber',
  blue: 'bg-status-blue',
};

export interface EyebrowProps {
  as?: 'p' | 'span' | 'h2' | 'h3' | 'div';
  /** a status dot before the label */
  dot?: BadgeTone;
  className?: string;
  children: ReactNode;
}

/** The one mono label: 12px, +0.06em, uppercase (text-label-12-mono). */
export function Eyebrow({ as: Tag = 'p', dot, className, children }: EyebrowProps) {
  return (
    <Tag className={cn('text-label-12-mono text-muted-foreground', dot && 'inline-flex items-center gap-2', className)}>
      {dot && <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_TONE[dot])} />}
      {children}
    </Tag>
  );
}
