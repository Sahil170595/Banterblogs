'use client';

import { useState } from 'react';
import { AlertTriangle, Download, Play, RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  ACTIONS, CONTEXTS, DEFAULT_CONFIG, METHODS, RESAMPLES, evaluate, exportEvaluation,
  formatNumber as fmt, type Config, type Evaluation, type Method,
} from '@/lib/projects/offline-policy-evaluation/engine';
import styles from './evaluator.module.css';

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const intervalText = (interval: [number, number] | null) => interval ? `[${fmt(interval[0])}, ${fmt(interval[1])}]` : 'No interval';
// SVG needs stable presentation precision across server and browser math engines.
const pixel = (value: number) => value.toFixed(3);

function ComparisonPlot({ result, method }: { result: Evaluation; method: Method }) {
  const candidates = result.comparisons;
  const baseline = candidates[0].result.logged;
  const points = candidates.flatMap(c => [c.result[method], ...(c.intervals[method] ?? [])]).filter((v): v is number => v !== null);
  const low = Math.min(0, baseline, ...points) - 0.2;
  const high = Math.max(0, baseline, ...points) + 0.2;
  const x = (value: number) => pixel(15 + (value - low) / (high - low) * 470);
  return <figure className={styles.comparison}>
    <figcaption className={styles.heading}>Policy comparison <span>discounted return / trajectory</span></figcaption>
    {candidates.map((candidate, i) => {
      const value = candidate.result[method];
      const interval = candidate.intervals[method];
      return <div key={candidate.name} className={styles.plotRow}>
        <div className={styles.plotLabel}><span>{candidate.name}</span><strong>{fmt(value)} <small>{intervalText(interval)}</small></strong></div>
        <svg viewBox="0 0 500 44" role="img" aria-label={`${candidate.name}: ${fmt(value)}, 95 percent bootstrap ${intervalText(interval)}`}>
          <line x1="15" x2="485" y1="22" y2="22" className={styles.gridLine} />
          <line x1={x(0)} x2={x(0)} y1="5" y2="39" className={styles.gridLine} />
          <line x1={x(baseline)} x2={x(baseline)} y1="3" y2="41" stroke="currentColor" strokeDasharray="3 3" />
          {interval && <line x1={x(interval[0])} x2={x(interval[1])} y1="22" y2="22" stroke={i === 1 ? 'hsl(var(--status-amber))' : 'hsl(var(--status-green))'} strokeWidth="4" />}
          {value !== null && <circle cx={x(value)} cy="22" r="6" fill={i === 1 ? 'hsl(var(--status-amber))' : 'hsl(var(--status-green))'} />}
          {value === null && <text x="250" y="27" textAnchor="middle" fill="currentColor" fontSize="14">Not identified</text>}
        </svg>
      </div>;
    })}
    <div className={styles.axis}><span>{fmt(low)}</span><span>Dashed: factual logging return {fmt(baseline)}</span><span>{fmt(high)}</span></div>
  </figure>;
}

function SupportMatrix({ result }: { result: Evaluation }) {
  return <figure>
    <figcaption className={styles.heading}>Action support <span>known reachable contexts / logger vs target</span></figcaption>
    <div className={styles.supportHeaders}><span>Context</span>{ACTIONS.map(a => <span key={a}>{a}</span>)}</div>
    {result.support.map(row => <div key={row.name} className={styles.supportRow}>
      <strong>{row.name}</strong>
      {ACTIONS.map((action, a) => <div key={action} className={`${styles.supportCell} ${row.behavior[a] === 0 && row.target[a] > 0 ? styles.gap : ''}`}>
        <span className={styles.supportNumbers}><span>Log {percent(row.behavior[a])}</span><span>Target {percent(row.target[a])}</span></span>
        <div className={styles.track}><span style={{ width: percent(row.behavior[a]) }} className={styles.loggerBar} /></div>
        <div className={styles.track}><span style={{ width: percent(row.target[a]) }} className={styles.targetBar} /></div>
        <small>{row.counts[a]} logged rows</small>
      </div>)}
    </div>)}
  </figure>;
}

function EssPlot({ result }: { result: Evaluation }) {
  const horizons = result.comparisons[0].result.horizons;
  const count = result.config.size;
  return <figure>
    <figcaption className={styles.heading}>Effective sample size <span>raw / capped</span></figcaption>
    <div className={styles.legend}><span className={styles.rawKey}>Raw weights</span><span className={styles.cappedKey}>Capped weights</span></div>
    <svg className={styles.essChart} viewBox="0 0 560 200" role="img" aria-label={`Effective sample size by horizon: ${horizons.map((h, i) => `step ${i + 1}, raw ${fmt(h.rawEss)}, capped ${fmt(h.cappedEss)}`).join('; ')}`}>
      {[0, 0.5, 1].map(f => <g key={f}><line x1="40" x2="550" y1={160 - f * 130} y2={160 - f * 130} className={styles.gridLine} /><text x="32" y={165 - f * 130} textAnchor="end" fill="currentColor" fontSize="12">{Math.round(count * f)}</text></g>)}
      {horizons.map((h, t) => <g key={t}>
        <rect x={65 + t * 125} y={pixel(160 - h.rawEss / count * 130)} width="32" height={pixel(h.rawEss / count * 130)} fill="hsl(var(--status-amber))" />
        <rect x={101 + t * 125} y={pixel(160 - h.cappedEss / count * 130)} width="32" height={pixel(h.cappedEss / count * 130)} fill="hsl(var(--status-green))" />
        <text x={99 + t * 125} y="184" textAnchor="middle" fill="currentColor" fontSize="13">Step {t + 1}</text>
      </g>)}
    </svg>
    <div className={styles.horizonValues}>{horizons.map((h, t) => <div key={t}><small>Step {t + 1}</small><strong>{fmt(h.rawEss, 1)} / {fmt(h.cappedEss, 1)}</strong></div>)}</div>
  </figure>;
}

