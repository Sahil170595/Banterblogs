/// <reference types="react/canary" />
// ViewTransition ships in the React canary the App Router bundles; this loads
// its types (tsconfig has no "types" array to list react/canary in).
import { ViewTransition, type ReactNode, type ViewTransitionClassPerType } from 'react';
import { NAV_BACK, NAV_FORWARD } from '@/components/motion/routeTransitionTypes';

// Navigation types for <Link transitionTypes> on the reading path: the route
// transition (components/motion/RouteTransition.tsx) slides the page by them.
export { NAV_BACK, NAV_FORWARD };
// A report's card visual opens into the report page's hero figure.
export const FIGURE_MORPH_CLASS = 'figure-morph';

// Forward only: the archive opens at its top, so the card a back navigation
// would pair with is below the fold; React would name the outgoing figure,
// find no visible partner, and drop it from the sliding page.
const FIGURE_MORPH_FORWARD: ViewTransitionClassPerType = {
  [NAV_FORWARD]: FIGURE_MORPH_CLASS,
  default: 'none',
};

/** Pairs a report's visual on its archive card with the report page's hero figure. */
export function ReportFigureTransition({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <ViewTransition name={`report-figure-${slug}`} share={FIGURE_MORPH_FORWARD} default="none">
      {children}
    </ViewTransition>
  );
}
