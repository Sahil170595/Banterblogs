'use client';

import { motion } from 'framer-motion';

/**
 * Horizontal progress bar for confidence / signal / similarity values
 * in the [0, 1] range. Wears `role="progressbar"` with aria-valuenow
 * for screen readers.
 *
 * - `barClass` overrides the fill color. Defaults: `bg-primary` when
 *   selected, `bg-accent/70` otherwise.
 * - Respects `reducedMotion` — bar fills instantly when set.
 */
export function ConfidenceBar({
  value,
  label,
  isSelected = false,
  reducedMotion,
  barClass,
  trackClass = 'bg-border/30',
  className = '',
  height = 'h-1',
}: {
  value: number;
  label: string;
  isSelected?: boolean;
  reducedMotion: boolean;
  barClass?: string;
  trackClass?: string;
  className?: string;
  height?: string;
}) {
  const pct = Math.round(Math.min(100, Math.max(0, value * 100)));
  const fillClass = barClass ?? (isSelected ? 'bg-primary' : 'bg-accent/70');
  return (
    <div
      className={`${height} w-full rounded-full ${trackClass} overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} confidence`}
    >
      <motion.div
        initial={reducedMotion ? { width: `${pct}%` } : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className={`h-full ${fillClass}`}
      />
    </div>
  );
}
