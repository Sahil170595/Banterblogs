'use client';

import { useEffect, useEffectEvent, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, ChevronRight, Download, Pause, Play, RotateCcw, SkipForward, SlidersHorizontal, Upload, X } from 'lucide-react';
import { z } from 'zod';
import {
  DEFAULT_CONFIG, FIXED_WAIT_MS, MAX_EVENTS, FIXTURE_VERSION, SCHEMA_VERSION, configSchema, completion,
  initialSite, observeModel, planFor, replayExport, runWorkflow, startTrace, stepWorkflow, transition,
  type Config, type Event as DomainEvent, type SiteState, type Trace,
} from '@/lib/projects/workflow-observatory/engine';
import { createFixturePort } from '@/lib/projects/workflow-observatory/dom';
import { controls } from '../controls';
import styles from './observatory.module.css';

const MAX_IMPORT_BYTES = 500_000;
const TIMEOUT_CHOICES = [500, 1000, 1500, 2000, 3000];
const BUDGET_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8];
// long enough to see the empty site before the executor starts clicking
const AUTO_RUN_DELAY_MS = 400;
const ROOM_LABELS = { north: 'North lab', south: 'South lab' };
const STATUS_LABELS = { ready: 'Ready', running: 'Running', complete: 'Complete', failed: 'Failed', cancelled: 'Cancelled', 'budget-exhausted': 'Budget exhausted' };
type Replay = ReturnType<typeof replayExport>;
// an imported configuration may hold a value the menu does not list
const choicesWith = (choices: number[], current: number) => (choices.includes(current) ? choices : [...choices, current].sort((a, b) => a - b));
function message(cause: unknown) {
  return cause instanceof z.ZodError ? cause.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' ') : cause instanceof Error ? cause.message : 'Workflow operation failed.';
}

