'use client';

import type { Rung } from '@/lib/projects/staged-search/ladder';
import { DEFAULT_SETTINGS, type Query, type Settings } from '@/lib/projects/staged-search/schema';
import { controls } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import { atThresholds, formatFilter, formatHard, thresholdRange } from './format';
import styles from './search.module.css';

// The hero: the lab's query at every candidate threshold, grouped where the
// outcome is the same. Each result is a square, plain when it fits every
// filter the query asked for, crossed when relaxation let it through.

/** whether a ladder row covers this threshold */
export const holds = (rung: Rung, threshold: number) => rung.from <= threshold && (rung.to === null || threshold <= rung.to);
const quoted = (terms: string[]) => terms.map((t) => `“${t}”`).join(' and ');
const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const say = (n: number) => words[n] ?? String(n);
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
const reports = (status: 'ready' | 'shortfall') => (status === 'ready' ? '“ready”' : 'a shortfall');

export const LADDER_COLUMNS = {
  threshold: 'Threshold',
  dropped: 'Filters dropped',
  results: 'Results returned',
  within: 'Match the request',
} as const;

/** what a run returned, against the request: "4 notes, two of which do not match the request" */
function returned(count: number, breaking: number): string {
  if (count === 0) return 'no notes';
  if (breaking === 0) return count === 1 ? '1 note, which matches the request' : `${plural(count, 'note')}, all matching the request`;
  if (count === 1) return '1 note, which does not match the request';
  return `${plural(count, 'note')}, ${say(breaking)} of which ${breaking === 1 ? 'does' : 'do'} not match the request`;
}

/** what the strict rung returned, every note matching or not */
function strictly(count: number, allMatch: boolean): string {
  if (count === 0) return 'no notes.';
  if (!allMatch) return `${plural(count, 'note')}.`;
  return count === 1 ? '1 note, which matches.' : `${plural(count, 'note')}, ${count === 2 ? 'both' : 'all'} matching.`;
}

function Headline({ rungs, query, limit }: { rungs: Rung[]; query: Query; limit: number }) {
  const atDefault = rungs.find((r) => holds(r, DEFAULT_SETTINGS.relax_threshold));
  const first = rungs[0];
  if (!atDefault?.report) return <p className={styles.headline}>At its default setting this search finds too few candidates to run.</p>;
  const { report, broken } = atDefault;
  const filtered = query.filters.length > 0;
  const all = report.dropped.length === query.filters.length && filtered;
  const breaking = broken.filter((b) => b.length).length;
  const dropped = all
    ? 'drops every filter'
    : report.dropped.length
      ? `drops ${say(report.dropped.length)} of its filters`
      : 'drops none of its filters';
  const hard = query.hard_criteria.length > 0 ? ` and containing ${quoted(query.hard_criteria)}` : '';
  const strict = first !== atDefault && first.report && first.report.dropped.length === 0 ? first.report : null;
  const allMatch = strict !== null && first.broken.every((b) => !b.length);
  return (
    <p className={styles.headline}>
      {filtered ? (
        <>
          Asked for {plural(limit, 'note')} matching {plural(query.filters.length, 'filter')}
          {hard}, the search drops filters while it has fewer than {DEFAULT_SETTINGS.relax_threshold} candidates, its default threshold. Here it{' '}
          {dropped}, reports {reports(report.status)} and returns {returned(report.selected.length, breaking)}.
        </>
      ) : (
        <>
          Asked for {plural(limit, 'note')} with no filters{hard}, the search has none to drop. It reports {reports(report.status)} and returns{' '}
          {returned(report.selected.length, breaking)}.
        </>
      )}
      {strict && (
        <>
          {' '}
          At {atThresholds(first.from, first.to)} it drops nothing and reports {reports(strict.status)}: {strictly(strict.selected.length, allMatch)}
        </>
      )}
    </p>
  );
}

