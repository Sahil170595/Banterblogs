'use client';

import { useMemo } from 'react';
import { ladder, type Rung } from '@/lib/projects/staged-search/ladder';
import { DEFAULT_SETTINGS, type Query, type Settings } from '@/lib/projects/staged-search/schema';
import { ProjectFigureTransition } from '../ProjectTransitions';
import { formatFilter, thresholdRange } from './format';
import styles from './search.module.css';

// The hero: the lab's query at every relaxation threshold, grouped where the
// outcome is the same. Each result is a square, plain when it fits every
// filter the query asked for, crossed when relaxation let it through.

const holds = (rung: Rung, threshold: number) => rung.from <= threshold && (rung.to === null || threshold <= rung.to);
const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const say = (n: number) => words[n] ?? String(n);
const reports = (status: 'ready' | 'shortfall') => (status === 'ready' ? 'ready' : 'a shortfall');

function Headline({ rungs, query }: { rungs: Rung[]; query: Query }) {
  const atDefault = rungs.find((r) => holds(r, DEFAULT_SETTINGS.relax_threshold));
  const first = rungs[0];
  if (!atDefault?.report) return <p className={styles.headline}>At the source&apos;s threshold this search finds too few candidates to run.</p>;
  const { report, broken } = atDefault;
  const all = report.dropped.length === query.filters.length && query.filters.length > 0;
  const breaking = broken.filter((b) => b.length).length;
  const dropped = all ? 'every filter it was given' : report.dropped.length ? `${say(report.dropped.length)} of its ${say(query.filters.length)} filters` : 'none of its filters';
  return (
    <p className={styles.headline}>
      At the source&apos;s threshold of {DEFAULT_SETTINGS.relax_threshold}, this search drops {dropped} and reports {reports(report.status)} with{' '}
      {report.selected.length} result{report.selected.length === 1 ? '' : 's'}, {say(breaking)} of which break{breaking === 1 ? 's' : ''} the request.
      {first !== atDefault && first.report && first.report.dropped.length === 0 && (
        <>
          {' '}
          At {first.to === first.from ? `threshold ${first.from}` : `thresholds ${first.from} to ${first.to}`} it drops nothing and reports{' '}
          {reports(first.report.status)}: {first.report.selected.length} result{first.report.selected.length === 1 ? '' : 's'}
          {first.broken.every((b) => !b.length) ? ', all within the request.' : '.'}
        </>
      )}
    </p>
  );
}

export function LadderTable({ query, settings, onPick }: { query: Query; settings: Settings; onPick: (threshold: number) => void }) {
  const rungs = useMemo(() => ladder(query, settings), [query, settings]);
  return (
    <div className={styles.hero}>
      <Headline rungs={rungs} query={query} />
      <p className={styles.request}>
        <span>The request</span>
        {query.filters.map((f, i) => (
          <code key={i}>{formatFilter(f)}</code>
        ))}
        {query.filters.length === 0 && <em>no filters</em>}
        <span>
          · {settings.limit} result{settings.limit === 1 ? '' : 's'}
        </span>
      </p>
      <ProjectFigureTransition slug="staged-search">
        <div className={styles.tableScroll} role="region" aria-label="The same search at every relaxation threshold" tabIndex={0}>
          <table className={styles.ladder}>
            <thead>
              <tr>
                <th scope="col">Threshold</th>
                <th scope="col">Filters dropped</th>
                <th scope="col">Results</th>
                <th scope="col">Within the request</th>
              </tr>
            </thead>
            <tbody>
              {rungs.map((rung) => {
                const current = holds(rung, settings.relax_threshold);
                const fits = rung.broken.filter((b) => !b.length).length;
                return (
                  <tr key={rung.from} data-selected={current || undefined}>
                    <th scope="row">
                      <button type="button" aria-pressed={current} onClick={() => onPick(rung.from)}>
                        {thresholdRange(rung.from, rung.to)}
                        {holds(rung, DEFAULT_SETTINGS.relax_threshold) && <span>source default</span>}
                      </button>
                    </th>
                    <td>
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
                    <td>
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
                    <td className={styles.count}>{rung.report ? `${fits} of ${rung.report.selected.length}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ProjectFigureTransition>
      <p className={styles.caption}>
        A crossed square is a result that fails a filter the query asked for. Relaxation drops year first, then kind or title, then topic
        or tags, then collection, until the body channel has as many candidates as the threshold. Pick a row to run it below.
      </p>
    </div>
  );
}
