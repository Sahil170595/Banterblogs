import type { Filter } from '@/lib/projects/staged-search/schema';

const OP_SYMBOLS: Record<Filter['op'], string> = { Eq: '=', NotEq: '≠', Gte: '≥', Lte: '≤', Contains: 'has', In: 'in', NotIn: 'not in' };

/** a filter as a reader would write it: year ≥ 2025 */
export function formatFilter(f: Filter): string {
  const value = Array.isArray(f.value) ? f.value.join(', ') : String(f.value);
  return `${f.field} ${OP_SYMBOLS[f.op]} ${value}`;
}

export const thresholdRange = (from: number, to: number | null) => (to === null ? `${from} or more` : from === to ? `${from}` : `${from} to ${to}`);
