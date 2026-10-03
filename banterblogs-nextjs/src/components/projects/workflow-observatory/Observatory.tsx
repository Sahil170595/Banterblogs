'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, ChevronRight, Download, Pause, Play, RotateCcw, SkipForward, Upload, X } from 'lucide-react';
import { z } from 'zod';
import {
  DEFAULT_CONFIG, MAX_EVENTS, FIXTURE_VERSION, SCHEMA_VERSION, configSchema, completion,
  initialSite, observeModel, planFor, replayExport, runWorkflow, startTrace, stepWorkflow, transition,
  type Config, type Event as DomainEvent, type SiteState, type Trace,
} from '@/lib/projects/workflow-observatory/engine';
import { createFixturePort } from '@/lib/projects/workflow-observatory/dom';
import styles from './observatory.module.css';

const MAX_IMPORT_BYTES = 500_000;
const ROOM_LABELS = { north: 'North lab', south: 'South lab' };
const STATUS_LABELS = { ready: 'Ready', running: 'Running', complete: 'Complete', failed: 'Failed', cancelled: 'Cancelled', 'budget-exhausted': 'Budget exhausted' };
type Replay = ReturnType<typeof replayExport>;
function message(cause: unknown) {
  return cause instanceof z.ZodError ? cause.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' ') : cause instanceof Error ? cause.message : 'Workflow operation failed.';
}

