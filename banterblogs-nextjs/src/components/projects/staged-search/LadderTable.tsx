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

function Headline({ rungs, query, limit }: { rungs: Rung[]; query: Query; limit: number }) {
  const atDefault = rungs.find((r) => holds(r, DEFAULT_SETTINGS.relax_threshold));
  const first = rungs[0];
  if (!atDefault?.report) return <p className={styles.headline}>At its default setting this search finds too few candidates to run.</p>;
  const { report, broken } = atDefault;
  const all = report.dropped.length === query.filters.length && query.filters.length > 0;
  const breaking = broken.filter((b) => b.length).length;
  const dropped = all
    ? 'drops every filter'
    : report.dropped.length
      ? `drops ${say(report.dropped.length)} of its filters`
      : 'drops none of its filters';
  const strict = first !== atDefault && first.report && first.report.dropped.length === 0 ? first.report : null;
  const allMatch = strict !== null && first.broken.every((b) => !b.length);
  return (
    <p className={styles.headline}>
      Asked for {plural(limit, 'note')} matching {plural(query.filters.length, 'filter')}
      {query.hard_criteria.length > 0 && ` and containing ${quoted(query.hard_criteria)}`}, the search drops filters while it has fewer than{' '}
      {DEFAULT_SETTINGS.relax_threshold} candidates, its default threshold. Here it {dropped}, reports {reports(report.status)} and returns{' '}
      {plural(report.selected.length, 'note')}, {say(breaking)} of which {breaking === 1 ? 'does' : 'do'} not match the request.
      {strict && (
        <>
          {' '}
          At {atThresholds(first.from, first.to)} it drops nothing and reports {reports(strict.status)}: {plural(strict.selected.length, 'note')}
          {allMatch ? `, ${strict.selected.length === 2 ? 'both' : 'all'} matching.` : '.'}
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
  return (
    <div className={styles.hero}>
      <Headline rungs={rungs} query={query} limit={settings.limit} />
      <p className={controls.lead}>
        StrataSearch relaxes a query that comes back thin: when its first search finds fewer candidates than a threshold, it drops a filter and
        searches again. Each row runs the same request at a different threshold. Pick a row to see its results underneath: try the default, then{' '}
        {rungs[0] ? thresholdRange(rungs[0].from, rungs[0].to) : 'the lowest'}.
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
        Filters go in a fixed order, year first, then kind or title, then topic or tags, then collection, until the first search finds as many
        candidates as wanted.
      </p>
    </div>
  );
}
