'use client';

import { useEffect, useEffectEvent, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { Check, ChevronRight, Download, Play, RotateCcw, SkipForward, Square, Upload, X } from 'lucide-react';
import {
  DEFAULT_CONFIG, FIXED_WAIT_MS, MAX_EVENTS, FIXTURE_VERSION, SCHEMA_VERSION, configSchema, completion,
  initialSite, observeModel, planFor, replayExport, runWorkflow, startTrace, stepWorkflow, transition,
  type Config, type Event as DomainEvent, type SiteState, type Trace,
} from '@/lib/projects/workflow-observatory/engine';
import { createFixturePort } from '@/lib/projects/workflow-observatory/dom';
import { controls, UnderTheHood } from '../controls';
import { describeRefusal } from '../refusal';
import { revealResult, revealWhenRendered } from '../reveal';
import styles from './observatory.module.css';

const MAX_IMPORT_BYTES = 500_000;
const TIMEOUT_CHOICES = [500, 1000, 1500, 2000, 3000];
const BUDGET_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8];
// long enough to see the empty site before the executor starts clicking
const AUTO_RUN_DELAY_MS = 400;
const ROOM_LABELS = { north: 'North lab', south: 'South lab' };
const STATUS_LABELS = { ready: 'Ready to run', running: 'Running', complete: 'Done', failed: 'Not done', cancelled: 'Stopped', 'budget-exhausted': 'Not done: it ran out of actions' };
// why a finished run is not done, in the words of the first condition it misses
const MISSING: Record<string, string> = {
  'Committed record exists': 'no committed record, nothing was saved',
  'Title matches the requested task': "the record's title is not the one asked for",
  'Room matches the requested task': 'the record is in the wrong room',
  'Save reached its completed state': 'the save never completed',
  'Dialog is closed': 'the form is still open',
  'Success notice is present': 'no success notice',
};
// why a step failed, where the gate's conditions do not already say it
const STEP_REASONS: Record<string, string> = {
  'Fixed wait elapsed before required completion conditions.': 'the fixed wait ended before the save was confirmed',
};
// the page's sticky header covers this much of the top of the viewport
const STICKY_HEADER_CLEARANCE_PX = 96;
type Replay = ReturnType<typeof replayExport>;
type ImportNote = { kind: 'refused' | 'loaded'; text: string };
// an imported configuration may hold a value the menu does not list
const choicesWith = (choices: number[], current: number) => (choices.includes(current) ? choices : [...choices, current].sort((a, b) => a - b));

interface ObservatoryProps {
  initial?: Config;
  autoRun?: boolean;
  /** an attempt the executor cannot make (it books the requested room): Run and Step stay off and a person drives the app */
  byHand?: boolean;
  /** the configuration after every reset, setting change or loaded file */
  onConfigChange?: (config: Config) => void;
  /** whether the settings disclosure opens with the app, and word of it opening or closing */
  hoodOpen?: boolean;
  onHoodToggle?: (open: boolean) => void;
}