export function Observatory() {
  const [config, setConfig] = useState<Config>({ ...DEFAULT_CONFIG });
  const [site, setSite] = useState(initialSite);
  const [trace, setTrace] = useState(() => startTrace());
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
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

  useEffect(() => () => {
    generationRef.current++;
    controllerRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function send(event: DomainEvent) {
    if (eventsRef.current.length >= MAX_EVENTS) throw new Error('Event capacity reached. Reset before continuing.');
    const next = transition(stateRef.current, event, config);
    stateRef.current = next; eventsRef.current.push(event); setSite(next);
  }
  function cancelPending() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (stateRef.current.phase === 'saving') send({ type: 'cancel' });
  }
  function resetTo(next: Config = { ...DEFAULT_CONFIG }) {
    controllerRef.current?.abort();
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    generationRef.current++;
    stateRef.current = initialSite(); eventsRef.current = [];
    setSite(initialSite()); setConfig(next); setTrace(startTrace(next)); setSelected(0);
    setBusy(false); setError(null); setReplay(null); setReplayFrame(0);
  }
  function changeConfig(change: Partial<Config>) {
    try { resetTo(configSchema.parse({ ...config, ...change })); }
    catch (cause) { setError(message(cause)); }
  }
  function manual(event: DomainEvent) {
    try { send(event); }
    catch (cause) { setError(message(cause)); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
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
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Trace must be under 500 KB.');
      setReplay(replayExport(JSON.parse(await file.text()))); setReplayFrame(0); setError(null);
    } catch (cause) { setError(`Replay rejected: ${message(cause)}`); }
    event.target.value = '';
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
        <button className={styles.primary} disabled={busy || !canExecute} onClick={() => execute('run')}><Play size={16} />Run workflow</button>
        <button className={styles.secondary} disabled={busy || !canExecute} onClick={() => execute('step')}><SkipForward size={16} />Step</button>
        <button className={styles.icon} disabled={!busy} title="Stop execution" aria-label="Stop execution" onClick={() => controllerRef.current?.abort()}><Pause size={18} /></button>
      </div>
      <div className={styles.commands}>
        <button className={styles.icon} disabled={busy} title="Import event trace" aria-label="Import event trace" onClick={() => uploadRef.current?.click()}><Upload size={18} /></button>
        <input ref={uploadRef} type="file" accept="application/json,.json" hidden aria-label="Trace file" onChange={importTrace} />
        <button className={styles.icon} disabled={busy || (trace.entries.length === 0 && site.phase === 'idle')} title="Export trace" aria-label="Export trace" onClick={exportTrace}><Download size={18} /></button>
        <button className={styles.icon} title="Reset observatory" aria-label="Reset observatory" onClick={() => resetTo()}><RotateCcw size={18} /></button>
      </div>
    </div>
    <div className={styles.layout}>
      <aside className={styles.configuration} aria-label="Workflow configuration">
        <label>Task title<input value={config.title} maxLength={60} disabled={busy} onChange={event => changeConfig({ title: event.target.value })} /></label>
        <label>Requested room<select value={config.room} disabled={busy} onChange={event => changeConfig({ room: event.target.value as Config['room'] })}><option value="north">North lab</option><option value="south">South lab</option></select></label>
        <label>Injected failure<select value={config.failure} disabled={busy} onChange={event => changeConfig({ failure: event.target.value as Config['failure'] })}>
          <option value="none">None</option><option value="label-drift">Button label drift</option><option value="reject-save">Save rejected</option><option value="false-toast">Misleading success toast</option>
        </select></label>
        <div className={styles.pair}>
          <label>Selector policy<select value={config.selectorPolicy} disabled={busy} onChange={event => changeConfig({ selectorPolicy: event.target.value as Config['selectorPolicy'] })}><option value="fallback">Known alias fallback</option><option value="strict">Exact name only</option></select></label>
          <label>Wait policy<select value={config.waitPolicy} disabled={busy} onChange={event => changeConfig({ waitPolicy: event.target.value as Config['waitPolicy'] })}><option value="condition">Completion condition</option><option value="fixed">Fixed 200 ms delay</option></select></label>
        </div>
        <label>Save latency (ms)<input type="range" min={100} max={2000} step={100} value={config.latencyMs} disabled={busy} onChange={event => changeConfig({ latencyMs: Number(event.target.value) })} /><output>{config.latencyMs} ms</output></label>
        <div className={styles.pair}>
          <label>Wait timeout (ms)<input type="number" min={100} max={3000} step={100} value={config.timeoutMs} disabled={busy} onChange={event => changeConfig({ timeoutMs: Number(event.target.value) })} /></label>
          <label>Action budget<input type="number" min={1} max={8} value={config.budget} disabled={busy} onChange={event => changeConfig({ budget: Number(event.target.value) })} /></label>
        </div>
        <div className={styles.plan}><h3>Action plan</h3><ol>{plan.map((action, index) => <li key={action.kind} data-done={trace.entries[index]?.status === 'ok'}><span>{index + 1}</span><div><b>{action.label}</b><code>{action.target}</code>{action.value !== undefined && <small>{JSON.stringify(action.value)}</small>}</div></li>)}</ol></div>
      </aside>
      <div className={styles.experience}>
        <div className={styles.summary} role="status" aria-label="Workflow status" aria-live="polite"><strong className={trace.status === 'complete' ? styles.good : trace.status === 'failed' ? styles.warn : ''}>{busy ? 'Executing' : STATUS_LABELS[trace.status]}</strong><span>{trace.entries.length}/{plan.length} actions observed</span></div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.fixture} ref={rootRef} data-phase={site.phase} data-title={site.title} data-room={site.room} aria-label="Synthetic scheduling site">
          <header><div><span className={styles.eyebrow}>SYNTHETIC SITE · SAME ORIGIN</span><h3>Lab reservations</h3></div><button className={styles.secondary} disabled={site.dialogOpen || site.phase === 'saving'} onClick={() => manual({ type: 'open' })}>{config.failure === 'label-drift' ? 'New reservation' : 'Reserve slot'}</button></header>
          <div className={styles.siteBody}>
            {site.toast !== 'none' && <p role="status" aria-label="Fixture notice" data-toast={site.toast} className={site.toast === 'success' ? styles.good : styles.warn}>{site.toast === 'success' ? 'Reservation saved' : 'Reservation could not be saved'}</p>}
            <table><thead><tr><th scope="col">Reservation</th><th scope="col">Room</th><th scope="col">State</th></tr></thead><tbody>
              {site.record ? <tr data-record-id={site.record.id} data-room={site.record.room}><td data-field="title">{site.record.title}</td><td>{ROOM_LABELS[site.record.room]}</td><td className={styles.good}>Committed</td></tr> : <tr><td colSpan={3} className={styles.empty}>No reservations</td></tr>}
            </tbody></table>
            {site.dialogOpen && <div className={styles.dialog} role="dialog" aria-label="Reservation" aria-modal="false">
              <div className={styles.dialogHeading}><h3>New reservation</h3><button className={styles.icon} aria-label="Cancel reservation" title="Cancel reservation" onClick={() => { cancelPending(); manual({ type: 'cancel' }); }}><X size={17} /></button></div>
              <form onSubmit={submit}>
                <label>Reservation title<input name="title" aria-label="Reservation title" required minLength={3} maxLength={60} pattern=".{3,60}" value={site.title} disabled={site.phase === 'saving'} onInput={event => manual({ type: 'fill', value: event.currentTarget.value })} onChange={() => {}} /></label>
                <label>Room<select name="room" aria-label="Room" value={site.room} disabled={site.phase === 'saving'} onChange={event => manual({ type: 'select', value: event.target.value as Config['room'] })}><option value="north">North lab</option><option value="south">South lab</option></select></label>
                <button className={styles.primary} type="submit" disabled={site.phase === 'saving'}>Save reservation</button>
                {site.phase === 'saving' && <span role="status">Saving reservation…</span>}
              </form>
            </div>}
          </div>
        </div>
        <section className={styles.conditions} aria-label="Live completion conditions"><h3>Completion gate</h3><ul>{conditions.map(condition => <li key={condition.label} className={condition.met ? styles.good : styles.muted}>{condition.met ? <Check size={14} /> : <span className={styles.unmet}>○</span>}{condition.label}</li>)}</ul></section>
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
      <div><h3>Recomputed event replay</h3><button className={styles.secondary} onClick={() => resetTo(replay.config)}><Play size={15} />Load configuration for a fresh run</button></div>
      <label>Replay frame<input type="range" min={0} max={replay.frames.length - 1} value={replayFrame} onChange={event => setReplayFrame(Number(event.target.value))} /><output>{replayFrame}/{replay.frames.length - 1}</output></label>
      <p className={styles.muted}>Reduced state reconstruction, not a new browser execution or a Playwright trace.</p>
      <dl><div><dt>Phase</dt><dd>{frame.phase}</dd></div><div><dt>Dialog</dt><dd>{frame.dialogOpen ? 'Open' : 'Closed'}</dd></div><div><dt>Record</dt><dd>{frame.record ? `${frame.record.title} / ${ROOM_LABELS[frame.record.room]}` : 'None'}</dd></div><div><dt>Completion</dt><dd>{completion(observeModel(frame), replay.config).complete ? 'Conditions met' : 'Conditions unmet'}</dd></div></dl>
    </section>}
    <footer className={styles.fidelity}>Curated plan · native controls · in-memory records · no external navigation, model call, or screenshot capture. Trace evidence is sampled DOM state.</footer>
  </div>;
}
