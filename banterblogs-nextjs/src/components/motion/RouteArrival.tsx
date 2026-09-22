'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CV_ATTRIBUTE, CV_OFF } from './contentVisibility';
import { HISTORY_RESTORE_WINDOW_MS } from './HistoryScrollGuard';
import { onHistoryTraversal } from './historyTraversal';
import { currentEntryKey, restoreScrollAnchor } from './scrollAnchor';

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
 *   restores (HistoryScrollGuard holds that restore instant).
 * - Back and Forward then put the block that topped the view back where it
 *   was (scrollAnchor.ts), a frame later: the browser restores the number
 *   once the popstate that rendered this page returns.
 */
export function RouteArrival() {
  const pathname = usePathname();
  const shownPath = useRef(pathname);
  const traversedAt = useRef(Number.NEGATIVE_INFINITY);

  useEffect(
    () =>
      onHistoryTraversal(() => {
        traversedAt.current = performance.now();
      }),
    [],
  );

  useLayoutEffect(() => {
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    const root = document.documentElement;
    if (location.hash) root.setAttribute(CV_ATTRIBUTE, CV_OFF);
    else root.removeAttribute(CV_ATTRIBUTE);

    // the page a traversal reaches commits within the window its restore gets
    if (performance.now() - traversedAt.current < HISTORY_RESTORE_WINDOW_MS) {
      traversedAt.current = Number.NEGATIVE_INFINITY;
      const entry = currentEntryKey();
      requestAnimationFrame(() => restoreScrollAnchor(entry));
      return;
    }
    // an instant scroll also cancels a smooth one still in flight
    window.scrollTo({ top: location.hash ? window.scrollY : 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
