'use client';

import { lazy } from 'react';
import type { ExplorableFigure } from './exploreView';

// Every report page is one route, so a client component the page imports
// ships to all of them; behind React.lazy the control is a chunk of its own,
// fetched only by a page that renders it. (next/dynamic would add about 5 KB
// of loader to every report page.)
//
// Deliberately no Suspense boundary: React's server renderer moves a
// boundary of more than 500 bytes to the end of the page, revealed by a
// script, so the figure would be missing without script and drop in late
// with it. Unbounded, the server writes the control in place and the
// browser keeps that markup until the chunk arrives and hydrates it.

const ReportExplore = lazy(() => import('./ReportExplore').then((module) => ({ default: module.ReportExplore })));

// a component rather than the lazy itself: the server hands the browser a
// reference to this export, and React must be able to call it
export function ReportExploreLazy({ figure }: { figure: ExplorableFigure }) {
  return <ReportExplore figure={figure} />;
}
