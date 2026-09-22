'use client';

/// <reference types="react/canary" />
// ViewTransition ships in the React canary the App Router bundles; this loads
// its types (tsconfig has no "types" array to list react/canary in).
import { ViewTransition, useLayoutEffect, useRef, type ReactNode, type ViewTransitionClassPerType } from 'react';
import { usePathname } from 'next/navigation';
import {
  ARRIVING_PAGE_CLASS,
  NAV_BACK,
  NAV_FORWARD,
  ROUTE_CLASS,
  ROUTE_FROM_ATTRIBUTE,
  ROUTE_TO_ATTRIBUTE,
  routeKind,
} from './routeTransitionTypes';

// Links typed forward or back slide the reading path; every other navigation
// rises. The arriving page also takes the top layer (globals.css).
const LEAVING: ViewTransitionClassPerType = {
  [NAV_FORWARD]: NAV_FORWARD,
  [NAV_BACK]: NAV_BACK,
  default: ROUTE_CLASS,
};
const ARRIVING: ViewTransitionClassPerType = {
  [NAV_FORWARD]: `${NAV_FORWARD} ${ARRIVING_PAGE_CLASS}`,
  [NAV_BACK]: `${NAV_BACK} ${ARRIVING_PAGE_CLASS}`,
  default: `${ROUTE_CLASS} ${ARRIVING_PAGE_CLASS}`,
};

/**
 * Moves every page-to-page navigation. The page (the root layout's main and
 * footer) sits in a <ViewTransition> keyed by the path, so a route change
 * removes one and places another: React names the old page and the new one,
 * and globals.css moves them. React never animates the unnamed rest of the
 * document, and a same-page change (an archive tab's ?phase=, a hash) keeps
 * the key, so it starts no transition.
 *
 * It also marks <html> with the kind of page the navigation left and
 * reached. A layout effect runs inside the transition's update, before the
 * new page is captured, so the landing's handoff styles apply to it.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    const root = document.documentElement;
    root.setAttribute(ROUTE_FROM_ATTRIBUTE, routeKind(previous.current));
    root.setAttribute(ROUTE_TO_ATTRIBUTE, routeKind(pathname));
    previous.current = pathname;
  }, [pathname]);

  return (
    <ViewTransition key={pathname} enter={ARRIVING} exit={LEAVING} default="none">
      {children}
    </ViewTransition>
  );
}
