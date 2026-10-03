'use client';

import { SCENARIOS } from '@/lib/projects/customer-service/model';
import type { ControlMeasurement } from '@/lib/projects/customer-service/measurements';
import { SCORE_CEILING, SCORE_FLOOR } from '@/lib/projects/customer-service/reward';
import { controls as ui } from '../controls';
import { along, span } from '../geometry';
import { ProjectFigureTransition } from '../ProjectTransitions';
import { money, signedScore } from './format';
import styles from './service.module.css';

// The hero: scripted trajectories through each case, scored by the same
// evaluator from fresh fixtures. Selecting one loads it into the environment
// below, played to its end.

/** the board's score axis; the evaluator's floor is SCORE_FLOOR, no run here goes below this */
const AXIS_MIN = -0.5;
const AXIS_MAX = SCORE_CEILING;
/** the run the lead invites the visitor to try: the right money from the wrong charge */
const TRY_RUN = 'duplicate:wrong-capture';

export type Tone = 'resolved' | 'partial' | 'failed';
export const TONE_LABELS: Record<Tone, string> = { resolved: 'Resolved', partial: 'Partial remedy', failed: 'Not resolved' };

const tone = (c: ControlMeasurement): Tone => (!c.completed ? 'failed' : c.score < AXIS_MAX ? 'partial' : 'resolved');
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function ControlBoard({
  controls,
  selected,
  onSelect,
}: {
  controls: ControlMeasurement[];
  selected: string | null;
  onSelect: (control: ControlMeasurement) => void;
}) {
  const tryRun = controls.find((c) => c.id === TRY_RUN)!;
  return (
    <div className={styles.hero}>
      <p className={styles.headline}>
        {controls.length} scripted trajectories, each a fixed sequence of agent actions, through {SCENARIOS.length} support cases. Each earns a
        reward, a score from {signedScore(SCORE_FLOOR)} to {signedScore(SCORE_CEILING)}, for what it left in the order records.
      </p>
      <p className={ui.lead}>
        Each row replays one trajectory from a fresh fixture, a made-up {money(tryRun.config.totalCents)} order. Effects are the actions that changed
        a record. Select a row to step through it below. Try “{tryRun.label}”: it refunds the right amount from the wrong charge.
      </p>
      <ul className={styles.legend} aria-label="What the colours mean">
        <li data-tone="resolved">{TONE_LABELS.resolved}: an acceptable outcome, fully done</li>
        <li data-tone="partial">{TONE_LABELS.partial}: requested or promised, not delivered</li>
        <li data-tone="failed">{TONE_LABELS.failed}: no acceptable outcome completed</li>
      </ul>
      <ProjectFigureTransition slug="customer-service">
        <div className={styles.board} style={{ ['--zero' as string]: along(0, AXIS_MIN, AXIS_MAX) }}>
          {SCENARIOS.map((scenario) => (
            <section key={scenario.id} className={styles.case} aria-label={scenario.title}>
              <h3 className={styles.caseTitle}>
                {scenario.title}
                <span className={styles.caseRequest}>{scenario.request}</span>
                <span>{scenario.question}</span>
              </h3>
              <ul>
                {controls
                  .filter((c) => c.scenario === scenario.id)
                  .map((c) => {
                    const verdict = TONE_LABELS[tone(c)];
                    const steps = count(c.actions, 'action', 'actions');
                    const changes = count(c.effects, 'effect', 'effects');
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={styles.row}
                          data-tone={tone(c)}
                          aria-pressed={selected === c.id}
                          aria-label={`${c.label}: reward ${signedScore(c.score)}, ${verdict.toLowerCase()}, ${steps}, ${changes}. Load it below.`}
                          onClick={() => onSelect(c)}
                        >
                          <span className={styles.rowLabel}>{c.label}</span>
                          <span className={styles.rowMeta}>
                            <strong>{verdict}</strong> · {steps} · {changes}
                          </span>
                          <span className={styles.rowTrack} aria-hidden="true">
                            <span
                              className={styles.rowBar}
                              style={c.score >= 0 ? span(0, c.score, AXIS_MIN, AXIS_MAX) : span(c.score, 0, AXIS_MIN, AXIS_MAX)}
                            />
                          </span>
                          <span className={styles.rowScore}>{signedScore(c.score)}</span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
        </div>
      </ProjectFigureTransition>
    </div>
  );
}
