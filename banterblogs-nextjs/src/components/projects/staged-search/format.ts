import type { Filter } from '@/lib/projects/staged-search/schema';

const OP_SYMBOLS: Record<Filter['op'], string> = { Eq: '=', NotEq: '≠', Gte: '≥', Lte: '≤', Contains: 'has', In: 'in', NotIn: 'not in' };

/** a filter as a reader would write it: year ≥ 2025 */
export function formatFilter(f: Filter): string {
  const value = Array.isArray(f.value) ? f.value.join(', ') : String(f.value);
  return `${f.field} ${OP_SYMBOLS[f.op]} ${value}`;
}

export const thresholdRange = (from: number, to: number | null) => (to === null ? `${from} or more` : from === to ? `${from}` : `${from} to ${to}`);

/** a ladder row's thresholds in a sentence: "a threshold of 6", "thresholds 1 to 3" */
export const atThresholds = (from: number, to: number | null) => (from === to ? `a threshold of ${from}` : `thresholds ${thresholdRange(from, to)}`);

/** a hard criterion as the request chip reads it: contains “cache” */
export const formatHard = (term: string) => `contains “${term}”`;
