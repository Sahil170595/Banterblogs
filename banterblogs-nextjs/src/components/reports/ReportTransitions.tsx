/// <reference types="react/canary" />
// ViewTransition ships in the React canary the App Router bundles; this loads
// its types (tsconfig has no "types" array to list react/canary in).
import { ViewTransition, type ReactNode, type ViewTransitionClassPerType } from 'react';

// Navigation types for <Link transitionTypes>; the view transitions block in
// globals.css styles the classes below.
export const NAV_FORWARD = 'nav-forward';
export const NAV_BACK = 'nav-back';

// Untyped navigations (header links, archive tabs, browser back and forward,
// refreshes) resolve to `default` and swap without animating.
const SLIDE_BY_DIRECTION: ViewTransitionClassPerType = {
  [NAV_FORWARD]: NAV_FORWARD,
  [NAV_BACK]: NAV_BACK,
  default: 'none',
};

/** A reading-path page's outermost element; it slides out and in by direction. */
export function DirectionalPage({ className, children }: { className: string; children: ReactNode }) {
  return (
    <ViewTransition enter={SLIDE_BY_DIRECTION} exit={SLIDE_BY_DIRECTION} default="none">
      <div className={className}>{children}</div>
    </ViewTransition>
  );
}
