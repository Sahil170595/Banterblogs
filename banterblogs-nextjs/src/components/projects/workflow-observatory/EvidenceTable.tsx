'use client';

import { Check, Minus } from 'lucide-react';
import { judge, SCENARIOS, type Scenario } from '@/lib/projects/workflow-observatory/scenarios';
import { ProjectFigureTransition } from '../ProjectTransitions';
import styles from './observatory.module.css';

// The hero: six attempts at the same reservation, and what each kind of
// evidence says about them. A success notice is what a click-and-look agent
// trusts, Parallax's check is the original system's rule, the completion gate
// checks the outcome's conditions, and the record is the truth.

const VERDICTS = SCENARIOS.map((scenario) => ({ scenario, ...judge(scenario) }));

function Says({ yes, truth, label }: { yes: boolean; truth: boolean; label: string }) {
  const wrong = yes !== truth;
  return (
    <td data-yes={yes || undefined} data-wrong={wrong || undefined}>
      <span className={styles.says} aria-label={`${label}: ${yes ? 'done' : 'not done'}${wrong ? ', wrong' : ''}`}>
        {yes ? <Check aria-hidden="true" /> : <Minus aria-hidden="true" />}
        {yes ? 'done' : 'not done'}
      </span>
    </td>
  );
}

export function EvidenceTable({ selected, onSelect }: { selected: string; onSelect: (scenario: Scenario) => void }) {
  const noticeYes = VERDICTS.filter((v) => v.notice).length;
  const parallaxYes = VERDICTS.filter((v) => v.parallax).length;
  const actual = VERDICTS.filter((v) => v.record).length;
  const gateAgrees = VERDICTS.every((v) => v.gate === v.record);
  return (
    <div className={styles.hero}>
      <p className={styles.headline}>
        Of these {VERDICTS.length} attempts, a success notice claims {noticeYes} saved the reservation and Parallax&apos;s completion check
        accepts {parallaxYes}. {actual === 1 ? 'One' : actual} did. The completion gate{' '}
        {gateAgrees ? 'agrees with the committed record every time' : 'disagrees with the record somewhere'}.
      </p>
      <ProjectFigureTransition slug="workflow-observatory">
        <div className={styles.tableScroll} role="region" aria-label="What each kind of evidence says" tabIndex={0}>
          <table className={styles.evidence}>
            <thead>
              <tr>
                <th scope="col">Attempt</th>
                <th scope="col">Success notice</th>
                <th scope="col">Parallax&apos;s check</th>
                <th scope="col">Completion gate</th>
                <th scope="col">Matching record</th>
              </tr>
            </thead>
            <tbody>
              {VERDICTS.map(({ scenario, notice, parallax, gate, record }) => (
                <tr key={scenario.id} data-selected={selected === scenario.id || undefined}>
                  <th scope="row">
                    <button type="button" aria-pressed={selected === scenario.id} onClick={() => onSelect(scenario)}>
                      <strong>{scenario.label}</strong>
                      <span>{scenario.note}</span>
                    </button>
                  </th>
                  <Says yes={notice} truth={record} label="Success notice" />
                  <Says yes={parallax} truth={record} label="Parallax's check" />
                  <Says yes={gate} truth={record} label="Completion gate" />
                  <td data-yes={record || undefined} data-truth="">
                    <span className={styles.says} aria-label={`Matching record: ${record ? 'exists' : 'none'}`}>
                      {record ? <Check aria-hidden="true" /> : <Minus aria-hidden="true" />}
                      {record ? 'exists' : 'none'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ProjectFigureTransition>
      <p className={styles.caption}>
        Red marks evidence that disagrees with the record. Select an attempt to run it in the scheduling app below:
        {' '}the executor clicks, types and waits on the real controls, except the wrong room, which you make by hand.
      </p>
    </div>
  );
}
