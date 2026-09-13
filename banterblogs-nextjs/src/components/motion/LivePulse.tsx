'use client';

import { useCallback } from 'react';

/**
 * A live-state dot and its label. The ring pulses only while motion is armed
 * (html[data-motion="on"], see prePaint.ts) and the dot is on screen; this
 * observer pauses it offscreen.
 */
export function LivePulse({ label }: { label: string }) {
  const watch = useCallback((dot: HTMLSpanElement | null) => {
    if (!dot || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      dot.dataset.inview = String(entry.isIntersecting);
    });
    observer.observe(dot);
    return () => observer.disconnect();
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
      <span ref={watch} className="live-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