function Range({ label, value, min, max, step, onChange, suffix = '' }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; suffix?: string;
}) {
  return <label className={styles.range}><span>{label}<output>{value.toFixed(2)}{suffix}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /></label>;
}

export default function Evaluator() {
  const [draft, setDraft] = useState<Config>({ ...DEFAULT_CONFIG });
  const [result, setResult] = useState(() => evaluate(DEFAULT_CONFIG));
  const [method, setMethod] = useState<Method>('normalized');
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(result.config);
  const update = <K extends keyof Config>(key: K, value: Config[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  const run = () => {
    try { setResult(evaluate(draft)); setSelected(0); setError(''); setExportStatus(''); }
    catch (cause) { console.error('Offline evaluation rejected configuration', cause); setError(cause instanceof Error ? cause.message : 'Evaluation failed. Check the configuration.'); }
  };
  const reset = () => { setDraft({ ...DEFAULT_CONFIG }); setResult(evaluate(DEFAULT_CONFIG)); setMethod('normalized'); setSelected(0); setError(''); setExportStatus(''); };
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportEvaluation(result)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `offline-evaluation-v1-seed-${result.config.seed}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportStatus('JSON exported');
  };
  const target = result.comparisons[0].result;
  const last = target.horizons[target.horizons.length - 1];
  const episode = result.cohort[selected];
  const trace = target.traces[selected];

  return <section id="demo" className={styles.tool} aria-label="Offline policy evaluator">
    <div className={styles.toolbar}>
      <span className={styles.badge}>Synthetic logged data</span>
      <span className={styles.runState} role="status">{error ? 'Invalid configuration' : dirty ? 'Unapplied changes' : `Seed ${result.config.seed} / ${result.config.size} trajectories`}</span>
      <div className={styles.commands}>
        <button className={styles.settingsToggle} onClick={() => setSettingsOpen(open => !open)} aria-label="Evaluation settings" title="Evaluation settings" aria-expanded={settingsOpen} aria-controls="offline-evaluation-settings"><SlidersHorizontal size={18} /></button>
        <button onClick={run} className={styles.run}><Play size={16} aria-hidden="true" />Evaluate</button>
        <button onClick={reset} aria-label="Reset evaluation" title="Reset evaluation"><RotateCcw size={18} /></button>
        <button onClick={download} aria-label="Export applied evaluation JSON" title="Export applied evaluation JSON"><Download size={18} /></button>
      </div>
    </div>
    {error && <p className={styles.warning} role="alert">{error}</p>}
    <span className={styles.srOnly} role="status">{exportStatus}</span>
    <div className={styles.workspace}>
      <form id="offline-evaluation-settings" className={`${styles.controls} ${settingsOpen ? styles.controlsOpen : ''}`} onSubmit={event => { event.preventDefault(); run(); }}>
        <fieldset><legend>Logged cohort</legend>
          <label>Logging support<select value={draft.scenario} onChange={event => update('scenario', event.target.value as Config['scenario'])}>
            <option value="balanced">Broad support</option><option value="rare">Rare intensification</option><option value="gap">Zero support at low load</option>
          </select></label>
          <div className={styles.inputPair}>
            <label>Seed<input type="number" min="0" max="4294967295" step="1" value={Number.isNaN(draft.seed) ? '' : draft.seed} onChange={event => update('seed', event.target.valueAsNumber)} /></label>
            <label>Trajectories<input type="number" min="8" max="320" step="1" value={Number.isNaN(draft.size) ? '' : draft.size} onChange={event => update('size', event.target.valueAsNumber)} /></label>
          </div>
        </fieldset>
        <fieldset><legend>Target policy</legend>
          <Range label="Intervention probability" value={draft.intensity} min={0} max={1} step={0.05} onChange={v => update('intensity', v)} />
          <Range label="Load responsiveness" value={draft.responsiveness} min={-0.4} max={0.4} step={0.05} onChange={v => update('responsiveness', v)} />
          <Range label="Logging-policy blend" value={draft.anchor} min={0} max={1} step={0.05} onChange={v => update('anchor', v)} />
        </fieldset>
        <fieldset><legend>Reward & estimator</legend>
          <Range label="Gain coefficient" value={draft.gainWeight} min={0} max={2} step={0.1} onChange={v => update('gainWeight', v)} />
          <Range label="Harm penalty" value={draft.harmWeight} min={0} max={3} step={0.1} onChange={v => update('harmWeight', v)} />
          <Range label="Discount" value={draft.gamma} min={0} max={1} step={0.05} onChange={v => update('gamma', v)} />
          <label>Cumulative weight cap<select value={draft.cap} onChange={event => update('cap', Number(event.target.value))}>{[0.5, 1, 2, 5, 10, 25, 100].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        </fieldset>
      </form>
      <div className={styles.results}>
        <div className={styles.metrics}>
          <div><span>Terminal raw ESS</span><strong>{fmt(last.rawEss, 1)}<small> / {result.config.size}</small></strong></div>
          <div><span>Empirical low-support mass</span><strong>{percent(target.lowSupportMass)}</strong></div>
          <div><span>Weights above cap</span><strong>{percent(target.clippedFraction)}</strong></div>
          <div><span>Largest terminal share</span><strong>{percent(last.maxShare)}</strong></div>
        </div>
        {target.supportCheck.gaps.length > 0 && <p className={styles.warning} role="status"><AlertTriangle size={18} aria-hidden="true" /><span>Target values withheld: intervals withheld too. Zero logging probability with positive target probability in known reachable contexts ({target.supportCheck.gaps.map(g => `${CONTEXTS[g.context]} / ${ACTIONS[g.action]}: ${percent(g.targetProbability)} conditional target probability`).join('; ')}). {percent(target.unsupportedMass)} empirical zero-support target mass across observed contributing contexts. A zero empirical mean does not establish population positivity. Clipping cannot repair a structural gap.</span></p>}
        <div className={styles.modeRow} role="group" aria-label="Estimator view">
          {METHODS.map(({ key, label }) => <button key={key} aria-pressed={method === key} title={label} onClick={() => setMethod(key)}>{key === 'pdis' ? 'Raw IS' : key === 'clipped' ? 'Capped IS' : 'Normalized IS'}</button>)}
        </div>
        <ComparisonPlot result={result} method={method} />
        <p className={styles.annotation}>95% pointwise percentile intervals / {RESAMPLES} paired trajectory resamples, only where structurally identified. Empirical coverage is distinct from known generator reachability. Not adjusted for interactive policy selection.</p>
        <div className={styles.charts}><SupportMatrix result={result} /><EssPlot result={result} /></div>
      </div>
    </div>
    <div className={styles.detailSection}>
      <h2>Estimator audit</h2>
      <div className={styles.tableScroll}><table><caption className={styles.srOnly}>State-responsive target estimator estimates and paired differences from logging return</caption>
        <thead><tr><th>Estimator</th><th>Return</th><th>95% interval</th><th>Difference vs logger</th><th>Paired 95% interval</th></tr></thead>
        <tbody>{METHODS.map(({ key, label }) => <tr key={key}><th scope="row">{label}</th><td>{fmt(target[key])}</td><td>{intervalText(result.comparisons[0].intervals[key])}</td><td>{fmt(target[key] === null ? null : target[key] - target.logged)}</td><td>{intervalText(result.comparisons[0].differences[key])}</td></tr>)}</tbody>
      </table></div>
      <p className={styles.annotation}>Normalized return bounds from allowed reward inputs: [{fmt(target.bounds[0])}, {fmt(target.bounds[1])}]. Raw IS need not remain within these bounds. Capping trades variance for bias; increased ESS is not proof of accuracy.</p>
      {result.comparisons[0].unavailableDraws.normalized > 0 && <p className={styles.warning}>Normalized interval withheld: {result.comparisons[0].unavailableDraws.normalized} resamples have a zero weight denominator.</p>}
    </div>
    <div className={styles.detailsGrid}>
      <section className={styles.detailSection}><h2>Reward-definition sensitivity</h2><p className={styles.annotation}>Same target, same logged outcomes / capped normalized return</p>
        {result.sensitivity.map(s => <div className={styles.sensitivityRow} key={s.name}><span>{s.name}</span><strong>{fmt(s.result.normalized)}</strong><small>Factual logger {fmt(s.result.logged)}</small></div>)}
      </section>
      <section className={styles.detailSection}><div className={styles.ledgerHeader}><h2>Trajectory ledger</h2><label><span className={styles.srOnly}>Inspect trajectory</span><select value={selected} onChange={event => setSelected(Number(event.target.value))}>{result.cohort.map((e, i) => <option key={e.id} value={i}>{e.id}</option>)}</select></label></div>
        <div className={styles.tableScroll}><table><caption className={styles.srOnly}>Factual steps and cumulative importance weights for {episode.id}</caption><thead><tr><th>Step</th><th>Context / action</th><th>Reward</th><th>Raw w</th><th>Capped w</th></tr></thead><tbody>{episode.steps.map((s, t) => <tr key={t}><td>{t + 1}</td><td>{CONTEXTS[s.context]}<small>{ACTIONS[s.action]}</small></td><td>{fmt(trace.rewards[t])}</td><td>{fmt(trace.rawWeights[t])}</td><td>{fmt(trace.cappedWeights[t])}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  </section>;
}
