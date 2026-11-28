import type { FigureChart, FigureValue } from './types';

// The data range a figure's position scale spans, shared by the renderer
// (components/reports/ReportFigure.tsx) and the resolver, which holds every
// choice of a figure the reader redraws to the report figure's own range.

/** how far past the data a position scale runs, as a share of its span */
export const SCALE_PAD = 0.06;

/** the values' range, opened by SCALE_PAD each side */
export function padded(values: number[]): [number, number] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || Math.abs(hi) || 1) * SCALE_PAD;
  return [lo - pad, hi + pad];
}

/** a row as the scale reads it: a value the table leaves empty is null and takes no room */
export interface ScaledRow {
  values: Array<FigureValue | null>;
  low?: number;
  high?: number;
}

/**
 * The range a chart's position scale covers: bars from zero to their far
 * ends, a line from zero unless it crosses it, dots and slopes over their
 * values and intervals with room each side.
 */
export function figureDomain(chart: FigureChart, rows: ScaledRow[]): [number, number] {
  const numbers = (row: ScaledRow) => row.values.flatMap((cell) => (cell ? [cell.value] : []));
  if (chart === 'bar') {
    const values = rows.flatMap((row) => numbers(row).slice(0, 1));
    return [Math.min(0, ...values), Math.max(0, ...values)];
  }
  if (chart === 'line') {
    const values = rows.flatMap(numbers);
    return Math.min(...values) >= 0 ? [0, Math.max(...values)] : padded(values);
  }
  return padded(rows.flatMap((row) => [...numbers(row), ...(row.low === undefined ? [] : [row.low, row.high!])]));
}
