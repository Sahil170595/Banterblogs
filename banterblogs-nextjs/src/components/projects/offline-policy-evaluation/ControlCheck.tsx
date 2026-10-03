'use client';

import { useState, type CSSProperties } from 'react';
import {
  CONTEXTS,
  DEFAULT_CONFIG,
  HORIZON,
  METHODS,
  type Config,
  type Evaluation,
  type Interval,
  type Method,
} from '@/lib/projects/offline-policy-evaluation/engine';
import { signed, verdict } from '@/lib/projects/offline-policy-evaluation/verdict';
import { controls, Segmented, type Choice } from '../controls';
import { along, span } from '../geometry';
import { ProjectFigureTransition } from '../ProjectTransitions';
import { SUPPORT_LABEL, supportNote } from './copy';
import styles from './ope.module.css';

// The hero: the target, a control that ignores the state and the logger on
// one axis, each with its 95% bootstrap interval, then the paired difference
// the verdict reads, against zero; under a reward, a logging support and an
// estimator the visitor picks. The verdict is computed from that paired
// interval, never written.

/** the doubled harm penalty the third reward preset applies */
const HARM_MULTIPLIER = 2;
type RewardKey = 'default' | 'no-gain' | 'harm';
const REWARDS: (Choice<RewardKey> & { weights: Pick<Config, 'gainWeight' | 'harmWeight'> })[] = [
  {
    value: 'default',
    label: `Gain − ${DEFAULT_CONFIG.harmWeight} × harm`,
    weights: { gainWeight: DEFAULT_CONFIG.gainWeight, harmWeight: DEFAULT_CONFIG.harmWeight },
  },
  { value: 'no-gain', label: 'Gain dropped', weights: { gainWeight: 0, harmWeight: DEFAULT_CONFIG.harmWeight } },
  {
    value: 'harm',
    label: `Harm ×${HARM_MULTIPLIER}`,
    note: `penalty ${HARM_MULTIPLIER * DEFAULT_CONFIG.harmWeight}`,
    weights: { gainWeight: DEFAULT_CONFIG.gainWeight, harmWeight: HARM_MULTIPLIER * DEFAULT_CONFIG.harmWeight },
  },
];
const SUPPORT: Choice<Config['scenario']>[] = (['balanced', 'rare', 'gap'] as const).map((value) => ({ value, label: SUPPORT_LABEL[value] }));
// named as the audit table names them; self-normalized divides by the capped weights' sum (engine.ts aggregate)
const ESTIMATORS: Choice<Method>[] = METHODS.map(({ key, label }) => ({ value: key, label }));
// a support preset is a different logging policy, not more data from the same one
const LOGGER_MOVES = 'Changing this changes the past decisions themselves, so the logger’s own return moves too.';

/** the axis runs this share past the outermost mark on each side */
const AXIS_PAD = 0.08;
const TICK_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2];
const TARGET_TICKS = 5;

const rewardKey = (config: Config): RewardKey | null =>
  REWARDS.find((r) => r.weights.gainWeight === config.gainWeight && r.weights.harmWeight === config.harmWeight)?.value ?? null;

function axis(values: number[]) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || 1) * AXIS_PAD;
  const step = TICK_STEPS.find((s) => (hi - lo + 2 * pad) / s <= TARGET_TICKS) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const min = Math.floor((lo - pad) / step) * step;
  const max = Math.ceil((hi + pad) / step) * step;
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
  return { min, max, ticks, at: (v: number) => along(v, min, max), span: (from: number, to: number) => span(from, to, min, max) };
}

interface Row {
  key: 'target' | 'constant' | 'logger' | 'difference';
  name: string;
  note: string;
  value: number | null;
  interval: Interval;
}

