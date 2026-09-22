'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { EPISODE_PAGER_ID } from './EpisodeNavigation';

interface MobileNavigationProps {
  prevEpisode?: { slug: string; title: string } | null;
  nextEpisode?: { slug: string; title: string } | null;
  className?: string;
}

// Floating prev/next pill on phones, an opaque raised surface (glass is for
// the header alone). It stays mounted so its enter and exit run in CSS on the
// overlay tokens; while hidden it is inert and ignores the pointer.
const PILL_LINK_CLASS =
  'flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground transition-colors duration-fast ease-standard hover:bg-muted/70 hover:text-foreground';

// the pill shows once the reader has scrolled this share of a screen in
const SHOW_AFTER_VIEWPORT_SHARE = 0.2;
// where its job ends: the in-page pager does the same, and the footer's
// controls sit in the band it covers
const END_MARKERS = `#${EPISODE_PAGER_ID}, footer`;

export function MobileNavigation({ prevEpisode, nextEpisode, className = '' }: MobileNavigationProps) {
  const [scrolledIn, setScrolledIn] = useState(false);
  const [endReached, setEndReached] = useState(false);

  // one read of scrollY and innerHeight a frame, neither of which forces layout
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolledIn(window.scrollY > window.innerHeight * SHOW_AFTER_VIEWPORT_SHARE);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      window.removeEventListener('scroll', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  // reached = in view or already scrolled past; the observer hands over the
  // geometry, so nothing is measured on scroll
  useEffect(() => {
    const markers = [...document.querySelectorAll(END_MARKERS)];
    if (!markers.length || typeof IntersectionObserver === 'undefined') return undefined;
    const reached = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) reached.add(entry.target);
        else reached.delete(entry.target);
      }
      setEndReached(reached.size > 0);
    });
    for (const marker of markers) observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  const isVisible = scrolledIn && !endReached;

  return (
    <div
      inert={isVisible ? undefined : true}
      className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 transition-[opacity,transform] duration-base ease-standard md:hidden ${
        isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
      } ${className}`}
    >
      <div className="floating-surface flex items-center gap-2 rounded-full px-4 py-2">
        {prevEpisode && (
          <a href={`/episodes/${prevEpisode.slug}`} data-navigation="prev" className={PILL_LINK_CLASS}>
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs">Prev</span>
          </a>
        )}

        <div aria-hidden="true" className="h-4 w-px bg-border/60" />

        {nextEpisode && (
          <a href={`/episodes/${nextEpisode.slug}`} data-navigation="next" className={PILL_LINK_CLASS}>
            <span className="text-xs">Next</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
