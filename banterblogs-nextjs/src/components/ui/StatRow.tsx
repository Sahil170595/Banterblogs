import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Stat {
  value: ReactNode;
  label: ReactNode;
}

export interface StatRowProps {
  /** names the list for assistive tech */
  label: string;
  items: Stat[];
  className?: string;
}

/** Stats inline, the /reports head pattern: a tabular value in the foreground, then its label. */
export function StatRow({ label, items, className }: StatRowProps) {
  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-x-5 gap-y-1 text-label-13 text-muted-foreground', className)}>
      {items.map((item, index) => (
        <li key={index}>
          <span className="font-semibold text-foreground">{item.value}</span> {item.label}
        </li>
      ))}
    </ul>
  );
}
