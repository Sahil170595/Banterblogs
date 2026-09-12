/// <reference types="react/canary" />
// ViewTransition ships in the React canary the App Router bundles; this loads
// its types (tsconfig has no "types" array to list react/canary in).
import { ViewTransition, type ReactNode, type ViewTransitionClassPerType } from 'react';

// Navigation types for <Link transitionTypes>; the view transitions block in
// globals.css styles the classes below.
export const NAV_FORWARD = 'nav-forward';
export const NAV_BACK = 'nav-back';
// The incoming title renders at full resolution while its box travels, so a
// small card title never shows as a scaled-up raster of itself.
export const TITLE_MORPH_CLASS = 'text-morph';

// Untyped navigations (header links, archive tabs, browser back and forward,
// refreshes) resolve to `default` and swap without animating.
const SLIDE_BY_DIRECTION: ViewTransitionClassPerType = {
  [NAV_FORWARD]: NAV_FORWARD,
  [NAV_BACK]: NAV_BACK,
  default: 'none',
};
// Forward only: the archive opens at its top, so the card a back navigation
// would pair with is below the fold; React would name the outgoing heading,
// find no visible partner, and drop the heading from the sliding page.
const TITLE_MORPH_FORWARD: ViewTransitionClassPerType = {
  [NAV_FORWARD]: TITLE_MORPH_CLASS,
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

/** Pairs a report's title on the archive cards with the report page heading. */
export function ReportTitleTransition({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <ViewTransition name={`report-title-${slug}`} share={TITLE_MORPH_FORWARD} default="none">
      {children}
    </ViewTransition>
  );
}
