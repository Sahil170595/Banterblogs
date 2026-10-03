'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Download, Play, RotateCcw, SkipForward, Undo2, GitCompareArrows } from 'lucide-react';
import { actionValues, candidates, chooseAction, comparePolicies, createEpisode, DEFAULT_CONFIG, exportTrace, formatTime, mask, POLICIES, POLICY_LABELS, step, type Comparison, type Config, type Episode, type Policy } from '@/lib/projects/flight-routing/engine';
import { getScenario, outcomePool, type Profile, type ScenarioId } from '@/lib/projects/flight-routing/fixtures';
import { RouteFigure } from './RouteFigure';
import styles from './lab.module.css';

const TIME_FIELDS = [
  ['horizon', 'Horizon (minutes)', 60, 1440],
  ['buffer', 'Boarding / transfer buffer', 0, 1440], ['maxAttempts', 'Maximum flight attempts', 1, 6],
] as const;

export function FlightLab() {
  const [draft, setDraft] = useState({ ...DEFAULT_CONFIG, seed: String(DEFAULT_CONFIG.seed), deadline: String(DEFAULT_CONFIG.deadline), horizon: String(DEFAULT_CONFIG.horizon), buffer: String(DEFAULT_CONFIG.buffer), maxAttempts: String(DEFAULT_CONFIG.maxAttempts) });
  const [history, setHistory] = useState<Episode[]>(() => [createEpisode(DEFAULT_CONFIG)]);
  const [policy, setPolicy] = useState<Policy>('deadline');
  const [selectedId, setSelectedId] = useState('F3');
  const [worlds, setWorlds] = useState(64);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const state = history[history.length - 1];
  const flights = useMemo(() => candidates(state), [state]);
  const values = useMemo(() => actionValues(state), [state]);
  const selected = flights.findIndex(f => f.id === selectedId);
  const chosen = selected >= 0 ? selected : chooseAction(state, policy);
  const destination = getScenario(state.config.scenario).destination;
  const dirty = Object.entries(state.config).some(([key, value]) => String(draft[key as keyof typeof draft]) !== String(value));

  function safely(action: () => void) {
    setError(''); setNotice('');
    try { action(); } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The scenario could not be computed.';
      console.error('Flight routing lab:', message);
      setError(message);
    }
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    safely(() => {
      const config: Config = { ...draft, seed: Number(draft.seed), deadline: Number(draft.deadline), horizon: Number(draft.horizon), buffer: Number(draft.buffer), maxAttempts: Number(draft.maxAttempts) };
      if ([draft.seed, draft.deadline, draft.horizon, draft.buffer, draft.maxAttempts].some(v => !v.trim())) throw new Error('Complete every numeric field before applying the scenario.');
      setHistory([createEpisode(config)]); setComparison(null); setSelectedId('F3');
      setNotice('New scenario applied.');
    });
  }
  function advance(run: boolean) {
    safely(() => {
      const added: Episode[] = [];
      let next = state;
      do {
        next = step(next, run ? chooseAction(next, policy) : chosen);
        added.push(next);
      } while (run && next.reason === 'in_progress');
      setHistory([...history, ...added]);
    });
  }
  function download() {
    safely(() => {
      const url = URL.createObjectURL(new Blob([exportTrace(state, comparison)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = `flight-routing-${state.config.seed}.json`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      setNotice('JSON trace exported.');
    });
  }

  return <div className={styles.lab}>
    <form className={styles.config} onSubmit={apply}>
      <label>Itinerary network<select aria-label="Itinerary network" value={draft.scenario} onChange={e => setDraft({ ...draft, scenario: e.target.value as ScenarioId })}>
        <option value="west-east">SFO to JFK</option><option value="east-west">JFK to SFO</option>
      </select></label>
      <label>Disruption profile<select aria-label="Disruption profile" value={draft.profile} onChange={e => setDraft({ ...draft, profile: e.target.value as Profile })}>
        <option value="clear">Clear</option><option value="balanced">Mixed</option><option value="storm">Stress</option>
      </select></label>
      <label>Deadline (minutes)<input aria-label="Deadline (minutes)" type="number" min="1" max="1440" required value={draft.deadline} onChange={e => setDraft({ ...draft, deadline: e.target.value })} /></label>
      <button type="submit" className={styles.apply}><ArrowRight size={16} />Apply scenario</button>
      <details className={styles.advanced}>
        <summary>Advanced settings <span>seed {state.config.seed} / {POLICY_LABELS[policy]}</span></summary>
        <div className={styles.advancedFields}>
          <label>Scenario seed<input aria-label="Scenario seed" type="number" min="0" max="2147483647" required value={draft.seed} onChange={e => setDraft({ ...draft, seed: e.target.value })} /></label>
          {TIME_FIELDS.map(([key, label, min, max]) => <label key={key}>{label}<input aria-label={label} type="number" min={min} max={max} required value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
          <label>Continuation policy<select aria-label="Continuation policy" value={policy} onChange={e => setPolicy(e.target.value as Policy)}>{POLICIES.map(p => <option key={p} value={p}>{POLICY_LABELS[p]}</option>)}</select></label>
        </div>
      </details>
    </form>
    {dirty && <p className={styles.pending}>Unapplied inputs. The active trace still uses seed {state.config.seed}, {state.config.profile}, deadline {formatTime(state.config.deadline)}.</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.toolbar}>
      <div className={styles.actions}>
        <button aria-label="Step selected flight" disabled={state.reason !== 'in_progress'} onClick={() => advance(false)}><SkipForward size={16} />Step</button>
        <button aria-label="Run policy" title={`Run ${POLICY_LABELS[policy]}`} disabled={state.reason !== 'in_progress'} onClick={() => advance(true)}><Play size={16} />Run policy</button>
        <button aria-label="Rewind one decision" title="Rewind one decision" disabled={history.length < 2} onClick={() => safely(() => setHistory(history.slice(0, -1)))}><Undo2 size={18} /></button>
        <button aria-label="Reset scenario" title="Reset active scenario" onClick={() => safely(() => { setHistory([createEpisode(state.config)]); setComparison(null); setSelectedId('F3'); })}><RotateCcw size={18} /></button>
        <button aria-label="Export JSON trace" title="Export JSON trace" onClick={download}><Download size={18} /></button>
      </div>
    </div>
    <div className={styles.stateStrip} aria-live="polite" aria-atomic="true">
      <div><span>Episode</span><strong data-testid="episode-status" className={state.reason === 'arrived' ? styles.green : ''}>{state.reason.replaceAll('_', ' ')}</strong></div>
      <div><span>Current airport</span><strong>{state.airport} <ArrowRight size={13} /> {destination}</strong></div>
      <div><span>Clock / deadline</span><strong>{formatTime(state.clock)} / {formatTime(state.config.deadline)}</strong></div>
      <div><span>Attempts</span><strong>{state.legs.length} / {state.config.maxAttempts}</strong></div>
      <div><span>Terminal reward</span><strong>{state.reward.total.toFixed(4)}</strong></div>
    </div>
    <div className={styles.visualGrid}>
      <RouteFigure state={state} selectedId={flights[chosen]?.id} />
      <section className={styles.timeline} aria-label="Flight timeline">
        <h2>Flight timeline <span>elapsed UTC minutes</span></h2>
        <div className={styles.timeAxis}><span>00:00</span><span>Horizon {formatTime(state.config.horizon)}</span></div>
        <div className={styles.timeLanes}>
          <div className={styles.deadlineLine} style={{ left: `${state.config.deadline / state.config.horizon * 100}%` }} title={`Deadline ${formatTime(state.config.deadline)}`} />
          <div className={styles.clockLine} style={{ left: `${state.clock / state.config.horizon * 100}%` }} title={`Current clock ${formatTime(state.clock)}`} />
          {getScenario(state.config.scenario).flights.map(f => {
            const leg = state.legs.find(l => l.flight.id === f.id);
            const legal = flights.some(l => l.id === f.id);
            const x = (n: number) => Math.min(100, Math.max(0, n / state.config.horizon * 100));
            return <div key={f.id} className={styles.lane}>
              <span>{f.id}</span><div className={styles.track}>
                <div className={styles.scheduledBar} data-legal={legal} style={{ left: `${x(f.depart)}%`, width: `${x(f.arrive) - x(f.depart)}%` }} title={`${f.origin}-${f.dest}: scheduled ${formatTime(f.depart)}-${formatTime(f.arrive)}`} />
                {leg?.departure !== null && leg?.departure !== undefined && leg.arrival !== null && <div className={styles.actualBar} data-failed={leg.outcome.diverted && !leg.outcome.reached} style={{ left: `${x(leg.departure)}%`, width: `${Math.max(0, x(leg.arrival) - x(leg.departure))}%` }} title={`Actual ${formatTime(leg.departure)}-${formatTime(leg.arrival)}`} />}
                {leg?.outcome.cancelled && <span className={styles.cancelMark} style={{ left: `${x(f.depart)}%` }} title="Cancelled">x</span>}
              </div>
            </div>;
          })}
        </div>
        <div className={styles.legend}><span className={styles.blue}>Schedule</span><span className={styles.green}>Observed leg</span><span className={styles.red}>Failure</span><span className={styles.amber}>Deadline (dashed)</span><span>Clock (solid)</span></div>
      </section>
    </div>
    <section className={styles.candidates} aria-labelledby="candidate-heading">
      <div className={styles.sectionHead}><h2 id="candidate-heading">Candidate actions</h2><code aria-label="Action mask">mask [{mask(state).join(' ')}]</code></div>
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Candidate flight data">
        <table><thead><tr><th>Choose</th><th>Route</th><th>Departure</th><th>Arrival</th><th>Cancel / divert</th><th>Model deadline chance</th></tr></thead><tbody>
          {flights.map((f, i) => {
            const pool = outcomePool(f, state.config.profile);
            return <tr key={f.id} data-selected={i === chosen}>
              <td><label className={styles.radio}><input type="radio" name="flight" aria-label={`Select ${f.id} to ${f.dest}`} checked={i === chosen} onChange={() => setSelectedId(f.id)} />{f.id}</label></td>
              <td>{f.origin} to {f.dest}</td><td>{formatTime(f.depart)}</td><td>{formatTime(f.arrive)}</td>
              <td>{pool.filter(o => o.cancelled).length * 10}% / {pool.filter(o => o.diverted && !o.cancelled).length * 10}%</td>
              <td>{(values[i] * 100).toFixed(0)}%</td>
            </tr>;
          })}
        </tbody></table>
      </div>
      {!flights.length && <p className={styles.empty}>{state.reason === 'in_progress' ? 'No legal departures remain. Step or run to terminate this episode.' : 'Terminal episode. Rewind a decision or reset the scenario.'}</p>}
    </section>
    <div className={styles.detailGrid}>
      <section><h2>Revealed outcomes</h2>{!state.legs.length ? <p className={styles.empty}>No flight outcome drawn yet.</p> : <ol className={styles.trace}>{state.legs.map((leg, i) => <li key={`${leg.flight.id}-${i}`}>
        <strong>{leg.flight.id} {leg.flight.origin} to {leg.flight.dest}</strong>
        <span>{leg.outcome.cancelled ? 'Cancelled; passenger stays at origin.' : leg.outcome.diverted ? `${leg.outcome.reached ? 'Diversion reached destination' : `Unresolved diversion to ${leg.resolvedAirport}`}; observed arrival ${leg.arrival === null ? 'unknown' : formatTime(leg.arrival)}.` : `Departure ${formatTime(leg.departure!)}; arrival ${formatTime(leg.arrival!)}; joint delays +${leg.outcome.depDelay} / +${leg.outcome.arrDelay} min.`}</span>
        <code>{leg.outcome.id}</code>
      </li>)}</ol>}</section>
      <section><h2>Reward decomposition</h2><dl className={styles.rewards}>
        <div><dt>Deadline arrival <span>weight 0.80</span></dt><dd>{state.reward.deadline.toFixed(4)}</dd></div>
        <div><dt>Destination arrival <span>weight 0.10</span></dt><dd>{state.reward.arrival.toFixed(4)}</dd></div>
        <div><dt>Horizon remaining <span>weight 0.10</span></dt><dd>{state.reward.earliness.toFixed(4)}</dd></div>
        <div><dt>Total <span>deadline_first_v1</span></dt><dd>{state.reward.total.toFixed(4)}</dd></div>
      </dl></section>
    </div>
    <section className={styles.comparison} aria-labelledby="comparison-heading">
      <div className={styles.sectionHead}><h2 id="comparison-heading">Paired policy evaluation</h2><div className={styles.actions}>
        <label>Worlds<select aria-label="Comparison worlds" value={worlds} onChange={e => setWorlds(Number(e.target.value))}>{[32,64,128,256].map(n => <option key={n}>{n}</option>)}</select></label>
        <button onClick={() => safely(() => setComparison(comparePolicies(state.config, worlds)))}><GitCompareArrows size={17} />Compare policies</button>
      </div></div>
      {comparison ? <>
        <p className={styles.resultCaption}>{comparison.count} shared synthetic worlds <span>Seeds {comparison.seedStart}-{comparison.seedStart + comparison.count - 1}; from origin, not current prefix</span></p>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Comparison results"><table aria-label="Policy comparison"><thead><tr><th>Policy</th><th>By deadline / arrived</th><th>Mean reward</th><th>Terminal failures</th></tr></thead><tbody>{comparison.rows.map(row => <tr key={row.policy}>
          <th scope="row">{POLICY_LABELS[row.policy]}</th><td><div className={styles.rateTrack}><div style={{ width: `${row.arrived / comparison.count * 100}%` }} /><div style={{ width: `${row.onTime / comparison.count * 100}%` }} /></div>{row.onTime} / {row.arrived} of {comparison.count}</td>
          <td>{row.meanReward.toFixed(4)}</td><td>{Object.entries(row.reasons).filter(([reason]) => reason !== 'arrived').map(([reason, count]) => `${reason.replaceAll('_', ' ')}: ${count}`).join('; ') || 'None'}</td>
        </tr>)}</tbody></table></div>
      </> : <p className={styles.empty}>No policy evaluation run for this configuration.</p>}
    </section>
    <p className={styles.notice} role="status">{notice}</p>
  </div>;
}