export function LadderTable({
  rungs,
  query,
  settings,
  onPick,
}: {
  rungs: Rung[];
  query: Query;
  settings: Settings;
  onPick: (threshold: number) => void;
}) {
  // a second row to try, when the lowest thresholds give a different outcome from the default
  const other = rungs.length > 1 && !holds(rungs[0], DEFAULT_SETTINGS.relax_threshold) ? rungs[0] : null;
  return (
    <div className={styles.hero}>
      <Headline rungs={rungs} query={query} limit={settings.limit} />
      <p className={controls.lead}>
        StrataSearch relaxes a query that comes back thin: when its first search finds fewer candidates than a threshold, it drops a filter and
        searches again. Each row runs the same request at a different threshold. Pick a row to see its results underneath
        {other ? `: try the default, then ${thresholdRange(other.from, other.to)}.` : '.'}
      </p>
      <p className={styles.request}>
        <span>The request</span>
        {query.filters.map((f, i) => (
          <code key={i}>{formatFilter(f)}</code>
        ))}
        {query.filters.length === 0 && <em>no filters</em>}
        {/* the hard criteria are part of the request too; relaxation never drops them */}
        {query.hard_criteria.map((term) => (
          <span key={term} data-hard="" className={styles.hard}>
            <code>{formatHard(term)}</code> <small>hard, never dropped</small>
          </span>
        ))}
        <span>· {plural(settings.limit, 'result')}</span>
      </p>
      <p className={styles.legend}>
        <span className={styles.squares}>
          <span aria-hidden="true">
            <i />
          </span>
          matches every filter asked for
        </span>
        <span className={styles.squares}>
          <span aria-hidden="true">
            <i data-broken="" />
          </span>
          fails one, let in by a dropped filter
        </span>
      </p>
      <ProjectFigureTransition slug="staged-search">
        <div className={styles.tableScroll} role="region" aria-label="The same search at every relaxation threshold" tabIndex={0}>
          <table className={`${styles.ladder} ${controls.stackTable}`} role="table">
            <thead role="rowgroup">
              <tr role="row">
                {Object.values(LADDER_COLUMNS).map((name) => (
                  <th key={name} scope="col" role="columnheader">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {rungs.map((rung) => {
                const current = holds(rung, settings.relax_threshold);
                const fits = rung.broken.filter((b) => !b.length).length;
                return (
                  <tr key={rung.from} role="row" data-selected={current || undefined}>
                    <th scope="row" role="rowheader">
                      <button type="button" aria-pressed={current} onClick={() => onPick(rung.from)}>
                        {thresholdRange(rung.from, rung.to)}
                        {holds(rung, DEFAULT_SETTINGS.relax_threshold) && <span>default</span>}
                      </button>
                    </th>
                    <td role="cell" data-label={LADDER_COLUMNS.dropped}>
                      {rung.report ? (
                        rung.report.dropped.length ? (
                          <span className={styles.dropped}>
                            {rung.report.dropped.map((f, i) => (
                              <s key={i}>{formatFilter(f)}</s>
                            ))}
                          </span>
                        ) : (
                          <span className={styles.muted}>none</span>
                        )
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td role="cell" data-label={LADDER_COLUMNS.results}>
                      {rung.report ? (
                        <span className={styles.squares} aria-label={`${rung.report.selected.length} of ${settings.limit}, ${rung.report.status}`}>
                          <span aria-hidden="true">
                            {rung.broken.map((b, i) => (
                              <i key={i} data-broken={b.length ? '' : undefined} />
                            ))}
                          </span>
                          {rung.report.selected.length} of {settings.limit} · {rung.report.status}
                        </span>
                      ) : (
                        <span className={styles.warn}>{rung.error}</span>
                      )}
                    </td>
                    <td role="cell" data-label={LADDER_COLUMNS.within} className={styles.count}>
                      {rung.report ? `${fits} of ${rung.report.selected.length}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ProjectFigureTransition>
      <p className={styles.caption}>
        Filters go in a fixed order, year first, then kind or title, then topic or tags, then collection, until the first search finds at least
        as many candidates as the threshold.
      </p>
    </div>
  );
}
