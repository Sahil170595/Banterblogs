'use client';

import { useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CV_ATTRIBUTE, CV_OFF } from './contentVisibility';

/**
 * Settles how a new page arrives, in the commit that shows it. It sits
 * ahead of the page in the root layout, so its layout effect runs before the
 * router's scroll in the same commit.
 * - Off-screen skipping (contentVisibility.ts), off for the rest of a page
 *   view once the pre-paint gate turns it off, goes back on, so the next page
 *   opens at a screen's cost; a page reached at a #fragment keeps it off,
 *   because the router scrolls there next.
 */
export function RouteArrival() {
  const pathname = usePathname();
  const shownPath = useRef(pathname);

  useLayoutEffect(() => {
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    const root = document.documentElement;
    if (location.hash) root.setAttribute(CV_ATTRIBUTE, CV_OFF);
    else root.removeAttribute(CV_ATTRIBUTE);
  }, [pathname]);

  return null;
}
