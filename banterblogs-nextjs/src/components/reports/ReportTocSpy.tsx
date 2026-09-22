'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { MOTION_ATTRIBUTE } from '@/components/motion/prePaint';
import { REPORT_END_ATTRIBUTE } from './reportEnd';

// Scroll-spy for the report contents. IntersectionObservers, not a scroll
// handler, mark the entry being read (aria-current="location") and move the
// copper marker to it with a transform, written straight onto the marker;
// globals.css eases it over the base token on strong-out, and not at all
// under reduced motion. They watch the headings and every block between them:
// the blocks tile the body, so any scroll or jump changes what crosses the
// activation band. The observer callbacks read no layout; what is in the band
// comes from their entries, and the section being read is the section of the
// last element there. One frame then reads the contents, then writes.

/** a heading becomes the one being read once it rises past this share of the viewport */
export const ACTIVATION_LINE = 0.3;
/** the end-of-body marker (reportEnd.tsx), for callers of the spy */
export { REPORT_END_ATTRIBUTE };
export const CURRENT_ATTRIBUTE = 'aria-current';
export const CURRENT_VALUE = 'location';
export const MARKER_PLACED_ATTRIBUTE = 'data-placed';

type Intersecting = Set<Element>;

function updateIntersecting(set: Intersecting, entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    if (entry.isIntersecting) set.add(entry.target);
    else set.delete(entry.target);
  }
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
    // the phone layout hides the sidebar: nothing to follow there
    const nav = track.closest('nav');

    // every watched element in document order, with the heading of its section
    const headingIds = new Set(headings.map((heading) => heading.id));
    const bodies = new Set(headings.map((heading) => heading.parentElement).filter((el): el is HTMLElement => el !== null));
    const blocks = [...bodies].flatMap((body) => [...body.children]);
    const order = new Map<Element, number>();
    const sectionOf = new Map<Element, string | null>();
    let section: string | null = null;
    blocks.forEach((block, index) => {
      if (headingIds.has(block.id)) section = block.id;
      order.set(block, index);
      sectionOf.set(block, section);
    });

    const inBand: Intersecting = new Set();
    const inView: Intersecting = new Set();
    let endInView = false;
    let active: string | null = null;
    let frame = 0;
    let placing = 0;

    // the section of the last element in the band, or on screen once the end of the report is
    const sectionBeingRead = () => {
      let last: Element | null = null;
      for (const el of endInView ? inView : inBand) {
        if (last === null || (order.get(el) ?? -1) > (order.get(last) ?? -1)) last = el;
      }
      return last ? (sectionOf.get(last) ?? null) : null;
    };

    const apply = () => {
      frame = 0;
      const id = sectionBeingRead();
      if (id === active) return;
      // reads, all before any write
      if (nav !== null && getComputedStyle(nav).display === 'none') return;
      const link = id ? links.get(id) : null;
      const markerTop = link ? Math.round(link.offsetTop + (link.offsetHeight - marker.offsetHeight) / 2) : 0;
      const box = scroller && link ? scroller.getBoundingClientRect() : null;
      const at = box && link ? link.getBoundingClientRect() : null;
      const scrollerHeight = scroller ? scroller.clientHeight : 0;
      // writes
      if (active) links.get(active)?.removeAttribute(CURRENT_ATTRIBUTE);
      active = id;
      if (!link) {
        marker.removeAttribute(MARKER_PLACED_ATTRIBUTE);
        return;
      }
      link.setAttribute(CURRENT_ATTRIBUTE, CURRENT_VALUE);
      marker.style.transform = `translateY(${markerTop}px)`;
      // placed without easing the first time, so it never slides in from the top
      if (!marker.hasAttribute(MARKER_PLACED_ATTRIBUTE)) placing = requestAnimationFrame(() => marker.setAttribute(MARKER_PLACED_ATTRIBUTE, ''));
      if (scroller && box && at && (at.top < box.top || at.bottom > box.bottom)) {
        const smooth = document.documentElement.getAttribute(MOTION_ATTRIBUTE) === 'on';
        scroller.scrollBy({ top: at.top - box.top - scrollerHeight / 3, behavior: smooth ? 'smooth' : 'auto' });
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    // the band above the activation line, and the whole viewport for the end of the report
    const band = new IntersectionObserver(
      (entries) => {
        updateIntersecting(inBand, entries);
        schedule();
      },
      { rootMargin: `0px 0px -${Math.round((1 - ACTIVATION_LINE) * 100)}% 0px` },
    );
    const view = new IntersectionObserver((entries) => {
      updateIntersecting(inView, entries);
      schedule();
    });
    for (const block of blocks) {
      band.observe(block);
      view.observe(block);
    }
    const end = document.querySelector(`[${REPORT_END_ATTRIBUTE}]`);
    const tail = new IntersectionObserver((entries) => {
      endInView = entries.some((entry) => entry.isIntersecting);
      schedule();
    });
    if (end) tail.observe(end);

    return () => {
      band.disconnect();
      view.disconnect();
      tail.disconnect();
      cancelAnimationFrame(frame);
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
