'use client';

import { Check, Minus } from 'lucide-react';
import { DEFAULT_CONFIG } from '@/lib/projects/workflow-observatory/engine';
import { judge, SCENARIOS, type Scenario } from '@/lib/projects/workflow-observatory/scenarios';
import { controls } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import styles from './observatory.module.css';

// The hero: six attempts at the same booking, what was actually saved, and
// what three checks say about each. The "Reservation saved" message is what a
// click-and-look agent trusts, Parallax's check is the original system's
// rule, and the new completion check reads the outcome's conditions.

const VERDICTS = SCENARIOS.map((scenario) => ({ scenario, ...judge(scenario) }));
const ROOM_LABELS = { north: 'North lab', south: 'South lab' };

// each column's term, and the few plain words that define it in the header
const SAVED = { term: 'Committed record', gloss: 'what was actually saved' };
const NOTICE = { term: 'Success notice', gloss: '"Reservation saved" shown' };
const PARALLAX = { term: "Parallax's check", gloss: 'my earlier agent' };
const GATE = { term: 'Completion gate', gloss: "this rebuild's check" };

function Header({ column, truth }: { column: { term: string; gloss: string }; truth?: boolean }) {
  return (
    <th role="columnheader" scope="col" data-truth={truth ? '' : undefined}>
      {column.term}
      <small>{column.gloss}</small>
    </th>
  );
}

function Says({ yes, truth, label }: { yes: boolean; truth: boolean; label: string }) {
  const wrong = yes !== truth;
  return (
    <td role="cell" data-label={label} data-yes={yes || undefined} data-wrong={wrong || undefined}>
      <span className={styles.says} aria-label={`${label}: ${yes ? 'done' : 'not done'}${wrong ? ', wrong' : ''}`}>
        {yes ? <Check aria-hidden="true" /> : <Minus aria-hidden="true" />}
        {yes ? 'done' : 'not done'}
        {wrong && <span className={styles.wrongTag}>wrong</span>}
      </span>
    </td>
  );
}

export function EvidenceTable({ selected, onSelect }: { selected: string; onSelect: (scenario: Scenario) => void }) {
  const actual = VERDICTS.filter((v) => v.record).length;
  const gateAgrees = VERDICTS.every((v) => v.gate === v.record);
  const othersErr = VERDICTS.some((v) => v.notice !== v.record) && VERDICTS.some((v) => v.parallax !== v.record);
  return (
    <div className={styles.hero}>
      <p className={styles.headline}>
        {VERDICTS.length} attempts to book {ROOM_LABELS[DEFAULT_CONFIG.room]} for &ldquo;{DEFAULT_CONFIG.title}&rdquo;, and{' '}
        {actual === 1 ? 'only one' : actual} actually saved.{' '}
        {gateAgrees ? `${othersErr ? 'Only the' : 'The'} completion gate gets every attempt right.` : 'Even the completion gate gets some wrong.'}
      </p>
      <p className={controls.lead}>
        Each row is one attempt. The committed record column says what was actually saved; the three columns after it are ways of deciding
        the booking worked. The completion gate is this rebuild&apos;s check: it calls a booking done only when a committed record exists
        and matches the request. Red marks a check that got it wrong. Click an attempt to run it in the booking app below. Try
        &ldquo;Notice shown, nothing saved&rdquo;: the app says &ldquo;Reservation saved&rdquo; and its list stays empty.
      </p>
      <ProjectFigureTransition slug="workflow-observatory">
        <div className={styles.tableScroll} role="region" aria-label="What each kind of evidence says" tabIndex={0}>
          <table className={`${styles.evidence} ${controls.stackTable}`} role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">
                  Attempt
                </th>
                <Header column={SAVED} truth />
                <Header column={NOTICE} />
                <Header column={PARALLAX} />
                <Header column={GATE} />
              </tr>
            </thead>
            <tbody role="rowgroup">
              {VERDICTS.map(({ scenario, notice, parallax, gate, record }) => (
                <tr role="row" key={scenario.id} data-selected={selected === scenario.id || undefined}>
                  <th role="rowheader" scope="row">
                    <button type="button" aria-pressed={selected === scenario.id} onClick={() => onSelect(scenario)}>
                      <strong>{scenario.label}</strong>
                      <span>{scenario.note}</span>
                    </button>
                  </th>
                  <td role="cell" data-label={SAVED.term} data-yes={record || undefined} data-truth="">
                    <span className={styles.says} aria-label={`${SAVED.term}: ${record ? 'exists' : 'none'}`}>
                      {record ? <Check aria-hidden="true" /> : <Minus aria-hidden="true" />}
                      {record ? 'exists' : 'none'}
                    </span>
                  </td>
                  <Says yes={notice} truth={record} label={NOTICE.term} />
                  <Says yes={parallax} truth={record} label={PARALLAX.term} />
                  <Says yes={gate} truth={record} label={GATE.term} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ProjectFigureTransition>
    </div>
  );
}
