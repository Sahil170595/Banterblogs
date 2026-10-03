'use client';

import { SCENARIOS } from '@/lib/projects/customer-service/model';
import type { ControlMeasurement } from '@/lib/projects/customer-service/measurements';
import { along, span } from '../geometry';
import { ProjectFigureTransition } from '../ProjectTransitions';
import { money, signedScore } from './format';
import styles from './service.module.css';

// The hero: scripted trajectories through each case, scored by the same
// evaluator from fresh fixtures. Selecting one loads it into the environment
// below, played to its end.

/** the board's reward axis; the evaluator's floor is -1, no control here goes below this */
const AXIS_MIN = -0.5;
const AXIS_MAX = 1;

const tone = (c: ControlMeasurement) => (!c.completed ? 'failed' : c.score < AXIS_MAX ? 'partial' : 'resolved');

export function ControlBoard({ controls, selected, onSelect }: { controls: ControlMeasurement[]; selected: string | null; onSelect: (control: ControlMeasurement) => void }) {
  const right = controls.find((c) => c.id === 'duplicate:verified')!;
  const wrong = controls.find((c) => c.id === 'duplicate:wrong-capture')!;
  return (
    <div className={styles.hero}>
      <p className={styles.headline}>
        Both duplicate-charge trajectories refund {money(right.refundedCents)}. Refunding the second capture scores {signedScore(right.score)};
        refunding the first scores {signedScore(wrong.score)}.
      </p>
      <ProjectFigureTransition slug="customer-service">
        <div className={styles.board} style={{ ['--zero' as string]: along(0, AXIS_MIN, AXIS_MAX) }}>
          {SCENARIOS.map((scenario) => (
            <section key={scenario.id} className={styles.case} aria-label={scenario.title}>
              <h3 className={styles.caseTitle}>
                {scenario.title}
                <span>{scenario.question}</span>
              </h3>
              <ul>
                {controls
                  .filter((c) => c.scenario === scenario.id)
                  .map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={styles.row}
                        data-tone={tone(c)}
                        aria-pressed={selected === c.id}
                        aria-label={`${c.label}: reward ${signedScore(c.score)}, ${c.actions} actions, ${c.effects} effects. Load it below.`}
                        onClick={() => onSelect(c)}
                      >
                        <span className={styles.rowLabel}>{c.label}</span>
                        <span className={styles.rowMeta}>
                          {c.actions} actions · {c.effects} {c.effects === 1 ? 'effect' : 'effects'}
                        </span>
                        <span className={styles.rowTrack} aria-hidden="true">
                          <span className={styles.rowBar} style={c.score >= 0 ? span(0, c.score, AXIS_MIN, AXIS_MAX) : span(c.score, 0, AXIS_MIN, AXIS_MAX)} />
                        </span>
                        <span className={styles.rowScore}>{signedScore(c.score)}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      </ProjectFigureTransition>
      <p className={styles.caption}>
        Each row is a scripted control run from a fresh synthetic fixture and scored by the service-reward.v2 rubric. Ember resolved the
        case, plain a partial remedy, red no coherent outcome. Select one to step through it below.
      </p>
    </div>
  );
}
