import { figureDomain } from '@/lib/reports/figures/scale';
import type { FigureValue, ResolvedExplore, ResolvedFigure } from '@/lib/reports/figures/types';
import { MISSING_WORDS, type FigureData } from './ReportFigure';

// A figure the reader redraws (ReportExplore.tsx), as plain functions of its
// data: what the server hands the client, the figure one choice draws, and
// what the live region says about it.

/** What the client is handed: the figure's choices and what every choice shares, not the report's sentence. */
export type ExplorableFigure = Pick<ResolvedFigure, 'slug' | 'chart' | 'title' | 'dimension' | 'highlight'> & { explore: ResolvedExplore };

/** The client's data for a figure with choices, or null for one without. */
export function toExplorable(figure: ResolvedFigure): ExplorableFigure | null {
  if (!figure.explore) return null;
  const { slug, chart, title, dimension, highlight, explore } = figure;
  return { slug, chart, title, dimension, highlight, explore };
}

/** The figure one choice draws, on the scale of the report's own figure (the choice the page opens on). */
export function exploreView(figure: ExplorableFigure, choice: number): FigureData {
  const { explore, ...shared } = figure;
  const option = explore.options[choice];
  return {
    ...shared,
    measure: option.measure,
    ...(option.series ? { series: option.series } : {}),
    rows: option.rows,
    domain: figureDomain(figure.chart, explore.options[explore.initial].rows),
  };
}

const spoken = (cell: FigureValue | null) => cell?.text ?? MISSING_WORDS;

/** What a choice now shows, in two parts: the column, then the highlighted row's value. */
export function exploreShown(figure: ExplorableFigure, choice: number): [column: string, datum: string] {
  const option = figure.explore.options[choice];
  const row = option.rows[figure.highlight];
  if (option.series) return [`Showing ${option.series[0]} to ${option.series[1]}:`, `${row.label}, ${spoken(row.values[0])} to ${spoken(row.values[1])}.`];
  return [`Showing ${option.measure}:`, `${row.label}, ${spoken(row.values[0])}.`];
}

/** What a choice now shows, as one sentence. */
export const exploreSummary = (figure: ExplorableFigure, choice: number): string => exploreShown(figure, choice).join(' ');
