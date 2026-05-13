'use client';

/**
 * Horizontal progress bar for confidence / signal / similarity values
 * in the [0, 1] range. Wears `role="progressbar"` with aria-valuenow
 * for screen readers.
 *
 * - `barClass` overrides the fill color. Defaults: `bg-primary` when
 *   selected, `bg-accent/70` otherwise.
 * - Respects `reducedMotion` via the `transition-[width]` CSS class
 *   being gated to the motion-allowed path.
 *
 * Uses a plain div with CSS `transition: width` rather than
 * framer-motion. The motion approach (initial={{width:0}}) rendered
 * different inline styles on server vs client and tripped React
 * #418 (args=HTML) in production. Plain CSS produces identical SSR
 * markup, and the width animation still plays on every value change.
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
  const transitionClass = reducedMotion ? '' : 'transition-[width] duration-500 ease-out';
  return (
    <div
      className={`${height} w-full rounded-full ${trackClass} overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} confidence`}
    >
      <div
        className={`h-full ${fillClass} ${transitionClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
