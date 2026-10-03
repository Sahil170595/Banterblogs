'use client';

import { OPERATIONAL_IDS, type Influence, type InfluenceReport } from '@/lib/projects/intake-triage/influence';
import { percent } from '../geometry';
import { ProjectFigureTransition } from '../ProjectTransitions';
import styles from './triage.module.css';

// The hero: every signal Intakegate's scorer reads for a priority, and in how
// many of all their combinations changing that signal alone changes the
// priority. The operational signals' column after a gate fires is the
// design's claim, counted.

const count = (n: number) => n.toLocaleString('en-US');
const show = (value: boolean | string) => (value === true ? 'on' : value === false ? 'off' : String(value).replace(/_/g, ' '));

export function InfluenceTable({ report, selected, onSelect }: { report: InfluenceReport; selected: string | null; onSelect: (influence: Influence) => void }) {
  const by = Object.fromEntries(report.influences.map((i) => [i.signal.id, i]));
  const operationalUnderGate = OPERATIONAL_IDS.reduce((n, id) => n + by[id].decisiveUnderGate, 0);
  return (
    <div className={styles.hero}>
      <p className={styles.headline}>
        Intakegate&apos;s scorer reads {report.influences.length} signals for a priority. Across all {count(report.combinations)} of their
        combinations, urgent wording changes the priority in {count(by.urgent_words.decisive)}, and once a safety gate has fired, in{' '}
        {count(report.gated)} of them, operational signals change it in {count(operationalUnderGate)}.
      </p>
      <ProjectFigureTransition slug="intake-triage">
        <div className={styles.tableScroll} role="region" aria-label="What each signal can change" tabIndex={0}>
          <table className={styles.influence}>
            <thead>
              <tr>
                <th scope="col">Signal</th>
                <th scope="col">Changes the priority in</th>
                <th scope="col">After a gate fires</th>
                <th scope="col">Nearest example</th>
              </tr>
            </thead>
            <tbody>
              {report.influences.map((influence) => {
                const { signal, decisive, decisiveUnderGate, example } = influence;
                const operational = OPERATIONAL_IDS.includes(signal.id);
                return (
                  <tr key={signal.id} data-selected={selected === signal.id || undefined} data-none={decisive === 0 || undefined}>
                    <th scope="row">
                      <strong>{signal.label}</strong>
                      <span>{signal.from === 'lexicon' ? 'Lexicon' : 'Perception'}</span>
                    </th>
                    <td>
                      <span className={styles.share} aria-label={`${count(decisive)} of ${count(report.combinations)} combinations`}>
                        <span className={styles.track} aria-hidden="true">
                          <span data-gate={operational ? undefined : ''} style={{ width: percent(decisive / report.combinations) }} />
                        </span>
                        <span className={styles.count}>{count(decisive)}</span>
                      </span>
                    </td>
                    <td className={styles.count}>{operational ? count(decisiveUnderGate) : <span className={styles.muted}>is a gate</span>}</td>
                    <td>
                      {example ? (
                        <button
                          type="button"
                          aria-pressed={selected === signal.id}
                          aria-label={`Load the example for ${signal.label}: ${show(example.value)} to ${show(example.alternative)} moves ${example.from} to ${example.to}`}
                          onClick={() => onSelect(influence)}
                        >
                          {show(example.value)} → {show(example.alternative)}
                          <span>
                            {example.from} → {example.to}
                          </span>
                        </button>
                      ) : (
                        <span className={styles.muted}>none exists</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ProjectFigureTransition>
      <p className={styles.caption}>
        Counts are over combinations, not messages: they say what the rules can do, not how often it happens. Everything the priority does
        not read is held at a complete referral. Load an example to see it in the scorer below, with the signal that decides it.
      </p>
    </div>
  );
}
