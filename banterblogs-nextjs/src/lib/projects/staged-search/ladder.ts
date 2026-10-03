import { brokenFilters, PipelineError, runSearch, type RunReport } from './engine';
import { EXAMPLE_CORPUS } from './example';
import type { Query, Settings } from './schema';

// The same query at every relaxation threshold, grouped where the outcome is
// the same: what was dropped, what came back, and how much of what came back
// breaks the request. Once every filter is dropped a higher threshold changes
// nothing, so the last group is open-ended; so is a group that runs to the
// ladder's own top threshold, past the example's eighteen notes.

export const LADDER_LIMIT = 50;

export interface Rung {
  from: number;
  /** null when every higher threshold gives the same outcome */
  to: number | null;
  report: RunReport | null;
  error: string | null;
  /** per selected result, the requested filters it fails */
  broken: string[][];
}

const DOCS = new Map(EXAMPLE_CORPUS.map((d) => [d.id, d]));

function at(query: Query, settings: Settings, threshold: number): Omit<Rung, 'from' | 'to'> {
  try {
    const report = runSearch(EXAMPLE_CORPUS, query, { ...settings, relax_threshold: threshold });
    return { report, error: null, broken: report.selected.map((c) => brokenFilters(DOCS.get(c.id)!, query).map((f) => f.field)) };
  } catch (cause) {
    if (!(cause instanceof PipelineError)) throw cause;
    return { report: null, error: cause.message, broken: [] };
  }
}

const outcome = (r: Omit<Rung, 'from' | 'to'>) =>
  JSON.stringify([r.error, r.report?.dropped.map((f) => f.field), r.report?.selected.map((c) => c.id)]);

export function ladder(query: Query, settings: Settings): Rung[] {
  const rungs: Rung[] = [];
  for (let threshold = 1; threshold <= LADDER_LIMIT; threshold++) {
    const rung = at(query, settings, threshold);
    const last = rungs.at(-1);
    if (last && outcome(last) === outcome(rung)) last.to = threshold;
    else rungs.push({ ...rung, from: threshold, to: threshold });
    if (rung.report && rung.report.dropped.length === query.filters.length) break;
  }
  const last = rungs.at(-1);
  if (last && ((last.report && last.report.dropped.length === query.filters.length) || last.to === LADDER_LIMIT)) last.to = null;
  return rungs;
}
