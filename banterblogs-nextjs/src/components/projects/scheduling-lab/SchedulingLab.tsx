'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Play, RotateCcw, Upload, StepForward, ChartNoAxesCombined, SlidersHorizontal, Table2 } from 'lucide-react';
import { advance, analyze, exportTrace, freshSession, replayTrace } from '@/lib/projects/scheduling-lab/engine';
import { presetTitles, syntheticEvents } from '@/lib/projects/scheduling-lab/fixtures';
import { MAX_TRACE_BYTES, type Config, type Preset, type Session } from '@/lib/projects/scheduling-lab/types';
import Timeline from './Timeline';
import styles from './lab.module.css';

const stamp = (at: number | null) => at === null ? 'Not scheduled' : new Date(at).toISOString().replace('T', ' ').replace('.000Z', 'Z');
const seconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

export default function SchedulingLab() {
  const [draft, setDraft] = useState<Session>(() => freshSession());
  const [run, setRun] = useState<Session>(() => freshSession());
  const [preset, setPreset] = useState<Preset | 'replay'>('baseline');
  const [selected, setSelected] = useState('E01');
  const [view, setView] = useState<'timeline' | 'ledger'>('timeline');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  useEffect(() => () => { revision.current++; }, []);
  const result = useMemo(() => analyze(run), [run]);
  const pending = JSON.stringify(run) !== JSON.stringify(draft);
  const event = result.events.find(e => e.id === selected)!;
  const selectedDraft = draft.events.find(e => e.id === selected)!;
  const violations = result.violations.filter(v => v.eventId === selected);

  function edit(next: Session) { revision.current++; setDraft({ ...next, processed: 0 }); setError(''); setNotice(''); }
  function configure<K extends keyof Config>(key: K, value: Config[K]) { edit({ ...draft, config: { ...draft.config, [key]: value } }); }
  function reset(key: Preset = preset === 'replay' ? 'baseline' : preset) {
    revision.current++;
    const next = freshSession(key); setDraft(next); setRun(next); setPreset(key); setSelected('E01'); setError(''); setNotice('');
  }
  function recompute() {
    revision.current++;
    try { analyze(draft); setRun(structuredClone(draft)); setError(''); setNotice('Schedule recomputed locally.'); }
    catch (failure) { console.error('Scheduling configuration rejected', failure); setError(failure instanceof Error ? failure.message : 'Invalid scheduling configuration.'); }
  }
  function step() {
    revision.current++;
    const next = advance(run), advanced = analyze(next);
    setRun(next); setDraft(next); setSelected(advanced.simulation.processedIds.at(-1) ?? selected); setNotice('Virtual clock advanced; nothing was delivered.');
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportTrace(run), null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'scheduling-lab-v1.json'; anchor.click(); URL.revokeObjectURL(url); setNotice('JSON trace exported.');
  }
  async function replay(file: File | undefined) {
    if (!file) return;
    const request = ++revision.current;
    try {
      if (file.size > MAX_TRACE_BYTES) throw new Error('Trace exceeds the 250 KB limit.');
      const text = await file.text();
      if (request !== revision.current) return;
      const next = replayTrace(text);
      setRun(next); setDraft(next); setPreset('replay'); setSelected(next.events[0].id); setError(''); setNotice('Replayed session; schedule recomputed.');
    } catch (failure) {
      if (request !== revision.current) return;
      console.error('Scheduling replay rejected', failure); setError(`Replay rejected: ${failure instanceof Error ? failure.message : 'Invalid trace.'}`);
    } finally { if (request === revision.current && upload.current) upload.current.value = ''; }
  }
  return <section id="demo" className={styles.tool} aria-label="Seeded scheduling simulator">
    <div className={styles.toolbar}>
      <label>Scenario<select aria-label="Scenario" value={preset} onChange={e => reset(e.target.value as Preset)}>{Object.entries(presetTitles).map(([key, title]) => <option key={key} value={key}>{title}</option>)}{preset === 'replay' && <option value="replay">Replayed configuration</option>}</select></label>
      <label>Bounds policy<select aria-label="Bounds policy" value={draft.config.boundsPolicy} onChange={e => configure('boundsPolicy', e.target.value as Config['boundsPolicy'])}><option value="forward">Forward feasible</option><option value="clamp-audit">Bounded clamp audit</option></select></label>
      <div className={styles.commands}>
        <button onClick={recompute}><Play size={16} aria-hidden="true" />Recompute schedule</button>
        <button className={styles.settingsToggle} aria-label="Schedule settings" title="Schedule settings" aria-expanded={settingsOpen} aria-controls="schedule-settings" onClick={() => setSettingsOpen(open => !open)}><SlidersHorizontal size={18} /></button>
        <button onClick={step} disabled={pending || run.processed >= result.metrics.admitted} aria-label="Step simulation" title="Step simulation"><StepForward size={18} aria-hidden="true" /></button>
        <button onClick={() => reset()} aria-label="Reset schedule" title="Reset schedule"><RotateCcw size={18} aria-hidden="true" /></button>
        <button onClick={download} disabled={pending} aria-label="Export JSON" title="Export JSON"><Download size={18} aria-hidden="true" /></button>
        <button onClick={() => upload.current?.click()} aria-label="Replay JSON" title="Replay JSON"><Upload size={18} aria-hidden="true" /></button>
        <input hidden type="file" accept=".json,application/json" ref={upload} aria-label="JSON replay file" onChange={e => void replay(e.target.files?.[0])} />
      </div>
    </div>
    <div className={styles.status} aria-live="polite"><strong className={pending ? styles.amber : styles.green}>{pending ? 'Pending edits' : 'Computed locally'}</strong><span>{pending ? 'Last-run timeline; recomputation required.' : `Seed ${run.config.seed} / ${run.processed} simulated processed / delivery simulated only`}</span></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.workspace}>
      <aside id="schedule-settings" className={`${styles.controls} ${settingsOpen ? styles.controlsOpen : ''}`} aria-label="Scheduling configuration">
        <h2>Configuration</h2>
        <div className={styles.controlGrid}>
          <label>Seed<input aria-label="Seed" type="number" min={0} max={4294967295} step={1} value={Number.isNaN(draft.config.seed) ? '' : draft.config.seed} onChange={e => configure('seed', e.target.valueAsNumber)} /></label>
          <label>Events <output>{draft.events.length}</output><input aria-label="Event count" type="range" min={1} max={48} value={draft.events.length} onChange={e => { edit({ ...draft, events: syntheticEvents(Number(e.target.value)) }); setSelected('E01'); }} /></label>
          <label className={styles.fullWidth}>Campaign start / UTC<input aria-label="Campaign start UTC" type="datetime-local" step={1} value={draft.config.start.slice(0, -1)} onChange={e => configure('start', Number.isFinite(e.target.valueAsNumber) ? new Date(e.target.valueAsNumber).toISOString().replace('.000Z', 'Z') : '')} /></label>
          <label>Duration / minutes<input aria-label="Duration minutes" type="number" min={1} max={4320} value={Number.isNaN(draft.config.durationMinutes) ? '' : draft.config.durationMinutes} onChange={e => configure('durationMinutes', e.target.valueAsNumber)} /></label>
          <label>Typing / WPM <output>{draft.config.wpmMean}</output><input aria-label="Mean typing WPM" type="range" min={30} max={80} value={draft.config.wpmMean} onChange={e => configure('wpmMean', Number(e.target.value))} /></label>
          <label className={styles.fullWidth}>Pause probability <output>{Math.round(draft.config.pauseProbability * 100)}%</output><input aria-label="Pause probability" type="range" min={0} max={1} step={0.05} value={draft.config.pauseProbability} onChange={e => configure('pauseProbability', Number(e.target.value))} /></label>
        </div>
        <details className={styles.advanced}>
          <summary>Timing &amp; bounds</summary>
          <div className={styles.controlGrid}>
            <label>WPM deviation <output>{draft.config.wpmStd}</output><input aria-label="WPM deviation" type="range" min={0} max={30} value={draft.config.wpmStd} onChange={e => configure('wpmStd', Number(e.target.value))} /></label>
            <label>Repeat jitter / s <output>{draft.config.jitterStd}</output><input aria-label="Repeated interval jitter seconds" type="range" min={0} max={90} value={draft.config.jitterStd} onChange={e => configure('jitterStd', Number(e.target.value))} /></label>
            <label>Cluster share <output>{Math.round(draft.config.clusterShare * 100)}%</output><input aria-label="Cluster share" type="range" min={0} max={0.6} step={0.05} value={draft.config.clusterShare} onChange={e => configure('clusterShare', Number(e.target.value))} /></label>
            <label>Distribution<select value={draft.config.distribution} onChange={e => configure('distribution', e.target.value as Config['distribution'])}><option value="mixed">Mixed</option><option value="uniform">Uniform</option></select></label>
            <label>Opening / UTC<select value={draft.config.businessStart} onChange={e => configure('businessStart', Number(e.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label>
            <label>Closing / UTC<select value={draft.config.businessEnd} onChange={e => configure('businessEnd', Number(e.target.value))}>{Array.from({ length: 24 }, (_, index) => <option key={index} value={index + 1}>{String(index + 1).padStart(2, '0')}:00</option>)}</select></label>
            <label>Burst limit<input type="number" min={1} max={8} value={Number.isNaN(draft.config.burstLimit) ? '' : draft.config.burstLimit} onChange={e => configure('burstLimit', e.target.valueAsNumber)} /></label>
            <label>Window / seconds<input type="number" min={15} max={300} value={Number.isNaN(draft.config.burstWindowSeconds) ? '' : draft.config.burstWindowSeconds} onChange={e => configure('burstWindowSeconds', e.target.valueAsNumber)} /></label>
          </div>
        </details>
        <p className={styles.small}>UTC hours {String(draft.config.businessStart).padStart(2, '0')}:00-{String(draft.config.businessEnd).padStart(2, '0')}:00 / {draft.config.burstLimit} events per {draft.config.burstWindowSeconds}s</p>
      </aside>
      <div className={styles.schedule}>
        <div className={styles.heading}><h2>Schedule</h2><div className={styles.segment}><button aria-label="Timeline view" title="Timeline" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}><ChartNoAxesCombined size={18} /></button><button aria-label="Ledger view" title="Ledger" aria-pressed={view === 'ledger'} onClick={() => setView('ledger')}><Table2 size={18} /></button></div></div>
        <div className={styles.metrics}><div><span>Admitted</span><strong>{pending ? '-' : result.metrics.admitted}</strong></div><div><span>Deferred</span><strong>{pending ? '-' : result.metrics.deferred}</strong></div><div><span>Violations</span><strong className={result.violations.length ? styles.red : styles.green}>{pending ? '-' : result.violations.length}</strong></div><div><span>Gap CV</span><strong>{pending || result.metrics.gapCv === null ? '-' : result.metrics.gapCv.toFixed(2)}</strong></div></div>
        <div className={styles.legend}><span className={styles.blue}>Typing</span><span className={styles.amber}>Pause</span><span>Planned slot |</span><span className={styles.green}>Scheduled / open hours</span><span className={styles.red}>Violation</span></div>
        {view === 'timeline' ? <Timeline config={run.config} result={result} selected={selected} enabledIds={draft.events.map(item => item.id)} onSelect={setSelected} /> : <div className={styles.tableScroll}><table><thead><tr><th>Event</th><th>Scheduled / UTC</th><th>Preparation</th><th>Outcome</th></tr></thead><tbody>{result.events.map(item => <tr key={item.id} className={selected === item.id ? styles.selectedRow : ''}><td><button aria-label={`Inspect event ${item.id}`} disabled={!draft.events.some(e => e.id === item.id)} onClick={() => setSelected(item.id)}>{item.id}</button></td><td>{stamp(item.scheduledAt)}</td><td>{seconds(item.typingMs + item.pauseMs)}</td><td>{item.scheduledAt === null ? 'deferred' : result.violations.some(v => v.eventId === item.id) ? 'violations' : result.simulation.processedIds.includes(item.id) ? 'simulated processed' : 'planned'}</td></tr>)}</tbody></table></div>}
        <p className={styles.small}>Virtual clock: {stamp(result.simulation.clock)}. No external dispatch.</p>
      </div>
    </div>
    <section className={styles.inspector} aria-label="Selected event reasoning">
      <div><h2>{selected} / synthetic event</h2><label>Event text<textarea aria-label="Event text" maxLength={400} rows={3} value={selectedDraft.text} onChange={e => edit({ ...draft, events: draft.events.map(item => item.id === selected ? { ...item, text: e.target.value } : item) })} /></label><p className={styles.small}>Seeded arithmetic and simulated processing only. No live agent adjustment handler.</p></div>
      {pending ? <p className={styles.amber}>Reasoning pending recomputation.</p> : <div>
        <p className={styles.reasonSummary}>{event.wordCount} words / {event.sampledWpm.toFixed(2)} WPM / typing {seconds(event.typingMs)} / pause {seconds(event.pauseMs)}</p>
        <p className={styles.small}>Cluster shift {seconds(event.clusterShiftMs)} / interval jitter {seconds(event.intervalJitterMs)} / burst delay {seconds(event.burstDelayMs)}</p>
        <dl className={styles.stages}>{event.stages.map(stage => <div key={stage.name}><dt>{stage.name}</dt><dd>{stamp(stage.at)}</dd></div>)}</dl>
        {event.deferral && <p className={styles.amber}>{event.deferral}</p>}
        {violations.length ? <ul className={styles.violations}>{violations.map(v => <li key={v.code}><strong>{v.code}</strong><span>{v.detail}</span></li>)}</ul> : <p className={styles.green}>{event.scheduledAt === null ? 'Infeasible work was not forced into the schedule.' : 'No invariant violations for this event.'}</p>}
      </div>}
    </section>
    <p className={styles.small} aria-live="polite">{notice || 'Fresh synthetic workload / reproducible local seed / simulated delivery'}</p>
  </section>;
}
