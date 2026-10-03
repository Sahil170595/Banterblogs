'use client';

import { OPERATIONAL_IDS, type Influence, type InfluenceReport } from '@/lib/projects/intake-triage/influence';
import { controls } from '../controls';
import { percent } from '../geometry';
import { ProjectFigureTransition } from '../ProjectTransitions';
import styles from './triage.module.css';

// The hero: every signal Intakegate's scorer reads for a priority, and in how
// many of all their combinations changing that signal alone changes the
// priority. The operational signals' column after a gate fires is the
// design's claim, counted. Signals that never change it lead the table: they
// are what the headline is about.

const count = (n: number) => n.toLocaleString('en-US');
const show = (value: boolean | string) => (value === true ? 'on' : value === false ? 'off' : String(value).replace(/_/g, ' '));
const CHANGES = 'Changes the priority';
const AFTER_GATE = 'After a safety gate fires';
const EXAMPLE = 'Nearest example';

export function InfluenceTable({ report, selected, onSelect }: { report: InfluenceReport; selected: string | null; onSelect: (influence: Influence) => void }) {
  const by = Object.fromEntries(report.influences.map((i) => [i.signal.id, i]));
  const operationalUnderGate = OPERATIONAL_IDS.reduce((n, id) => n + by[id].decisiveUnderGate, 0);
  const urgent = by.urgent_words.decisive;
  const rows = [...report.influences.filter((i) => i.decisive === 0), ...report.influences.filter((i) => i.decisive > 0)];
  return (
    <div className={styles.hero}>
      <p className={styles.headline}>
        The scorer sets a priority from {report.influences.length} signals. Across all {count(report.combinations)} combinations of them,
        urgent wording {urgent === 0 ? 'never changes it' : `changes it in ${count(urgent)}`}, and once a safety gate fires,{' '}
        {operationalUnderGate === 0 ? 'no operational signal does' : `operational signals change it in ${count(operationalUnderGate)}`}.
      </p>
      <p className={controls.lead}>
        P0 is the most urgent priority, escalated for same-hour review; P3 is the lowest. A safety gate is a rule that runs before any
        points are added and sets the priority on its own. Lexicon signals are matched from a fixed word list; perception signals are read
        from the message by a model, or by a keyless fallback. Each row counts the combinations in which changing that one signal changes
        the priority. Click an example to load it into the scorer below.
      </p>
      <ProjectFigureTransition slug="intake-triage">
        <div className={styles.tableScroll} role="region" aria-label="What each signal can change" tabIndex={0}>
          <table className={`${styles.influence} ${controls.stackTable}`} role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">
                  Signal
                </th>
                <th role="columnheader" scope="col">
                  {CHANGES}
                  <small>in this many of {count(report.combinations)} combinations</small>
                </th>
                <th role="columnheader" scope="col">
                  {AFTER_GATE}
                  <small>in this many of {count(report.gated)}</small>
                </th>
                <th role="columnheader" scope="col">
                  {EXAMPLE}
                  <small>click to load it</small>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {rows.map((influence) => {
                const { signal, decisive, decisiveUnderGate, example } = influence;
                const operational = OPERATIONAL_IDS.includes(signal.id);
                return (
                  <tr role="row" key={signal.id} data-selected={selected === signal.id || undefined} data-none={decisive === 0 || undefined}>
                    <th role="rowheader" scope="row">
                      <strong>{signal.label}</strong>
                      <span>{signal.from === 'lexicon' ? 'Lexicon' : 'Perception'}</span>
                    </th>
                    <td role="cell" data-label={CHANGES}>
                      <span className={styles.share} aria-label={`${count(decisive)} of ${count(report.combinations)} combinations`}>
                        <span className={styles.track} aria-hidden="true">
                          <span data-gate={operational ? undefined : ''} style={{ width: percent(decisive / report.combinations) }} />
                        </span>
                        <span className={styles.count}>{count(decisive)}</span>
                      </span>
                    </td>
                    <td role="cell" data-label={AFTER_GATE}>
                      {operational ? <span className={styles.count}>{count(decisiveUnderGate)}</span> : <span className={styles.muted}>is a safety gate</span>}
                    </td>
                    <td role="cell" data-label={EXAMPLE}>
                      {example ? (
                        <button
                          type="button"
                          aria-pressed={selected === signal.id}
                          aria-label={`Load the example for ${signal.label}: ${show(example.value)} to ${show(example.alternative)} moves ${example.from} to ${example.to}`}
                          onClick={() => onSelect(influence)}
                        >
                          Try {show(example.value)} → {show(example.alternative)}
                          <span>
                            moves {example.from} → {example.to}
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
        not read is held at a complete referral.
      </p>
    </div>
  );
}