export function Observatory({ initial = DEFAULT_CONFIG, autoRun = false }: { initial?: Config; autoRun?: boolean }) {
  const [config, setConfig] = useState<Config>({ ...initial });
  const [site, setSite] = useState(initialSite);
  const [trace, setTrace] = useState(() => startTrace(initial));
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [replayFrame, setReplayFrame] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<SiteState>(initialSite());
  const eventsRef = useRef<DomainEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const importRevision = useRef(0);

  useEffect(() => () => {
    generationRef.current++;
    importRevision.current++;
    controllerRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const runOnMount = useEffectEvent(() => execute('run'));
  useEffect(() => {
    if (!autoRun) return;
    const timer = setTimeout(runOnMount, AUTO_RUN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoRun]);

  function send(event: DomainEvent) {
    if (eventsRef.current.length >= MAX_EVENTS) throw new Error('Event capacity reached. Reset before continuing.');
    const next = transition(stateRef.current, event, config);
    stateRef.current = next; eventsRef.current.push(event); setSite(next);
  }
  function cancelPending() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (stateRef.current.phase === 'saving') send({ type: 'cancel' });
  }
  function resetTo(next: Config = { ...initial }) {
    importRevision.current++;
    controllerRef.current?.abort();
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    generationRef.current++;
    stateRef.current = initialSite(); eventsRef.current = [];
    setSite(initialSite()); setConfig(next); setTrace(startTrace(next)); setSelected(0);
    setBusy(false); setError(null); setReplay(null); setReplayFrame(0);
  }
  function changeConfig(change: Partial<Config>) {
    importRevision.current++;
    try { resetTo(configSchema.parse({ ...config, ...change })); }
    catch (cause) { setError(message(cause)); }
  }
  function manual(event: DomainEvent) {
    if (!['ready', 'running'].includes(trace.status)) return;
    importRevision.current++;
    try { send(event); }
    catch (cause) { setError(message(cause)); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!['ready', 'running'].includes(trace.status)) return;
    importRevision.current++;
    try {
      send({ type: 'submit' });
      const generation = generationRef.current;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (generation !== generationRef.current) return;
        try { send({ type: 'settle' }); }
        catch (cause) { setError(message(cause)); }
      }, config.latencyMs);
    } catch (cause) { setError(message(cause)); }
  }
  async function execute(mode: 'step' | 'run') {
    if (!rootRef.current || busy) return;
    importRevision.current++;
    const controller = new AbortController();
    controllerRef.current = controller;
    const generation = generationRef.current;
    const port = createFixturePort(rootRef.current, () => {
      if (generation === generationRef.current) cancelPending();
    });
    setBusy(true); setError(null);
    const publish = (next: Trace) => {
      if (generation !== generationRef.current) return;
      setTrace(next); setSelected(Math.max(0, next.entries.length - 1));
    };
    try {
      const next = mode === 'step' ? await stepWorkflow(trace, port, controller.signal) :
        await runWorkflow(trace, port, controller.signal, publish);
      publish(next);
    } catch (cause) {
      if (generation === generationRef.current) setError(message(cause));
      if (generation === generationRef.current) cancelPending();
    } finally {
      if (generation === generationRef.current) { setBusy(false); controllerRef.current = null; }
    }
  }
  function exportTrace() {
    const body = JSON.stringify({ schemaVersion: SCHEMA_VERSION, fixtureVersion: FIXTURE_VERSION, config, events: eventsRef.current, trace }, null, 2);
    const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'workflow-trace.json';
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }
  async function importTrace(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const revision = ++importRevision.current;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Trace must be under 500 KB.');
      const text = await file.text();
      if (revision !== importRevision.current) return;
      setReplay(replayExport(JSON.parse(text))); setReplayFrame(0); setError(null);
    } catch (cause) {
      if (revision !== importRevision.current) return;
      console.warn('Workflow replay rejected', cause); setError(`Replay rejected: ${message(cause)}`);
    } finally { if (revision === importRevision.current) input.value = ''; }
  }

  const plan = planFor(config);
  const entry = trace.entries[selected];
  const canExecute = ['ready', 'running'].includes(trace.status);
  const conditions = completion(observeModel(site), config).conditions;
  const largestDuration = Math.max(1, ...trace.entries.map(item => item.elapsedMs));
  const frame = replay?.frames[replayFrame];
  return <div className={styles.tool}>
    <div className={styles.toolbar}>
      <div className={styles.commands}>
        <button className={`${controls.iconButton} ${styles.settingsToggle}`} aria-label="Workflow settings" title="Workflow settings" aria-expanded={settingsOpen} aria-controls="workflow-settings" onClick={() => setSettingsOpen(open => !open)}><SlidersHorizontal size={18} /></button>
        <button className={controls.button} disabled={busy || !canExecute} onClick={() => execute('run')}><Play size={16} />Run workflow</button>
        <button className={controls.button} disabled={busy || !canExecute} onClick={() => execute('step')}><SkipForward size={16} />Step</button>
        <button className={controls.iconButton} disabled={!busy} title="Stop execution" aria-label="Stop execution" onClick={() => controllerRef.current?.abort()}><Pause size={18} /></button>
      </div>
      <div className={styles.commands}>
        <button className={controls.iconButton} disabled={busy} title="Import event trace" aria-label="Import event trace" onClick={() => uploadRef.current?.click()}><Upload size={18} /></button>
        <input ref={uploadRef} type="file" accept="application/json,.json" hidden aria-label="Trace file" onChange={importTrace} />
        <button className={controls.iconButton} disabled={busy || (trace.entries.length === 0 && site.phase === 'idle')} title="Export trace" aria-label="Export trace" onClick={exportTrace}><Download size={18} /></button>
        <button className={controls.iconButton} title="Reset observatory" aria-label="Reset observatory" onClick={() => resetTo()}><RotateCcw size={18} /></button>
      </div>
    </div>
    <div className={styles.layout}>
      <aside id="workflow-settings" className={`${styles.configuration} ${settingsOpen ? styles.configurationOpen : ''}`} aria-label="Workflow configuration">
        <label className={controls.field}>Task title<input value={config.title} maxLength={60} disabled={busy} onChange={event => changeConfig({ title: event.target.value })} /></label>
        <label className={controls.field}>Requested room<select value={config.room} disabled={busy} onChange={event => changeConfig({ room: event.target.value as Config['room'] })}><option value="north">North lab</option><option value="south">South lab</option></select></label>
        <label className={controls.field}>Injected failure<select value={config.failure} disabled={busy} onChange={event => changeConfig({ failure: event.target.value as Config['failure'] })}>
          <option value="none">None</option><option value="label-drift">Button label drift</option><option value="reject-save">Save rejected</option><option value="false-toast">Misleading success toast</option>
        </select></label>
        <div className={styles.pair}>
          <label className={controls.field}>Selector policy<select value={config.selectorPolicy} disabled={busy} onChange={event => changeConfig({ selectorPolicy: event.target.value as Config['selectorPolicy'] })}><option value="fallback">Alias fallback</option><option value="strict">Exact name</option></select></label>
          <label className={controls.field}>Wait policy<select value={config.waitPolicy} disabled={busy} onChange={event => changeConfig({ waitPolicy: event.target.value as Config['waitPolicy'] })}><option value="condition">Conditions</option><option value="fixed">{`Fixed ${FIXED_WAIT_MS} ms`}</option></select></label>
        </div>
        <label className={styles.range}>Save latency<input type="range" min={100} max={2000} step={100} value={config.latencyMs} disabled={busy} onChange={event => changeConfig({ latencyMs: Number(event.target.value) })} /><output>{config.latencyMs} ms</output></label>
        <div className={styles.pair}>
          <label className={controls.field}>Wait timeout<select value={config.timeoutMs} disabled={busy} onChange={event => changeConfig({ timeoutMs: Number(event.target.value) })}>
            {choicesWith(TIMEOUT_CHOICES, config.timeoutMs).map(ms => <option key={ms} value={ms}>{ms} ms</option>)}
          </select></label>
          <label className={controls.field}>Action budget<select value={config.budget} disabled={busy} onChange={event => changeConfig({ budget: Number(event.target.value) })}>
            {choicesWith(BUDGET_CHOICES, config.budget).map(n => <option key={n} value={n}>{n} {n === 1 ? 'action' : 'actions'}</option>)}
          </select></label>
        </div>
        <div className={styles.plan}><h3>Action plan</h3><ol>{plan.map((action, index) => <li key={action.kind} data-done={trace.entries[index]?.status === 'ok'}><span>{index + 1}</span><div><b>{action.label}</b><code>{action.target}</code>{action.value !== undefined && <small>{JSON.stringify(action.value)}</small>}</div></li>)}</ol></div>
      </aside>
      <div className={styles.experience}>
        <div className={styles.summary} role="status" aria-label="Workflow status" aria-live="polite"><strong className={trace.status === 'complete' ? styles.good : trace.status === 'failed' ? styles.warn : ''}>{busy ? 'Executing' : STATUS_LABELS[trace.status]}</strong><span>{trace.entries.length}/{plan.length} actions observed</span></div>
        {error && <p role="alert" className={controls.error}>{error}</p>}
        <div className={styles.fixture} ref={rootRef} data-phase={site.phase} data-title={site.title} data-room={site.room} aria-label="Synthetic scheduling site">
          <header><div><span className={styles.eyebrow}>SYNTHETIC SITE · SAME ORIGIN</span><h3>Lab reservations</h3></div><button className={controls.button} disabled={!canExecute || site.dialogOpen || site.phase === 'saving'} onClick={() => manual({ type: 'open' })}>{config.failure === 'label-drift' ? 'New reservation' : 'Reserve slot'}</button></header>
          <div className={styles.siteBody}>
            {site.toast !== 'none' && <p role="status" aria-label="Fixture notice" data-toast={site.toast} className={site.toast === 'success' ? styles.good : styles.warn}>{site.toast === 'success' ? 'Reservation saved' : 'Reservation could not be saved'}</p>}
            <table><thead><tr><th scope="col">Reservation</th><th scope="col">Room</th><th scope="col">State</th></tr></thead><tbody>
              {site.record ? <tr data-record-id={site.record.id} data-room={site.record.room}><td data-field="title">{site.record.title}</td><td>{ROOM_LABELS[site.record.room]}</td><td className={styles.good}>Committed</td></tr> : <tr><td colSpan={3} className={styles.empty}>No reservations</td></tr>}
            </tbody></table>
            {site.dialogOpen && <div className={styles.dialog} role="dialog" aria-label="Reservation" aria-modal="false">
              <div className={styles.dialogHeading}><h3>New reservation</h3><button className={controls.iconButton} disabled={!canExecute} aria-label="Cancel reservation" title="Cancel reservation" onClick={() => { cancelPending(); manual({ type: 'cancel' }); }}><X size={17} /></button></div>
              <form onSubmit={submit}>
                <label>Reservation title<input name="title" aria-label="Reservation title" required minLength={3} maxLength={60} pattern=".{3,60}" value={site.title} disabled={!canExecute || site.phase === 'saving'} onInput={event => manual({ type: 'fill', value: event.currentTarget.value })} onChange={() => {}} /></label>
                <label>Room<select name="room" aria-label="Room" value={site.room} disabled={!canExecute || site.phase === 'saving'} onChange={event => manual({ type: 'select', value: event.target.value as Config['room'] })}><option value="north">North lab</option><option value="south">South lab</option></select></label>
                <button className={controls.button} type="submit" disabled={!canExecute || site.phase === 'saving'}>Save reservation</button>
                {site.phase === 'saving' && <span role="status">Saving reservation…</span>}
              </form>
            </div>}
          </div>
        </div>
        <section className={styles.conditions} aria-label="Live completion conditions"><h3>Completion gate</h3><ul>{conditions.map(condition => <li key={condition.label} data-met={condition.met} className={condition.met ? styles.good : styles.muted}>{condition.met ? <Check size={14} /> : <span className={styles.unmet}>○</span>}{condition.label}</li>)}</ul></section>
      </div>
    </div>
    <section className={styles.trace} aria-label="Observed action trace">
      <h3>Observed trace</h3>
      {trace.entries.length === 0 ? <p className={styles.muted}>No actions observed.</p> : <div className={styles.traceLayout}>
        <div className={styles.timeline}>{trace.entries.map((item, index) => <button key={index} aria-label={`Inspect step ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)}>
          <span>{index + 1}</span><div><b>{item.action.label}</b><small>{item.status} · {item.elapsedMs} ms</small><i style={{ width: `${item.elapsedMs / largestDuration * 100}%` }} /></div><ChevronRight size={15} />
        </button>)}</div>
        {entry && <div className={styles.inspector} aria-label="Selected action evidence"><h4>{entry.action.label}</h4><p>{entry.reason}</p>
          <dl>{[['Dialog', entry.before.dialogOpen, entry.after.dialogOpen], ['Form valid', entry.before.formValid, entry.after.formValid], ['Save phase', entry.before.phase, entry.after.phase], ['Record', entry.before.recordTitle, entry.after.recordTitle], ['Toast', entry.before.toast, entry.after.toast]].map(([label, before, after]) => <div key={String(label)}><dt>{label}</dt><dd><code>{JSON.stringify(before)}</code><ChevronRight size={13} /><code>{JSON.stringify(after)}</code></dd></div>)}</dl>
          <label className={styles.metric}>Role-set distance <meter min={0} max={1} value={entry.roleDelta} /><span>{(entry.roleDelta * 100).toFixed(0)}%</span></label>
          <details><summary>Raw before / after evidence</summary><pre>{JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}</pre></details>
        </div>}
      </div>}
    </section>
    {replay && frame && <section className={styles.replay} aria-label="Recomputed event replay">
      <div><h3>Recomputed event replay</h3><button className={controls.button} onClick={() => resetTo(replay.config)}><Play size={15} />Load configuration for a fresh run</button></div>
      <label className={styles.range}>Replay frame<input type="range" min={0} max={replay.frames.length - 1} value={replayFrame} onChange={event => setReplayFrame(Number(event.target.value))} /><output>{replayFrame}/{replay.frames.length - 1}</output></label>
      <p className={styles.muted}>Reduced state reconstruction, not a new browser execution or a Playwright trace.</p>
      <dl><div><dt>Phase</dt><dd>{frame.phase}</dd></div><div><dt>Dialog</dt><dd>{frame.dialogOpen ? 'Open' : 'Closed'}</dd></div><div><dt>Record</dt><dd>{frame.record ? `${frame.record.title} / ${ROOM_LABELS[frame.record.room]}` : 'None'}</dd></div><div><dt>Completion</dt><dd>{completion(observeModel(frame), replay.config).complete ? 'Conditions met' : 'Conditions unmet'}</dd></div></dl>
    </section>}
    <footer className={styles.fidelity}>Curated plan · native controls · in-memory records · no external navigation, model call, or screenshot capture. Trace evidence is sampled DOM state.</footer>
  </div>;
}
