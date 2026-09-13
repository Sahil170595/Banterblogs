'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { MOTION_ATTRIBUTE } from '@/components/motion/prePaint';

// Scroll-spy for the report contents. An IntersectionObserver, not a scroll
// handler, marks the entry being read (aria-current="location") and moves the
// copper marker to it with a transform, written straight onto the marker;
// globals.css eases it over the base token on strong-out, and not at all
// under reduced motion. It watches the headings and every block between them:
// the blocks tile the body, so any scroll or jump changes what crosses the
// activation band and the answer is re-read, even where no heading is near.

/** a heading becomes the one being read once it rises past this share of the viewport */
export const ACTIVATION_LINE = 0.3;
/** marks the end of the report body; once it is on screen, the last section on screen is being read */
export const REPORT_END_ATTRIBUTE = 'data-report-end';
export const CURRENT_ATTRIBUTE = 'aria-current';
export const CURRENT_VALUE = 'location';
export const MARKER_PLACED_ATTRIBUTE = 'data-placed';

// the last heading at or above the line
function headingBeingRead(headings: HTMLElement[], line: number): HTMLElement | null {
  let found: HTMLElement | null = null;
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top > line) break;
    found = heading;
  }
  return found;
}

export function ReportTocSpy({ ids, children }: { ids: string[]; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const marker = markerRef.current;
    if (!track || !marker || typeof IntersectionObserver === 'undefined') return undefined;
    const headings = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (!headings.length) return undefined;
    const byHref = new Map([...track.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].map((link) => [link.getAttribute('href')!.slice(1), link]));
    const links = new Map(headings.map((heading) => [heading.id, byHref.get(heading.id) ?? null]));
    const scroller = track.closest<HTMLElement>('[data-toc-scroller]');
    let active: string | null = null;
    let endInView = false;
    let placing = 0;

    const keepInView = (link: HTMLElement) => {
      if (!scroller) return;
      const box = scroller.getBoundingClientRect();
      const at = link.getBoundingClientRect();
      if (at.top >= box.top && at.bottom <= box.bottom) return;
      const smooth = document.documentElement.getAttribute(MOTION_ATTRIBUTE) === 'on';
      scroller.scrollBy({ top: at.top - box.top - scroller.clientHeight / 3, behavior: smooth ? 'smooth' : 'auto' });
    };

    const update = () => {
      const line = endInView ? window.innerHeight : window.innerHeight * ACTIVATION_LINE;
      const id = headingBeingRead(headings, line)?.id ?? null;
      if (id === active) return;
      if (active) links.get(active)?.removeAttribute(CURRENT_ATTRIBUTE);
      active = id;
      const link = id ? links.get(id) : null;
      if (!link) {
        marker.removeAttribute(MARKER_PLACED_ATTRIBUTE);
        return;
      }
      link.setAttribute(CURRENT_ATTRIBUTE, CURRENT_VALUE);
      marker.style.transform = `translateY(${Math.round(link.offsetTop + (link.offsetHeight - marker.offsetHeight) / 2)}px)`;
      // placed without easing the first time, so it never slides in from the top
      if (!marker.hasAttribute(MARKER_PLACED_ATTRIBUTE)) placing = requestAnimationFrame(() => marker.setAttribute(MARKER_PLACED_ATTRIBUTE, ''));
      keepInView(link);
    };

    // the band above the activation line: headings and the blocks between them crossing it
    const band = new IntersectionObserver(update, { rootMargin: `0px 0px -${Math.round((1 - ACTIVATION_LINE) * 100)}% 0px` });
    const bodies = new Set(headings.map((heading) => heading.parentElement).filter((el): el is HTMLElement => el !== null));
    for (const body of bodies) for (const block of body.children) band.observe(block);
    const end = document.querySelector(`[${REPORT_END_ATTRIBUTE}]`);
    const tail = new IntersectionObserver((entries) => {
      endInView = entries.some((entry) => entry.isIntersecting);
      update();
    });
    if (end) tail.observe(end);
    update();

    return () => {
      band.disconnect();
      tail.disconnect();
      cancelAnimationFrame(placing);
    };
  }, [ids]);

  return (
    <div ref={trackRef} className="report-toc-track">
      <span ref={markerRef} className="report-toc-marker" aria-hidden="true" />
      {children}
    </div>
  );
}