export function Observatory({ initial = DEFAULT_CONFIG, autoRun = false, byHand = false, onConfigChange, hoodOpen = false, onHoodToggle }: ObservatoryProps) {
  const [config, setConfig] = useState<Config>({ ...initial });
  const [site, setSite] = useState(initialSite);
  const [trace, setTrace] = useState(() => startTrace(initial));
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [replayFrame, setReplayFrame] = useState(0);
  const [importNote, setImportNote] = useState<ImportNote | null>(null);
  // the app holds one reservation; a later save by hand replaces it, and says so
  const [replaced, setReplaced] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const hoodRef = useRef<HTMLDivElement>(null);
  const replayRef = useRef<HTMLElement>(null);
  const importNoteRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const reserveRef = useRef<HTMLButtonElement>(null);
  // a person opened the form: its title field takes focus once it renders
  const focusTitle = useRef(false);
  // a person has chosen something here: a setting, a click in the app, a file;
  // the opening attempt does not run over it
  const touched = useRef(false);
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

  const runOnMount = useEffectEvent(() => {
    if (!touched.current) void execute('run');
  });
  useEffect(() => {
    if (!autoRun) return;
    const timer = setTimeout(runOnMount, AUTO_RUN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoRun]);

  // the settings disclosure keeps its place across a remount for another attempt
  const reportHood = useEffectEvent((open: boolean) => onHoodToggle?.(open));
  const openHood = useEffectEvent(() => hoodOpen);
  useEffect(() => {
    const details = hoodRef.current?.querySelector('details');
    if (!details) return;
    if (openHood()) details.open = true;
    const toggle = () => reportHood(details.open);
    details.addEventListener('toggle', toggle);
    return () => details.removeEventListener('toggle', toggle);
  }, []);

  useEffect(() => {
    if (!site.dialogOpen || !focusTitle.current) return;
    focusTitle.current = false;
    titleRef.current?.focus();
  }, [site.dialogOpen]);

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
    setBusy(false); setError(null); setReplay(null); setReplayFrame(0); setImportNote(null); setReplaced(false);
    onConfigChange?.(next);
  }
  function changeConfig(change: Partial<Config>) {
    importRevision.current++;
    touched.current = true;
    try { resetTo(configSchema.parse({ ...config, ...change })); }
    catch (cause) { setError(describeRefusal(cause)); }
  }
  function manual(event: DomainEvent) {
    if (!['ready', 'running'].includes(trace.status)) return;
    importRevision.current++;
    touched.current = true;
    try { send(event); }
    catch (cause) { setError(describeRefusal(cause)); }
  }
  function openByHand() {
    focusTitle.current = true;
    manual({ type: 'open' });
  }
  function cancelByHand() {
    cancelPending();
    manual({ type: 'cancel' });
    reserveRef.current?.focus();
  }
  function dialogKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || !canExecute) return;
    event.preventDefault();
    cancelByHand();
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
        const earlier = stateRef.current.record;
        // the page shows the landed save before any later timer runs: the
        // executor reads the page, and a check timed to the same moment must
        // not judge a page one render behind the app
        try { flushSync(() => send({ type: 'settle' })); }
        catch (cause) { setError(describeRefusal(cause)); return; }
        if (earlier && stateRef.current.record) setReplaced(true);
      }, config.latencyMs);
    } catch (cause) { setError(describeRefusal(cause)); }
  }
  async function execute(mode: 'step' | 'run') {
    if (!rootRef.current || busy) return;
    importRevision.current++;
    touched.current = true;
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
      if (generation === generationRef.current) setError(describeRefusal(cause));
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
    touched.current = true;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('The file is over 500 KB; a trace is far smaller.');
      const text = await file.text();
      if (revision !== importRevision.current) return;
      const loaded = replayExport(JSON.parse(text));
      setReplay(loaded); setReplayFrame(0);
      setImportNote({ kind: 'loaded', text: `Loaded: the replay below rebuilds its ${loaded.frames.length - 1} events.` });
      // the replay renders under the trace, often below the fold
      revealWhenRendered(() => replayRef.current);
    } catch (cause) {
      if (revision !== importRevision.current) return;
      console.warn('Workflow replay rejected', cause);
      setImportNote({ kind: 'refused', text: `Not loaded: ${describeRefusal(cause)}` });
      revealWhenRendered(() => importNoteRef.current);
    } finally { if (revision === importRevision.current) input.value = ''; }
  }

  // a save made by hand settles out of view on a phone; its verdict comes up
  // clear of the sticky header
  function revealStatus() {
    const status = statusRef.current;
    if (!status) return;
    const top = status.getBoundingClientRect().top;
    // jsdom, which the unit tests run on, has no scrolling
    if ((top < STICKY_HEADER_CLEARANCE_PX || top > window.innerHeight) && typeof status.scrollIntoView === 'function') {
      const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      status.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
    }
    revealResult(status);
  }

  const plan = planFor(config);
  const entry = trace.entries[selected];
  const canExecute = ['ready', 'running'].includes(trace.status);
  const conditions = completion(observeModel(site), config).conditions;
  const largestDuration = Math.max(1, ...trace.entries.map(item => item.elapsedMs));
  const frame = replay?.frames[replayFrame];
  const missing = conditions.find(condition => !condition.met);
  const lastEntry = trace.entries.at(-1);
  const done = `Done: the record is committed and all ${conditions.length} conditions hold`;
  // the first condition the app misses, or else why the step that failed did
  const notDone = missing ? `Not done: ${MISSING[missing.label] ?? missing.label}`
    : lastEntry && lastEntry.status !== 'ok' ? `Not done: ${STEP_REASONS[lastEntry.reason] ?? lastEntry.reason}` : STATUS_LABELS.failed;
  // a person driving the app: with no executor step taken, its saves are judged by the same gate
  const handActive = trace.entries.length === 0 && site.phase !== 'idle';
  const settledByHand = trace.entries.length === 0 && (site.phase === 'saved' || site.phase === 'rejected');
  const statusText = busy ? 'Running'
    : trace.status === 'complete' ? done
    : trace.status === 'failed' ? notDone
    : settledByHand ? (missing ? notDone : done)
    : byHand && trace.status === 'ready' ? 'Make it by hand: Reserve slot, fill the form, save'
    : handActive && trace.status === 'ready' ? 'Booking by hand'
    : STATUS_LABELS[trace.status];
  // a step counts once it completed; a stopped or failed one did not
  const taken = trace.entries.filter(item => item.status === 'ok').length;
  const stepsText = trace.status === 'complete' && taken < plan.length
    ? `${taken} of ${plan.length} steps taken; the goal already held, so the rest were skipped`
    : `${taken} of ${plan.length} steps taken`;
  const executorOff = byHand ? 'The executor books the requested room; make this attempt by hand'
    : handActive ? 'A booking is being made by hand; reset to run the executor' : undefined;
  useEffect(() => {
    if (settledByHand) revealStatus();
  }, [settledByHand]);
  return <div className={styles.tool}>
    <div className={styles.toolbar}>
      <div className={styles.commands}>
        <button className={controls.button} disabled={busy || !canExecute || byHand || handActive} title={executorOff} onClick={() => execute('run')}><Play size={16} />Run workflow</button>
        <button className={controls.button} disabled={busy || !canExecute || byHand || handActive} title={executorOff} onClick={() => execute('step')}><SkipForward size={16} />Step</button>
        <button className={controls.iconButton} disabled={!busy} title="Stop" aria-label="Stop" onClick={() => controllerRef.current?.abort()}><Square size={16} /><span className={controls.iconLabel}>Stop</span></button>
        <button className={controls.iconButton} title="Reset" aria-label="Reset" onClick={() => resetTo()}><RotateCcw size={18} /><span className={controls.iconLabel}>Reset</span></button>
      </div>
      <div ref={statusRef} className={styles.summary} role="status" aria-label="Workflow status" aria-live="polite"><strong className={trace.status === 'complete' || (settledByHand && !missing) ? styles.good : ''}>{statusText}</strong><span>{stepsText}</span></div>
    </div>
    <div className={styles.experience}>
        {error && <p role="alert" className={controls.error}>{error}</p>}
        <div className={styles.fixture} ref={rootRef} data-phase={site.phase} data-title={site.title} data-room={site.room} aria-label="Synthetic scheduling site">
          <header><div><span className={styles.eyebrow}>SYNTHETIC SITE, BUILT FOR THIS DEMO</span><h3>Lab reservations</h3></div><button ref={reserveRef} className={controls.button} disabled={!canExecute || site.dialogOpen || site.phase === 'saving'} onClick={openByHand}>{config.failure === 'label-drift' ? 'New reservation' : 'Reserve slot'}</button></header>
          <div className={styles.siteBody}>
            {site.toast !== 'none' && <p role="status" aria-label="Fixture notice" data-toast={site.toast} className={site.toast === 'success' ? styles.good : styles.warn}>{site.toast === 'success' ? 'Reservation saved' : 'Reservation could not be saved'}</p>}
            {replaced && <p className={styles.muted}>This app holds one reservation: this save replaced the earlier one.</p>}
            <table><thead><tr><th scope="col">Reservation</th><th scope="col">Room</th><th scope="col">State</th></tr></thead><tbody>
              {site.record ? <tr data-record-id={site.record.id} data-room={site.record.room}><td data-field="title">{site.record.title}</td><td>{ROOM_LABELS[site.record.room]}</td><td className={`${styles.good} ${styles.state}`}>Committed</td></tr> : <tr><td colSpan={3} className={styles.empty}>No reservations</td></tr>}
            </tbody></table>
            {site.dialogOpen && <div className={styles.dialog} role="dialog" aria-label="Reservation" aria-modal="false" onKeyDown={dialogKeys}>
              <div className={styles.dialogHeading}><h3>New reservation</h3><button className={controls.iconButton} disabled={!canExecute} aria-label="Cancel reservation" title="Cancel reservation" onClick={cancelByHand}><X size={17} /></button></div>
              <form onSubmit={submit}>
                <label>Reservation title<input ref={titleRef} name="title" aria-label="Reservation title" required minLength={3} maxLength={60} pattern=".{3,60}" value={site.title} disabled={!canExecute || site.phase === 'saving'} onInput={event => manual({ type: 'fill', value: event.currentTarget.value })} onChange={() => {}} /></label>
                <label>Room<select name="room" aria-label="Room" value={site.room} disabled={!canExecute || site.phase === 'saving'} onChange={event => manual({ type: 'select', value: event.target.value as Config['room'] })}><option value="north">North lab</option><option value="south">South lab</option></select></label>
                <button className={controls.button} type="submit" disabled={!canExecute || site.phase === 'saving'}>Save reservation</button>
                {site.phase === 'saving' && <span role="status">Saving reservation…</span>}
              </form>
            </div>}
          </div>
        </div>
        <section className={styles.conditions} aria-label="Completion gate"><h3>Completion gate: done only when all {conditions.length} hold</h3><ul>{conditions.map(condition => <li key={condition.label} data-met={condition.met} className={condition.met ? styles.good : styles.muted}>{condition.met ? <Check size={14} /> : <span className={styles.unmet}>○</span>}{condition.label}</li>)}</ul></section>
    </div>
    <div className={styles.hood} ref={hoodRef}>
      <UnderTheHood summary="Settings, the action plan and the step-by-step trace">
        <div className={styles.configuration} aria-label="Workflow configuration">
          <label className={controls.field}>Task title<input value={config.title} maxLength={60} disabled={busy} onChange={event => changeConfig({ title: event.target.value })} /></label>
          <label className={controls.field}>Requested room<select value={config.room} disabled={busy} onChange={event => changeConfig({ room: event.target.value as Config['room'] })}><option value="north">North lab</option><option value="south">South lab</option></select></label>
          <label className={controls.field}>Injected failure<select value={config.failure} disabled={busy} onChange={event => changeConfig({ failure: event.target.value as Config['failure'] })}>
            <option value="none">None</option><option value="label-drift">Button renamed</option><option value="reject-save">Save rejected</option><option value="false-toast">Notice shown, nothing saved</option>
          </select></label>
          <label className={controls.field}>Selector policy<select value={config.selectorPolicy} disabled={busy} onChange={event => changeConfig({ selectorPolicy: event.target.value as Config['selectorPolicy'] })}><option value="fallback">Alias fallback: one known alternate name</option><option value="strict">Exact name only</option></select></label>
          <label className={controls.field}>Wait policy<select value={config.waitPolicy} disabled={busy} onChange={event => changeConfig({ waitPolicy: event.target.value as Config['waitPolicy'] })}><option value="condition">Conditions: until the gate holds</option><option value="fixed">{`Fixed ${FIXED_WAIT_MS} ms`}</option></select></label>
          <label className={styles.range}>Save latency<input type="range" min={100} max={2000} step={100} value={config.latencyMs} disabled={busy} onChange={event => changeConfig({ latencyMs: Number(event.target.value) })} /><output>{config.latencyMs} ms</output></label>
          <label className={controls.field}>Wait timeout<select value={config.timeoutMs} disabled={busy} onChange={event => changeConfig({ timeoutMs: Number(event.target.value) })}>
            {choicesWith(TIMEOUT_CHOICES, config.timeoutMs).map(ms => <option key={ms} value={ms}>{ms} ms</option>)}
          </select></label>
          <label className={controls.field}>Action budget<select value={config.budget} disabled={busy} onChange={event => changeConfig({ budget: Number(event.target.value) })}>
            {choicesWith(BUDGET_CHOICES, config.budget).map(n => <option key={n} value={n}>{n} {n === 1 ? 'action' : 'actions'}</option>)}
          </select></label>
        </div>
        <div className={styles.plan}><h3>Action plan</h3><ol>{plan.map((action, index) => <li key={action.kind} data-done={trace.entries[index]?.status === 'ok'}><span>{index + 1}</span><div><b>{action.label}</b><code>{action.target}</code>{action.value !== undefined && <small>{JSON.stringify(action.value)}</small>}</div></li>)}</ol></div>
        <section className={styles.trace} aria-label="Observed action trace">
          <div className={styles.traceHeading}>
            <h3>Observed trace</h3>
            <div className={styles.commands}>
              <button className={controls.iconButton} disabled={busy} title="Import trace" aria-label="Import trace" onClick={() => uploadRef.current?.click()}><Upload size={18} /><span className={controls.iconLabel}>Import trace</span></button>
              <input ref={uploadRef} type="file" accept="application/json,.json" hidden aria-label="Trace file" onChange={importTrace} />
              <button className={controls.iconButton} disabled={busy || (trace.entries.length === 0 && site.phase === 'idle')} title="Export trace" aria-label="Export trace" onClick={exportTrace}><Download size={18} /><span className={controls.iconLabel}>Export trace</span></button>
            </div>
          </div>
          {importNote && (importNote.kind === 'refused'
            ? <p ref={importNoteRef} role="alert" className={controls.error}>{importNote.text}</p>
            : <p ref={importNoteRef} role="status" className={controls.hint}>{importNote.text}</p>)}
          {trace.entries.length === 0 ? <p className={styles.muted}>No actions observed.</p> : <div className={styles.traceLayout}>
            <div className={styles.timeline}>{trace.entries.map((item, index) => <button key={index} aria-label={`Inspect step ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)}>
              <span>{index + 1}</span><div><b>{item.action.label}</b><small>{item.status} · {item.elapsedMs} ms</small><i style={{ width: `${item.elapsedMs / largestDuration * 100}%` }} /></div><ChevronRight size={15} />
            </button>)}</div>
            {entry && <div className={styles.inspector} aria-label="Selected action evidence"><h4>{entry.action.label}</h4><p>{entry.reason}</p>
              <dl>{[['Dialog', entry.before.dialogOpen, entry.after.dialogOpen], ['Form valid', entry.before.formValid, entry.after.formValid], ['Save phase', entry.before.phase, entry.after.phase], ['Record', entry.before.recordTitle, entry.after.recordTitle], ['Notice', entry.before.toast, entry.after.toast]].map(([label, before, after]) => <div key={String(label)}><dt>{label}</dt><dd><code>{JSON.stringify(before)}</code><ChevronRight size={13} /><code>{JSON.stringify(after)}</code></dd></div>)}</dl>
              <p className={styles.metric}>Role-set distance: how much the page&apos;s structure changed, not a success measure <span className={styles.bar} role="img" aria-label={`Page change ${(entry.roleDelta * 100).toFixed(0)}%`}><i style={{ width: `${entry.roleDelta * 100}%` }} /></span><span>{(entry.roleDelta * 100).toFixed(0)}%</span></p>
              <details><summary>Raw before / after evidence</summary><pre>{JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}</pre></details>
            </div>}
          </div>}
        </section>
        {replay && frame && <section ref={replayRef} className={styles.replay} aria-label="Recomputed event replay">
          <div><h3>Recomputed event replay</h3><button className={controls.button} onClick={() => resetTo(replay.config)}><Play size={15} />Load configuration for a fresh run</button></div>
          <label className={styles.range}>Replay frame<input type="range" min={0} max={replay.frames.length - 1} value={replayFrame} onChange={event => setReplayFrame(Number(event.target.value))} /><output>{replayFrame}/{replay.frames.length - 1}</output></label>
          <p className={styles.muted}>This replays the imported file, not this tab&rsquo;s run, whose trace is above. A reduced state reconstruction, not a new browser execution or a Playwright trace.</p>
          <dl><div><dt>Phase</dt><dd>{frame.phase}</dd></div><div><dt>Dialog</dt><dd>{frame.dialogOpen ? 'Open' : 'Closed'}</dd></div><div><dt>Record</dt><dd>{frame.record ? `${frame.record.title} / ${ROOM_LABELS[frame.record.room]}` : 'None'}</dd></div><div><dt>Completion</dt><dd>{completion(observeModel(frame), replay.config).complete ? 'Conditions met' : 'Conditions unmet'}</dd></div></dl>
        </section>}
        <p className={styles.fidelity}>A fixed plan on the app&apos;s real controls, with records kept in memory. Nothing leaves the page: no model call, no network request, no screenshot. The trace samples the page&apos;s state before and after each action.</p>
      </UnderTheHood>
    </div>
  </div>;
}
