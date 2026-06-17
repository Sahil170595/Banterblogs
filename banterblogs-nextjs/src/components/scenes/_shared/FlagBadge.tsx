'use client';

import type { ReactNode } from 'react';
import { Flag } from 'lucide-react';

/**
 * Pill badge for surfacing structural risk / boundary / fired-rule
 * flags inside a scene. `tone` controls the color: `risk` = ember
 * (primary), `info` = accent.
 */
export function FlagBadge({
  children,
  tone = 'risk',
}: {
  children: ReactNode;
  tone?: 'risk' | 'info';
}) {
  const cls =
    tone === 'risk'
      ? 'border-primary/60 bg-primary/10 text-primary'
      : 'border-accent/40 bg-accent/10 text-accent';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border ${cls} px-1.5 py-0.5 text-[11px] font-mono`}
    >
      <Flag className="h-2.5 w-2.5" aria-hidden />
      {children}
    </span>
  );
}
