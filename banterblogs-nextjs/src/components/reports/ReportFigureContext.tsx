'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { ReportFigure, type FigureData } from './ReportFigure';
import { ReportVisual } from './ReportVisual';

// The archive's cards render inside a client tab strip, so they cannot read a
// report off disk. The server page resolves the figures (lib/reports/figures)
// and provides them here as plain data, by slug.

const ReportFigureContext = createContext<Readonly<Record<string, FigureData>>>({});

export function ReportFigureProvider({ figures, children }: { figures: Readonly<Record<string, FigureData>>; children: ReactNode }) {
  return <ReportFigureContext.Provider value={figures}>{children}</ReportFigureContext.Provider>;
}

/** A card's picture: its report's figure where one was provided, the seeded visual otherwise. */
export function ReportCardVisual({ slug, accent = false }: { slug: string; accent?: boolean }) {
  const figure = useContext(ReportFigureContext)[slug];
  // a card names its figure; the numbers are read on the report page
  return figure ? <ReportFigure figure={figure} describe={false} /> : <ReportVisual slug={slug} accent={accent} />;
}