export function ControlCheck({
  evaluation,
  method,
  onMethod,
  onConfigure,
}: {
  evaluation: Evaluation;
  method: Method;
  onMethod: (method: Method) => void;
  onConfigure: (config: Config) => string | null;
}) {
  const { config } = evaluation;
  const [target, constant, logger] = evaluation.comparisons;
  const targetValue = target.result[method];
  const rows: Row[] = [
    {
      key: 'target',
      name: 'State-responsive target',
      note: 'the new policy: acts more as load rises',
      value: targetValue,
      interval: target.intervals[method],
    },
    {
      key: 'constant',
      name: 'Constant control',
      note: 'same rate as the target, ignores the load',
      value: constant.result[method],
      interval: constant.intervals[method],
    },
    {
      key: 'logger',
      name: 'Logging policy',
      note: 'the past decisions: what actually happened',
      value: target.result.logged,
      interval: logger.intervals[method],
    },
    {
      key: 'difference',
      name: 'Target − logger',
      note: 'the paired difference the verdict reads',
      value: targetValue === null ? null : targetValue - target.result.logged,
      interval: target.differences[method],
    },
  ];
  const marks = rows.flatMap((r) => [r.value, ...(r.interval ?? [])]).filter((v): v is number => v !== null);
  const scale = axis([...marks, 0]);
  const said = verdict(evaluation, method);
  const [error, setError] = useState('');
  const configure = (next: Config) => setError(onConfigure(next) ?? '');

  return (
    <div className={styles.hero}>
      <p className={controls.lead}>
        Offline evaluation scores a new policy, the target, a rule for when to act, on records of decisions someone else made: the logging policy,
        or logger.
        Nothing is tried for real; each logged decision is reweighted by how likely the new policy was to make it. Here each made-up trajectory passes
        through {HORIZON} decisions; at each, a load level ({CONTEXTS.map((c) => c.split(' ')[0].toLowerCase()).join(', ')}) is observed and one
        action is taken. Try &ldquo;Gain dropped&rdquo; or &ldquo;None at low load&rdquo; and watch the verdict change.
      </p>
      <div className={controls.row}>
        <Segmented
          legend="Reward"
          name="reward"
          options={REWARDS}
          value={rewardKey(config)}
          onChange={(key) => configure({ ...config, ...REWARDS.find((r) => r.value === key)!.weights })}
        />
        <Segmented
          legend="How often the logger chose Intensify"
          name="support"
          options={SUPPORT}
          value={config.scenario}
          onChange={(scenario) => configure({ ...config, scenario })}
        />
        <Segmented
          legend="Estimator: importance sampling (IS), how the rewards are reweighted"
          name="estimator"
          options={ESTIMATORS}
          value={method}
          onChange={onMethod}
        />
      </div>
      <p className={controls.hint}>
        {supportNote(config.scenario)} {LOGGER_MOVES}
      </p>
      {error && (
        <p role="alert" className={controls.error}>
          {error}
        </p>
      )}

      <div className={styles.verdict} data-tone={said.tone} role="status" aria-live="polite">
        <p className={styles.verdictHeadline}>{said.headline}</p>
        {said.detail && <p className={styles.verdictDetail}>{said.detail}</p>}
      </div>

      <ProjectFigureTransition slug="offline-policy-evaluation">
        <figure className={styles.forest} aria-label="Estimated discounted return per trajectory, with 95% bootstrap intervals">
          <p className={styles.caption}>
            Average discounted return per logged trajectory, higher is better, over {config.size} trajectories of {HORIZON} decisions each, with 95%
            intervals from {evaluation.resamples} paired bootstrap resamples. The dashed line marks the logger. The last row is the paired difference
            the verdict reads: each resample scores both policies on the same trajectories, so its interval is tighter than the two rows above it
            suggest.
          </p>
          <div className={styles.forestRows} style={{ '--logger': scale.at(target.result.logged), '--zero': scale.at(0) } as CSSProperties}>
            {rows.map((row) => (
              <div key={row.key} className={styles.forestRow} data-row={row.key}>
                <div className={styles.forestLabel}>
                  <strong>{row.name}</strong>
                  <span>{row.note}</span>
                </div>
                <div className={styles.forestValue}>
                  {row.value === null ? (
                    'Withheld'
                  ) : (
                    <>
                      <strong>{signed(row.value)}</strong>
                      <span>{row.interval ? `${signed(row.interval[0])} to ${signed(row.interval[1])}` : 'no interval'}</span>
                    </>
                  )}
                </div>
                <div className={styles.track}>
                  {scale.ticks.map((tick) => (
                    <span
                      key={tick}
                      aria-hidden="true"
                      className={styles.gridline}
                      data-tick={tick}
                      data-zero={tick === 0 || undefined}
                      style={{ left: scale.at(tick) }}
                    />
                  ))}
                  <span
                    aria-hidden="true"
                    className={row.key === 'difference' ? styles.zeroRule : styles.loggerRule}
                    data-rule={row.key === 'difference' ? 'zero' : 'logger'}
                  />
                  {row.value === null ? (
                    <span className={styles.withheld}>No logged evidence for part of this policy</span>
                  ) : (
                    <>
                      {row.interval && <span className={styles.interval} style={scale.span(row.interval[0], row.interval[1])} />}
                      <span className={styles.point} style={{ left: scale.at(row.value) }} />
                    </>
                  )}
                </div>
              </div>
            ))}
            <div className={styles.forestAxisRow} aria-hidden="true">
              <div className={styles.forestAxis}>
                {scale.ticks.map((tick) => (
                  <span key={tick} data-tick={tick} style={{ left: scale.at(tick) }}>
                    {signed(tick)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </figure>
      </ProjectFigureTransition>
    </div>
  );
}
