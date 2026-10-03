'use client';

import { useState, type CSSProperties } from 'react';
import { DEFAULT_CONFIG, type Config, type Evaluation, type Interval, type Method } from '@/lib/projects/offline-policy-evaluation/engine';
import { signed, verdict } from '@/lib/projects/offline-policy-evaluation/verdict';
import { controls, Segmented, type Choice } from '../controls';
import { along, span } from '../geometry';
import { ProjectFigureTransition } from '../ProjectTransitions';
import styles from './ope.module.css';

// The hero: the target, a control that ignores the state, and the logger on
// one axis, each with its 95% bootstrap interval, under a reward, a logging
// support and an estimator the visitor picks. The verdict above it is
// computed from the paired interval, never written.

type RewardKey = 'default' | 'no-gain' | 'harm';
const REWARDS: (Choice<RewardKey> & { weights: Pick<Config, 'gainWeight' | 'harmWeight'> })[] = [
  { value: 'default', label: 'Gain − harm', weights: { gainWeight: DEFAULT_CONFIG.gainWeight, harmWeight: DEFAULT_CONFIG.harmWeight } },
  { value: 'no-gain', label: 'Gain dropped', weights: { gainWeight: 0, harmWeight: DEFAULT_CONFIG.harmWeight } },
  { value: 'harm', label: 'Harm ×2', weights: { gainWeight: DEFAULT_CONFIG.gainWeight, harmWeight: 2 * DEFAULT_CONFIG.harmWeight } },
];
const SUPPORT: Choice<Config['scenario']>[] = [
  { value: 'balanced', label: 'Broad' },
  { value: 'rare', label: 'Rare' },
  { value: 'gap', label: 'None at low load' },
];
const ESTIMATORS: Choice<Method>[] = [
  { value: 'pdis', label: 'Raw IS' },
  { value: 'clipped', label: 'Capped IS' },
  { value: 'normalized', label: 'Self-normalized' },
];

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
  key: string;
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
  const rows: Row[] = [
    { key: 'target', name: 'State-responsive target', note: 'acts more as load rises', value: target.result[method], interval: target.intervals[method] },
    { key: 'constant', name: 'Constant control', note: 'same rate, ignores the state', value: constant.result[method], interval: constant.intervals[method] },
    { key: 'logger', name: 'Logging policy', note: 'what actually happened', value: target.result.logged, interval: logger.intervals[method] },
  ];
  const marks = rows.flatMap((r) => [r.value, ...(r.interval ?? [])]).filter((v): v is number => v !== null);
  const scale = axis([...marks, 0]);
  const said = verdict(evaluation, method);
  const [error, setError] = useState('');
  const configure = (next: Config) => setError(onConfigure(next) ?? '');

  return (
    <div className={styles.hero}>
      <div className={controls.row}>
        <Segmented
          legend="Reward"
          name="reward"
          options={REWARDS}
          value={rewardKey(config)}
          onChange={(key) => configure({ ...config, ...REWARDS.find((r) => r.value === key)!.weights })}
        />
        <Segmented legend="Logged support for intensify" name="support" options={SUPPORT} value={config.scenario} onChange={(scenario) => configure({ ...config, scenario })} />
        <Segmented legend="Estimator" name="estimator" options={ESTIMATORS} value={method} onChange={onMethod} />
      </div>
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
          <div className={styles.forestRows} style={{ '--logger': scale.at(target.result.logged) } as CSSProperties}>
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
                    <span key={tick} aria-hidden="true" className={styles.gridline} data-zero={tick === 0 || undefined} style={{ left: scale.at(tick) }} />
                  ))}
                  <span aria-hidden="true" className={styles.loggerRule} />
                  {row.value === null ? (
                    <span className={styles.withheld}>No logged evidence for part of this policy</span>
                  ) : (
                    <>
                      {row.interval && (
                        <span className={styles.interval} style={scale.span(row.interval[0], row.interval[1])} />
                      )}
                      <span className={styles.point} style={{ left: scale.at(row.value) }} />
                    </>
                  )}
                </div>
              </div>
            ))}
            <div className={styles.forestAxisRow} aria-hidden="true">
              <div className={styles.forestAxis}>
                {scale.ticks.map((tick, i) => (
                  <span key={tick} data-edge={i === 0 ? 'start' : i === scale.ticks.length - 1 ? 'end' : undefined} style={{ left: scale.at(tick) }}>
                    {signed(tick)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <figcaption className={styles.caption}>
            Discounted return per trajectory over {config.size} logged four-step trajectories, with 95% intervals from {evaluation.resamples}{' '}
            paired bootstrap draws. The dashed rule is the logger.
          </figcaption>
        </figure>
      </ProjectFigureTransition>
    </div>
  );
}
