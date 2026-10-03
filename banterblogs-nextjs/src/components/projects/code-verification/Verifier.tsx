'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { ArrowRight, Check, Code2, Download, FileDiff, FlaskConical, Play, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { z } from 'zod';
import {
  CANDIDATES, TASKS, MAX_ASSERTIONS, evaluate, getTask, implementationSource,
  parseJson, replay, resetSession, runSession, sourceDiff,
  type Assertion, type CandidateId, type ResultRow, type RunConfig, type TaskId, type Value,
} from '@/lib/projects/code-verification/engine';
import { controls } from '../controls';
import { span } from '../geometry';
import styles from './verifier.module.css';

// Upper bound comfortably contains all 16 maximum-sized assertion observations.
const MAX_IMPORT_BYTES = 2_000_000;
const TRANSITIONS = [
  { key: 'fail-pass', label: 'Fail → Pass', field: 'repaired', name: 'Repair', className: styles.good },
  { key: 'pass-pass', label: 'Pass → Pass', field: 'preserved', name: 'Preserved', className: styles.blue },
  { key: 'fail-fail', label: 'Fail → Fail', field: 'stillBroken', name: 'Still broken', className: styles.warn },
  { key: 'pass-fail', label: 'Pass → Fail', field: 'regressed', name: 'Regression', className: styles.bad },
] as const;

function errorText(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues.map(issue => `${issue.path.join('.') || 'Input'}: ${issue.message}`).join(' ');
  return error instanceof Error ? error.message : 'The operation could not be completed.';
}

function json(value: unknown): string { return JSON.stringify(value); }

function DomainFigure({ row, taskId }: { row: ResultRow; taskId: TaskId }) {
  const lanes = [
    { label: 'Input', value: row.input },
    { label: 'Buggy', value: row.baseline.actual },
    { label: 'After', value: row.after.actual },
    { label: 'Expected', value: row.expected },
  ];
  if (taskId === 'unique') return (
    <figure className={styles.figure} aria-label="String ordering evidence">
      {lanes.map(lane => <div className={styles.stringLane} key={lane.label}>
        <span className={styles.laneLabel}>{lane.label}</span>
        <div className={styles.tokens}>{(lane.value as string[]).map((value, index) =>
          <span className={styles.token} key={`${index}-${value}`}><small>{index + 1}</small>{json(value)}</span>)}
          {lane.value.length === 0 && <span className={styles.muted}>∅</span>}
        </div>
      </div>)}
      <figcaption>Positions encode output order; spelling is shown verbatim.</figcaption>
    </figure>
  );
  const values = lanes.flatMap(lane => (lane.value as [number, number][]).flat());
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  // a point interval still draws as a dot's width
  const extent = Math.max(max - min, 1);
  return <figure className={styles.figure} aria-label="Interval endpoint evidence">
    {lanes.map(lane => <div className={styles.intervalLane} key={lane.label}>
      <span className={styles.laneLabel}>{lane.label}</span>
      <div className={styles.rangeStack}>
        {(lane.value as [number, number][]).map(([start, end], index) => <div className={styles.rangeTrack} key={index}>
          <div className={styles.range} style={span(start, end, min, min + extent)}>
            <i /><i />
          </div>
          <span className={styles.rangeValue}>{start} … {end}</span>
        </div>)}
        {lane.value.length === 0 && <span className={styles.muted}>∅</span>}
      </div>
    </div>)}
    <div className={styles.axis}><span>{min}</span><span>{max}</span></div>
    <figcaption>Closed endpoints share one scale. Each range occupies its own lane.</figcaption>
  </figure>;
}

/** the verifier opened on a selection from the matrix, already run */
const opened = (initial: RunConfig) => runSession({ config: initial, report: null });

