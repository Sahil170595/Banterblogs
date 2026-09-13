'use client';

import { useEffect, useRef } from 'react';
import { MOTION_ATTRIBUTE } from '@/components/motion/prePaint';

/** the CSS that lets the stylesheet drive the bar on its own */
export const SCROLL_TIMELINE_SUPPORT = 'animation-timeline: scroll()';

/**
 * The 2px copper reading bar under the header. globals.css scales it on a
 * scroll timeline, off the main thread and without JavaScript. Where scroll
 * timelines are missing, a passive scroll listener scales it once a frame
 * instead, and only while motion is armed. Under reduced motion it is not
 * shown at all (report page block in globals.css).
 */
export function ReportProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || (typeof CSS !== 'undefined' && CSS.supports?.(SCROLL_TIMELINE_SUPPORT))) return undefined;
    if (document.documentElement.getAttribute(MOTION_ATTRIBUTE) !== 'on') return undefined;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${range > 0 ? Math.min(1, window.scrollY / range) : 0})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="report-progress" aria-hidden="true">
      <div ref={barRef} className="report-progress-bar" />
    </div>
  );
}
