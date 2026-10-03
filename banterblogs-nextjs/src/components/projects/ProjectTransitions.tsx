/// <reference types="react/canary" />
import { ViewTransition, type ReactNode } from 'react';
import { FIGURE_MORPH_FORWARD } from '@/components/reports/ReportTransitions';

/**
 * Pairs a project's card visual with the figure that opens its page, as a
 * report card's visual opens into the report's hero (forward only, for the
 * same reason: the hub a back navigation returns to opens at its top).
 */
export function ProjectFigureTransition({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <ViewTransition name={`project-figure-${slug}`} share={FIGURE_MORPH_FORWARD} default="none">
      {children}
    </ViewTransition>
  );
}