export function Verifier({ initial }: { initial: RunConfig }) {
  const [session, setSession] = useState(() => opened(initial));
  // the first failing row, else the first: the evidence worth reading first
  const firstFailing = (rows: ResultRow[] = []) => Math.max(0, rows.findIndex((r) => !r.after.passed));
  const [selectedIndex, setSelectedIndex] = useState(() => firstFailing(session.report?.rows));
  const [error, setError] = useState<string | null>(null);
  const [codeView, setCodeView] = useState<'diff' | 'code'>('diff');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [draftInput, setDraftInput] = useState(() => json(getTask(initial.taskId).tests[0].input));
  const [draftExpected, setDraftExpected] = useState(() => json(getTask(initial.taskId).tests[0].expected));
  const importRef = useRef<HTMLInputElement>(null);
  const { config, report } = session;
  const task = getTask(config.taskId);
  const selectedRow = report?.rows[selectedIndex];
  const candidate = CANDIDATES.find(item => item.id === config.candidateId)!;
  const activeCandidate = config.mode === 'synthesis' ? 'fixed' : config.candidateId;

  function updateConfig(change: Partial<RunConfig>) {
    setSession({ config: { ...config, ...change }, report: null });
    setSelectedIndex(0);
    setError(null);
  }

  function changeTask(taskId: TaskId) {
    const next = resetSession(taskId);
    if (config.mode === 'synthesis') {
      next.config.mode = 'synthesis';
      next.config.assertions = [getTask(taskId).tests[0]];
    }
    setSession(next);
    setDraftInput(json(getTask(taskId).tests[0].input));
    setDraftExpected(json(getTask(taskId).tests[0].expected));
    setSelectedIndex(0);
    setError(null);
  }

  function changeMode(mode: RunConfig['mode']) {
    updateConfig({ mode, assertions: mode === 'synthesis' && config.assertions.length === 0 ? [task.tests[0]] : config.assertions });
  }

  function run() {
    try { setSession(runSession(session)); setSelectedIndex(0); setError(null); }
    catch (cause) { setError(errorText(cause)); }
  }

  function addAssertion(input: unknown, expected: unknown, label?: string) {
    try {
      let sequence = 1;
      while (config.assertions.some(assertion => assertion.id === `authored-${sequence}`)) sequence++;
      const assertion: Assertion = { id: `authored-${sequence}`, label: label ?? `Authored assertion ${sequence}`, input, expected };
      const next = { ...config, assertions: [...config.assertions, assertion] };
      evaluate(next);
      updateConfig({ assertions: next.assertions });
    } catch (cause) { setError(errorText(cause)); }
  }

  function addDraft() {
    try { addAssertion(parseJson(draftInput), parseJson(draftExpected)); }
    catch (cause) { setError(errorText(cause)); }
  }

  function reset() {
    const next = opened(initial);
    setSession(next); setSelectedIndex(firstFailing(next.report?.rows)); setError(null); setCodeView('diff'); setInspectorOpen(false);
    setDraftInput(json(getTask(initial.taskId).tests[0].input)); setDraftExpected(json(getTask(initial.taskId).tests[0].expected));
  }

  function exportReport() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `verification-${config.taskId}-${config.mode}.json`;
    document.body.appendChild(anchor);
    anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }

  async function importReport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Report must be under 2 MB.');
      const next = replay(JSON.parse(await file.text()));
      setSession({ config: next.config, report: next });
      setSelectedIndex(0); setError(null);
      setDraftInput(json(getTask(next.config.taskId).tests[0].input));
      setDraftExpected(json(getTask(next.config.taskId).tests[0].expected));
    } catch (cause) { setError(`Replay rejected: ${errorText(cause)}`); }
    event.target.value = '';
  }

  return <div className={styles.tool}>
    <div className={styles.toolbar}>
      <div className={styles.segmented} aria-label="Verification mode">
        <button type="button" aria-pressed={config.mode === 'repair'} onClick={() => changeMode('repair')}><Code2 size={16} />Code repair</button>
        <button type="button" aria-pressed={config.mode === 'synthesis'} onClick={() => changeMode('synthesis')}><FlaskConical size={16} />Test synthesis</button>
      </div>
      <div className={styles.actions}>
        <button className={controls.iconButton} onClick={() => importRef.current?.click()} aria-label="Replay JSON report" title="Replay JSON report"><Upload size={18} /></button>
        <input ref={importRef} type="file" accept="application/json,.json" hidden aria-label="Import report file" onChange={importReport} />
        <button className={controls.iconButton} onClick={exportReport} disabled={!report} aria-label="Export JSON report" title="Export JSON report"><Download size={18} /></button>
        <button className={controls.iconButton} onClick={reset} aria-label="Reset verifier" title="Reset verifier"><RotateCcw size={18} /></button>
      </div>
    </div>
    <div className={styles.workspace}>
      <div className={styles.configuration}>
        <label className={controls.field}>Task
          <select value={config.taskId} onChange={event => changeTask(event.target.value as TaskId)}>
            {TASKS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <p className={styles.requirement}>{task.requirement}</p>
        <p className={styles.fault}><span>Baseline fault</span>{task.fault}</p>
        {config.mode === 'repair' ? <>
          <label className={controls.field}>Implementation
            <select value={config.candidateId} onChange={event => updateConfig({ candidateId: event.target.value as CandidateId })}>
              {CANDIDATES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <p className={styles.muted}>{candidate.description}</p>
          <label className={controls.field}>Verification suite
            <select value={config.scope} onChange={event => updateConfig({ scope: event.target.value as RunConfig['scope'] })}>
              <option value="full">Full · 3 repair + 3 preserve</option>
              <option value="smoke">Smoke · 1 repair + 1 preserve</option>
            </select>
          </label>
        </> : <>
          <div className={styles.synthesisHeader}><h3>Candidate assertions</h3><button className={controls.iconButton} aria-label="Clear assertions" title="Clear assertions" onClick={() => updateConfig({ assertions: [] })}><Trash2 size={16} /></button></div>
          <ul className={styles.assertions}>
            {config.assertions.map(assertion => <li key={assertion.id}><span>{assertion.label}</span><button className={controls.iconButton} aria-label={`Remove ${assertion.label}`} title={`Remove ${assertion.label}`} onClick={() => updateConfig({ assertions: config.assertions.filter(item => item.id !== assertion.id) })}><X size={14} /></button></li>)}
          </ul>
          <div className={styles.presets}>
            <button disabled={config.assertions.length >= MAX_ASSERTIONS} onClick={() => addAssertion(task.tests[0].input, task.tests[0].expected, 'Bug reproducer')}><Plus size={14} />Reproducer</button>
            <button disabled={config.assertions.length >= MAX_ASSERTIONS} onClick={() => addAssertion(task.tests[3].input, task.tests[3].expected, 'Already passing')}><Plus size={14} />Already passing</button>
            <button disabled={config.assertions.length >= MAX_ASSERTIONS} onClick={() => addAssertion(task.tests[0].input, [], 'Wrong expectation')}><Plus size={14} />Broken assertion</button>
          </div>
        </>}
        <button className={controls.button} onClick={run}><Play size={16} />{config.mode === 'repair' ? 'Run verification' : 'Run synthesis'}</button>
        <p className={styles.runtime}>Browser evaluation · deterministic, synthetic fixtures.<br />{config.mode === 'synthesis' ? 'Assertions run on baseline and general repair.' : 'Curated functions only; no arbitrary code execution.'}</p>
      </div>
      <div className={styles.results}>
        <div className={styles.verdict} role="status" aria-live="polite">
          <span className={report ? report.resolved ? styles.good : styles.warn : styles.muted}>
            {report ? report.resolved ? <Check size={20} /> : <X size={20} /> : <FlaskConical size={20} />}
            <strong>{!report ? 'Not run' : !report.resolved ? 'Not resolved' : config.mode === 'synthesis' ? 'Reproduces' : config.scope === 'smoke' ? 'Suite satisfied' : 'Resolved on full suite'}</strong>
          </span>
          <p>{report?.reason ?? 'Awaiting evaluation.'}</p>
        </div>
        <figure className={styles.transitions} aria-label="Baseline-to-after test transitions">
          {TRANSITIONS.map(transition => <div key={transition.key} className={transition.className}>
            <span>{transition.label}</span><strong>{report ? report.counts[transition.field] : '—'}</strong><small>{transition.name}</small>
          </div>)}
        </figure>
        {error && <p className={controls.error} role="alert">{error}</p>}
        {!report ? <div className={styles.pending}>
          <h3>{config.mode === 'repair' ? 'Selected test suite' : 'Buggy → fixed comparison'}</h3>
          <ol>{(config.mode === 'synthesis' ? config.assertions : config.scope === 'full' ? task.tests : [task.tests[0], task.tests[3]]).map(item => <li key={item.id}>{item.label}</li>)}</ol>
          {config.mode === 'synthesis' && config.assertions.length === 0 && <p>No candidate assertions.</p>}
        </div> : <div className={styles.testList} aria-label="Per-test results">
          <div className={styles.testHeader}><span>Assertion</span><span>Buggy</span><span>{config.mode === 'synthesis' ? 'Fixed' : 'After'}</span></div>
          {report.rows.map((row, index) => <button key={row.id} onClick={() => setSelectedIndex(index)} aria-label={`Inspect ${row.label}`} aria-pressed={selectedIndex === index}>
            <span><b>{row.label}</b><small>{row.group === 'authored' ? 'Authored' : row.group === 'repair' ? 'Fail-to-pass requirement' : 'Pass-to-pass requirement'}</small></span>
            <span className={row.baseline.passed ? styles.good : styles.warn}>{row.baseline.passed ? 'PASS' : 'FAIL'}</span>
            <span className={row.after.passed ? styles.good : styles.bad}>{row.after.passed ? 'PASS' : 'FAIL'}</span>
          </button>)}
        </div>}
        {selectedRow && <section className={styles.evidence} aria-label="Selected test evidence">
          <div className={styles.evidenceTitle}><h3>{selectedRow.label}</h3><span>{selectedRow.baseline.passed ? 'Pass' : 'Fail'}<ArrowRight size={14} />{selectedRow.after.passed ? 'Pass' : 'Fail'}</span></div>
          <DomainFigure row={selectedRow} taskId={config.taskId} />
          <dl className={styles.values}>{[
            ['Input', selectedRow.input], ['Expected', selectedRow.expected], ['Buggy actual', selectedRow.baseline.actual], ['After actual', selectedRow.after.actual],
          ].map(([label, value]) => <div key={label as string}><dt>{label as string}</dt><dd><code>{json(value as Value)}</code></dd></div>)}</dl>
        </section>}
      </div>
    </div>
    {config.mode === 'synthesis' && <section className={styles.authoring} aria-labelledby="assertion-heading">
      <div><h3 id="assertion-heading">Author an assertion</h3><span className={styles.muted}>{config.assertions.length}/{MAX_ASSERTIONS} candidates</span></div>
      <div className={styles.editorGrid}>
        <label className={controls.field}>Assertion input (JSON)<textarea rows={3} value={draftInput} spellCheck={false} onChange={event => setDraftInput(event.target.value)} /></label>
        <label className={controls.field}>Expected output (JSON)<textarea rows={3} value={draftExpected} spellCheck={false} onChange={event => setDraftExpected(event.target.value)} /></label>
      </div>
      <button className={controls.button} disabled={config.assertions.length >= MAX_ASSERTIONS} onClick={addDraft}><Plus size={16} />Add assertion</button>
    </section>}
    <details className={styles.codePanel} open={inspectorOpen} onToggle={event => setInspectorOpen(event.currentTarget.open)}>
      <summary><Code2 size={17} />Implementation &amp; replacement diff</summary>
      <div className={styles.codeToolbar}><div className={styles.segmented}>
        <button aria-pressed={codeView === 'diff'} onClick={() => setCodeView('diff')}><FileDiff size={16} />Diff</button>
        <button aria-pressed={codeView === 'code'} onClick={() => setCodeView('code')}><Code2 size={16} />Code</button>
      </div><span className={styles.muted}>{config.mode === 'synthesis' ? 'Fixed oracle' : candidate.label}</span></div>
      <p className={styles.codeNote}>Actual runtime JavaScript; bundling may optimize formatting. Diff replaces the whole function, not a repository patch.</p>
      {inspectorOpen && <pre><code>{(codeView === 'diff' ? sourceDiff(config.taskId, activeCandidate) : implementationSource(config.taskId, activeCandidate)).split('\n').map((line, index) =>
        <span className={codeView === 'diff' ? line.startsWith('+ ') ? styles.good : line.startsWith('- ') ? styles.warn : undefined : undefined} key={index}>{line}{'\n'}</span>)}</code></pre>}
    </details>
  </div>;
}
