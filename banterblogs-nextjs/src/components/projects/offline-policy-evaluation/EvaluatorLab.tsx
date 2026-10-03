'use client';

import { useState, type FormEvent } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import {
  ACTIONS,
  CONTEXTS,
  exportEvaluation,
  LOW_SUPPORT,
  METHODS,
  type Config,
  type Evaluation,
  type Interval,
} from '@/lib/projects/offline-policy-evaluation/engine';
import { signed } from '@/lib/projects/offline-policy-evaluation/verdict';
import { controls, UnderTheHood } from '../controls';
import type { OpeDemo } from './useOpeDemo';
import styles from './ope.module.css';

// Under the hero: one plain line on how much data the estimate leans on,
// then, under the hood, every setting the evaluation takes and the
// diagnostics a reader needs before trusting its estimate: who the logger
// supports, how many trajectories the weights really use, the estimators
// side by side and one trajectory's ledger.

const PERCENT = 100;
const percent = (share: number) => `${(share * PERCENT).toFixed(1)}%`;
const range = (interval: Interval) => (interval ? `${signed(interval[0])} to ${signed(interval[1])}` : 'none');
const CAPS = [0.5, 1, 2, 5, 10, 25, 100];

type Slider = {
  key: keyof Pick<Config, 'intensity' | 'responsiveness' | 'anchor' | 'gainWeight' | 'harmWeight' | 'gamma'>;
  label: string;
  min: number;
  max: number;
  step: number;
};
const SLIDERS: { legend: string; fields: Slider[] }[] = [
  {
    legend: 'Target policy',
    fields: [
      { key: 'intensity', label: 'Intervention probability', min: 0, max: 1, step: 0.05 },
      { key: 'responsiveness', label: 'Load responsiveness', min: -0.4, max: 0.4, step: 0.05 },
      { key: 'anchor', label: 'Blend toward the logger', min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    legend: 'Reward and discount',
    fields: [
      { key: 'gainWeight', label: 'Gain coefficient', min: 0, max: 2, step: 0.1 },
      { key: 'harmWeight', label: 'Harm penalty', min: 0, max: 3, step: 0.1 },
      { key: 'gamma', label: 'Discount', min: 0, max: 1, step: 0.05 },
    ],
  },
];

const AUDIT_COLUMNS = ['Return', '95% interval', 'Versus logger', 'Paired interval'] as const;
const LEDGER_COLUMNS = ['Step', 'Load', 'Logged action', 'Reward', 'Weight', 'Capped'] as const;

function Settings({ config, onApply, onReset }: { config: Config; onApply: (config: Config) => string | null; onReset: () => void }) {
  const [draft, setDraft] = useState(config);
  const [counts, setCounts] = useState({ seed: String(config.seed), size: String(config.size) });
  const [error, setError] = useState('');
  const dirty =
    JSON.stringify({ ...draft, seed: counts.seed, size: counts.size }) !==
    JSON.stringify({ ...config, seed: String(config.seed), size: String(config.size) });

  const apply = (event: FormEvent) => {
    event.preventDefault();
    const seed = Number(counts.seed);
    const size = Number(counts.size);
    if (!Number.isInteger(seed) || !Number.isInteger(size) || !counts.seed.trim() || !counts.size.trim()) {
      console.warn('Offline evaluation settings rejected: seed and trajectories must be whole numbers', counts);
      setError('Seed and trajectories must be whole numbers.');
      return;
    }
    setError(onApply({ ...draft, seed, size }) ?? '');
  };

  return (
    <form className={styles.settings} onSubmit={apply} noValidate aria-label="Evaluation settings">
      {SLIDERS.map((group) => (
        <fieldset key={group.legend}>
          <legend>{group.legend}</legend>
          {group.fields.map((field) => (
            <label key={field.key} className={styles.slider}>
              <span>
                {field.label}
                <output>{draft[field.key].toFixed(2)}</output>
              </span>
              <input
                type="range"
                name={field.key}
                min={field.min}
                max={field.max}
                step={field.step}
                value={draft[field.key]}
                onChange={(event) => setDraft({ ...draft, [field.key]: Number(event.target.value) })}
              />
            </label>
          ))}
        </fieldset>
      ))}
      <fieldset>
        <legend>Logged cohort and estimator</legend>
        <div className={styles.pair}>
          <label className={controls.field}>
            Seed
            <input
              type="text"
              inputMode="numeric"
              name="seed"
              value={counts.seed}
              onChange={(event) => setCounts({ ...counts, seed: event.target.value })}
            />
          </label>
          <label className={controls.field}>
            Trajectories
            <input
              type="text"
              inputMode="numeric"
              name="size"
              value={counts.size}
              onChange={(event) => setCounts({ ...counts, size: event.target.value })}
            />
          </label>
        </div>
        <label className={controls.field}>
          Cumulative weight cap
          <select name="cap" value={draft.cap} onChange={(event) => setDraft({ ...draft, cap: Number(event.target.value) })}>
            {CAPS.map((cap) => (
              <option key={cap} value={cap}>
                {cap}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <div className={styles.settingsActions}>
        <button type="submit" className={controls.button} disabled={!dirty}>
          Evaluate
        </button>
        <button type="button" className={controls.iconButton} aria-label="Reset evaluation" title="Reset evaluation" onClick={onReset}>
          <RotateCcw aria-hidden="true" />
          <span className={controls.iconLabel}>Reset evaluation</span>
        </button>
        {dirty && <p className={controls.hint}>Changes apply when you evaluate.</p>}
        {error && (
          <p role="alert" className={controls.error}>
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

function SupportMatrix({ evaluation }: { evaluation: Evaluation }) {
  return (
    <figure className={styles.panel}>
      <figcaption className={styles.panelTitle}>
        Who the logger supports <span>how often the logger and the target choose each action, by load</span>
      </figcaption>
      <div className={styles.tableScroll} role="region" aria-label="Action support" tabIndex={0}>
        <table className={`${styles.supportTable} ${controls.stackTable}`} role="table">
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                Load
              </th>
              {ACTIONS.map((action) => (
                <th key={action} scope="col" role="columnheader">
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {evaluation.support.map((row) => (
              <tr key={row.name} role="row">
                <th scope="row" role="rowheader">
                  {row.name}
                </th>
                {ACTIONS.map((action, a) => {
                  const gap = row.behavior[a] === 0 && row.target[a] > 0;
                  const thin = !gap && row.behavior[a] < LOW_SUPPORT && row.target[a] > 0;
                  return (
                    <td key={action} role="cell" data-label={action} data-support={gap ? 'none' : thin ? 'thin' : undefined}>
                      <span className={styles.supportCell}>
                        <span className={styles.bar} style={{ width: percent(row.behavior[a]) }} data-kind="logger" />
                        <span className={styles.bar} style={{ width: percent(row.target[a]) }} data-kind="target" />
                        <span className={styles.barText}>
                          {percent(row.behavior[a])} → {percent(row.target[a])}
                        </span>
                        <span className={styles.barCount}>{row.counts[a]} logged</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.key}>
        <span data-kind="logger">Logger</span>
        <span data-kind="target">Target</span>
        <span data-support="thin">Logger under {LOW_SUPPORT * PERCENT}%: thin support</span>
        <span data-support="none">Logger never acts there: no support</span>
      </p>
    </figure>
  );
}

function EssBars({ evaluation }: { evaluation: Evaluation }) {
  const horizons = evaluation.comparisons[0].result.horizons;
  const size = evaluation.config.size;
  return (
    <figure className={styles.panel}>
      <figcaption className={styles.panelTitle}>
        Trajectories the weights really use <span>effective sample size (ESS) by step, of {size}</span>
      </figcaption>
      <ol className={styles.ess}>
        {horizons.map((h, t) => (
          <li key={t}>
            <span className={styles.essStep}>Step {t + 1}</span>
            <span className={styles.essTrack}>
              <span data-kind="capped" style={{ width: percent(h.cappedEss / size) }} />
              <span data-kind="raw" style={{ width: percent(h.rawEss / size) }} />
            </span>
            <span className={styles.essValue}>
              {h.rawEss.toFixed(0)} <span>/ {h.cappedEss.toFixed(0)} capped</span>
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.key}>
        <span data-kind="raw">Raw weights</span>
        <span data-kind="capped">Capped weights</span>
        <span>More capped ESS is less concentration, not less bias.</span>
      </p>
    </figure>
  );
}

function Audit({ evaluation }: { evaluation: Evaluation }) {
  const [target] = evaluation.comparisons;
  return (
    <section className={styles.panel} aria-labelledby="ope-audit">
      <h4 id="ope-audit" className={styles.panelTitle}>
        The target under each estimator <span>paired against the logger on the same resamples</span>
      </h4>
      <div className={styles.tableScroll} role="region" aria-label="Estimator audit" tabIndex={0}>
        <table className={`${styles.audit} ${controls.stackTable}`} role="table">
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                Estimator
              </th>
              {AUDIT_COLUMNS.map((column) => (
                <th key={column} scope="col" role="columnheader">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {METHODS.map(({ key, label }) => {
              const value = target.result[key];
              const cells = [
                value === null ? 'Withheld' : signed(value),
                range(target.intervals[key]),
                value === null ? 'Withheld' : signed(value - target.result.logged),
                range(target.differences[key]),
              ];
              return (
                <tr key={key} role="row">
                  <th scope="row" role="rowheader">
                    {label}
                  </th>
                  {cells.map((cell, i) => (
                    <td key={AUDIT_COLUMNS[i]} role="cell" data-label={AUDIT_COLUMNS[i]}>
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Ledger({ evaluation }: { evaluation: Evaluation }) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, evaluation.cohort.length - 1);
  const episode = evaluation.cohort[index];
  const trace = evaluation.comparisons[0].result.traces[index];
  return (
    <section className={styles.panel} aria-labelledby="ope-ledger">
      <div className={styles.ledgerHead}>
        <h4 id="ope-ledger" className={styles.panelTitle}>
          One trajectory&apos;s ledger <span>its weight is the product of the target-to-logger ratios so far</span>
        </h4>
        <label className={controls.field}>
          Trajectory
          <select value={index} onChange={(event) => setSelected(Number(event.target.value))}>
            {evaluation.cohort.map((e, i) => (
              <option key={e.id} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.tableScroll} role="region" aria-label={`Ledger for trajectory ${index + 1}`} tabIndex={0}>
        <table className={`${styles.audit} ${styles.ledger} ${controls.stackTable}`} role="table">
          <thead role="rowgroup">
            <tr role="row">
              {LEDGER_COLUMNS.map((column) => (
                <th key={column} scope="col" role="columnheader">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {episode.steps.map((step, t) => {
              const cells = [
                String(t + 1),
                CONTEXTS[step.context],
                ACTIONS[step.action],
                signed(trace.rewards[t]),
                trace.rawWeights[t].toFixed(2),
                trace.cappedWeights[t].toFixed(2),
              ];
              return (
                <tr key={t} role="row">
                  {cells.map((cell, i) => (
                    <td key={LEDGER_COLUMNS[i]} role="cell" data-label={LEDGER_COLUMNS[i]}>
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function EvaluatorLab({ demo }: { demo: OpeDemo }) {
  const { evaluation } = demo;
  const target = evaluation.comparisons[0].result;
  const last = target.horizons[target.horizons.length - 1];
  const [notice, setNotice] = useState('');

  const exportJson = () => {
    try {
      const url = URL.createObjectURL(new Blob([exportEvaluation(evaluation)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `offline-evaluation-seed-${evaluation.config.seed}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice('Evaluation exported.');
    } catch (cause) {
      console.error('Offline evaluation export failed:', cause);
      setNotice('The evaluation could not be exported.');
    }
  };

  return (
    <div className={styles.lab}>
      {/* a withheld estimate leans on nothing */}
      {target[demo.method] !== null && (
        <p className={styles.leans}>
          In effect, the estimate leans on {last.rawEss.toFixed(0)} of the {evaluation.config.size} logged trajectories (its effective sample size).
        </p>
      )}
      <UnderTheHood summary="Under the hood: support, effective sample size, estimators, one trajectory's ledger, settings and export">
        <div className={styles.labHead}>
          <div>
            <h3 className={styles.labTitle}>The evaluation underneath</h3>
            <p className={styles.labMeta}>
              Seed {evaluation.config.seed} · {evaluation.config.size} trajectories · {evaluation.horizon} decisions each
            </p>
          </div>
          <button type="button" className={controls.button} onClick={exportJson}>
            <Download aria-hidden="true" />
            Export evaluation JSON
          </button>
        </div>

        <dl className={styles.metrics}>
          <div>
            <dt>Final-step effective sample size (ESS)</dt>
            <dd>
              {last.rawEss.toFixed(0)} <span>/ {evaluation.config.size}</span>
            </dd>
          </div>
          <div>
            <dt>Target mass on thin support</dt>
            <dd>{percent(target.lowSupportMass)}</dd>
          </div>
          <div>
            <dt>Weights above the cap</dt>
            <dd>{percent(target.clippedFraction)}</dd>
          </div>
          <div>
            <dt>Largest final-step share</dt>
            <dd>{percent(last.maxShare)}</dd>
          </div>
        </dl>

        <div className={styles.diagnostics}>
          <SupportMatrix evaluation={evaluation} />
          <EssBars evaluation={evaluation} />
          <Audit evaluation={evaluation} />
          <Ledger evaluation={evaluation} />
        </div>

        <h4 className={styles.settingsTitle}>Settings</h4>
        <Settings key={JSON.stringify(evaluation.config)} config={evaluation.config} onApply={demo.configure} onReset={demo.reset} />
        <p className={styles.notice} role="status">
          {notice}
        </p>
      </UnderTheHood>
    </div>
  );
}
