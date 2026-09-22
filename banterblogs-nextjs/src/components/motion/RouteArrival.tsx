'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CV_ATTRIBUTE, CV_OFF } from './contentVisibility';

// How long after a Back/Forward the page it reaches may take to commit; the
// router renders the page it goes back to within a few hundred ms locally
const TRAVERSAL_COMMIT_WINDOW_MS = 1500;

// The Navigation API's navigate event, where the browser has it (Chromium).
type NavigateEvent = Event & { navigationType?: string };

/**
 * Settles how a new page arrives, in the commit that shows it. It sits
 * ahead of the page in the root layout, so its layout effect runs before the
 * router's scroll in the same commit.
 * - Off-screen skipping (contentVisibility.ts), off for the rest of a page
 *   view once the pre-paint gate turns it off, goes back on, so the next page
 *   opens at a screen's cost; a page reached at a #fragment keeps it off,
 *   because the router scrolls there next.
 * - The page starts at the top, at once. The router leaves the scroll alone
 *   when the new page's top is already in view, so a smooth focus scroll
 *   still running from the last page ran on into this one. A #fragment only
 *   stops that scroll where it is; Back and Forward keep what the history
 *   restores.
 */
export function RouteArrival() {
  const pathname = usePathname();
  const shownPath = useRef(pathname);
  const traversedAt = useRef(Number.NEGATIVE_INFINITY);

  useEffect(() => {
    const traversed = () => {
      traversedAt.current = performance.now();
    };
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const onNavigate = (event: Event) => {
      if ((event as NavigateEvent).navigationType === 'traverse') traversed();
    };
    // without the Navigation API: a router history entry carries state, an #anchor's has none
    const onPopState = (event: PopStateEvent) => {
      if (event.state != null) traversed();
    };
    if (navigation) navigation.addEventListener('navigate', onNavigate);
    else window.addEventListener('popstate', onPopState);
    return () => {
      if (navigation) navigation.removeEventListener('navigate', onNavigate);
      else window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useLayoutEffect(() => {
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    const root = document.documentElement;
    if (location.hash) root.setAttribute(CV_ATTRIBUTE, CV_OFF);
    else root.removeAttribute(CV_ATTRIBUTE);

    if (performance.now() - traversedAt.current < TRAVERSAL_COMMIT_WINDOW_MS) {
      traversedAt.current = Number.NEGATIVE_INFINITY;
      return;
    }
    // an instant scroll also cancels a smooth one still in flight
    window.scrollTo({ top: location.hash ? window.scrollY : 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
