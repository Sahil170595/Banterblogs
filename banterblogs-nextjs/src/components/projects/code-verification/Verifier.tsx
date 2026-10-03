'use client';

import { useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { ArrowRight, Check, Code2, Download, FileDiff, FlaskConical, Play, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import {
  CANDIDATES, TASKS, MAX_ASSERTIONS, evaluate, getTask, implementationSource, initialConfig,
  parseJson, replay, runSession,
  type Assertion, type CandidateId, type ResultRow, type RunConfig, type Session, type TaskId, type Value,
} from '@/lib/projects/code-verification/engine';
import { controls } from '../controls';
import { span } from '../geometry';
import { describeRefusal } from '../refusal';
import { revealResult, revealWhenRendered } from '../reveal';
import { changedStretch } from './diff';
import { OPENING_SELECTION, type MatrixSelection } from './SuiteMatrix';
import { GROUP_NAMES, TRANSITION_NAMES } from './vocabulary';
import styles from './verifier.module.css';

// Upper bound comfortably contains all 16 maximum-sized assertion observations.
const MAX_IMPORT_BYTES = 2_000_000;
const TRANSITIONS = [
  { key: 'fail-pass', label: 'Fail → Pass', field: 'repaired', name: TRANSITION_NAMES['fail-pass'], className: styles.good },
  { key: 'pass-pass', label: 'Pass → Pass', field: 'preserved', name: TRANSITION_NAMES['pass-pass'], className: styles.blue },
  { key: 'fail-fail', label: 'Fail → Fail', field: 'stillBroken', name: TRANSITION_NAMES['fail-fail'], className: styles.warn },
  { key: 'pass-fail', label: 'Pass → Fail', field: 'regressed', name: TRANSITION_NAMES['pass-fail'], className: styles.bad },
] as const;

/** where a refusal is answered: beside the control that caused it */
type Refusal = { text: string; at: 'run' | 'author' | 'file' };

const selectionKey = (s: MatrixSelection) => `${s.taskId}/${s.scope}/${s.candidateId}`;
const selectionOf = (config: RunConfig): MatrixSelection => ({ taskId: config.taskId, scope: config.scope, candidateId: config.candidateId });
const configFor = (s: MatrixSelection, mode: RunConfig['mode'], assertions: Assertion[]): RunConfig => ({
  ...initialConfig(s.taskId), candidateId: s.candidateId, scope: s.scope, mode, assertions,
});
/** a synthesis suite starts from the task's own reproducer */
const starterAssertions = (taskId: TaskId): Assertion[] => [getTask(taskId).tests[0]];
/** the verifier opened on a selection, already run */
const opened = (config: RunConfig): Session => runSession({ config, report: null });

function SourceDiff({ taskId, candidateId }: { taskId: TaskId; candidateId: CandidateId }) {
  if (candidateId === 'empty') return <pre><code>No code change.</code></pre>;
  const stretch = changedStretch(implementationSource(taskId, 'empty'), implementationSource(taskId, candidateId));
  return <>
    <p className={styles.diffLabel}>Buggy function, removed characters struck through</p>
    <pre><code>{stretch.prefix}<del>{stretch.removed}</del>{stretch.suffix}</code></pre>
    <p className={styles.diffLabel}>Selected function, added characters marked</p>
    <pre><code>{stretch.prefix}<ins>{stretch.added}</ins>{stretch.suffix}</code></pre>
  </>;
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

/**
 * The verifier under the matrix. The matrix and this panel share one
 * selection: a change on either side moves the other (onSelectionChange), and
 * the assertions a visitor writes are kept per task across switches.
 */
export function Verifier({ selection, onSelectionChange, resultsRef }: {
  selection: MatrixSelection;
  onSelectionChange?: (next: MatrixSelection) => void;
  resultsRef?: RefObject<HTMLDivElement | null>;
}) {
  const [session, setSession] = useState(() => opened(configFor(selection, 'repair', [])));
  // the selection last taken from the matrix, so a change of our own is not taken back
  const [seen, setSeen] = useState(() => selectionKey(selection));
  const [authored, setAuthored] = useState<Partial<Record<TaskId, Assertion[]>>>({});
  // the first failing row, else the first: the evidence worth reading first
  const firstFailing = (rows: ResultRow[] = []) => Math.max(0, rows.findIndex((r) => !r.after.passed));
  const [selectedIndex, setSelectedIndex] = useState(() => firstFailing(session.report?.rows));
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [codeView, setCodeView] = useState<'diff' | 'code'>('diff');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [draftInput, setDraftInput] = useState(() => json(getTask(selection.taskId).tests[0].input));
  const [draftExpected, setDraftExpected] = useState(() => json(getTask(selection.taskId).tests[0].expected));
  const importRef = useRef<HTMLInputElement>(null);
  const evidenceRef = useRef<HTMLElement>(null);
  const { config, report } = session;

  function keepAuthored(): Partial<Record<TaskId, Assertion[]>> {
    const kept = config.mode === 'synthesis' || config.assertions.length > 0 ? { ...authored, [config.taskId]: config.assertions } : authored;
    setAuthored(kept);
    return kept;
  }
  function draftsFor(taskId: TaskId) {
    setDraftInput(json(getTask(taskId).tests[0].input));
    setDraftExpected(json(getTask(taskId).tests[0].expected));
  }
  function load(next: Session) {
    setSession(next);
    setSelectedIndex(firstFailing(next.report?.rows));
    setRefusal(null);
  }

  // a selection made in the matrix: a picked patch opens its evidence in repair
  // mode; a task or suite change keeps the mode and that task's own assertions
  if (selectionKey(selection) !== seen) {
    setSeen(selectionKey(selection));
    const kept = keepAuthored();
    const mode = selection.candidateId !== config.candidateId ? 'repair' : config.mode;
    const assertions = kept[selection.taskId] ?? (mode === 'synthesis' ? starterAssertions(selection.taskId) : []);
    load(opened(configFor(selection, mode, assertions)));
    setFileNotice(null);
    if (selection.taskId !== config.taskId) draftsFor(selection.taskId);
  }

  /** tell the matrix about a selection made here */
  function share(next: MatrixSelection) {
    if (!onSelectionChange) return;
    setSeen(selectionKey(next));
    onSelectionChange(next);
  }

  const task = getTask(config.taskId);
  const repairCount = task.tests.filter(test => test.group === 'repair').length;
  const preserveCount = task.tests.filter(test => test.group === 'preserve').length;
  const selectedRow = report?.rows[selectedIndex];
  const candidate = CANDIDATES.find(item => item.id === config.candidateId)!;
  const activeCandidate = config.mode === 'synthesis' ? 'fixed' : config.candidateId;

  function updateConfig(change: Partial<RunConfig>) {
    const next = { ...config, ...change };
    load({ config: next, report: null });
    if (change.candidateId !== undefined || change.scope !== undefined) share(selectionOf(next));
  }

  function changeTask(taskId: TaskId) {
    const kept = keepAuthored();
    const assertions = kept[taskId] ?? (config.mode === 'synthesis' ? starterAssertions(taskId) : []);
    const next = { ...configFor({ taskId, scope: config.scope, candidateId: config.candidateId }, config.mode, assertions) };
    load({ config: next, report: null });
    draftsFor(taskId);
    share(selectionOf(next));
  }

  function changeMode(mode: RunConfig['mode']) {
    updateConfig({ mode, assertions: mode === 'synthesis' && config.assertions.length === 0 ? starterAssertions(config.taskId) : config.assertions });
  }

  function refuse(cause: unknown, at: Refusal['at'], lead = '') {
    const text = `${lead}${describeRefusal(cause)}`;
    console.warn('Code verification refused input:', text);
    setRefusal({ text, at });
  }

  function run() {
    try { load(runSession(session)); }
    catch (cause) { refuse(cause, 'run'); }
  }

  function addAssertion(input: unknown, expected: unknown, at: Refusal['at'], label?: string) {
    try {
      let sequence = 1;
      while (config.assertions.some(assertion => assertion.id === `authored-${sequence}`)) sequence++;
      const assertion: Assertion = { id: `authored-${sequence}`, label: label ?? `Authored assertion ${sequence}`, input, expected };
      const next = { ...config, assertions: [...config.assertions, assertion] };
      evaluate(next);
      updateConfig({ assertions: next.assertions });
    } catch (cause) { refuse(cause, at); }
  }

  function addDraft() {
    try { addAssertion(parseJson(draftInput), parseJson(draftExpected), 'author'); }
    catch (cause) { refuse(cause, 'author'); }
  }

  /** the page as it opened: the matrix's opening selection, nothing authored */
  function reset() {
    setAuthored({});
    load(opened(configFor(OPENING_SELECTION, 'repair', [])));
    setFileNotice(null); setCodeView('diff'); setInspectorOpen(false);
    draftsFor(OPENING_SELECTION.taskId);
    share(OPENING_SELECTION);
  }

  function exportReport() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `verification-${config.taskId}-${config.mode}.json`;
    document.body.appendChild(anchor);
    anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    setRefusal(null);
    setFileNotice('Report exported.');
  }

  async function importReport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileNotice(null);
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('The report must be under 2 MB.');
      const next = replay(JSON.parse(await file.text()));
      if (next.config.mode === 'synthesis') setAuthored({ ...authored, [next.config.taskId]: next.config.assertions });
      load({ config: next.config, report: next });
      setSelectedIndex(0);
      draftsFor(next.config.taskId);
      share(selectionOf(next.config));
      setFileNotice('Replayed: the verdict is recomputed from the file’s configuration, not read from it.');
      revealWhenRendered(() => resultsRef?.current ?? null);
    } catch (cause) { refuse(cause, 'file', 'Replay refused: '); }
    event.target.value = '';
  }

  function inspect(index: number) {
    setSelectedIndex(index);
    revealResult(evidenceRef.current);
  }

  const refusalAt = (at: Refusal['at']) => refusal?.at === at && <p className={controls.error} role="alert">{refusal.text}</p>;
  const verdictLabel = !report ? 'Not run'
    : config.mode === 'synthesis' ? report.resolved ? 'Reproduces' : 'Rejected'
    : !report.resolved ? 'Not resolved' : config.scope === 'smoke' ? 'Suite satisfied' : 'Resolved on full suite';

  return <div className={styles.tool}>
    <div className={styles.toolbar}>
      <div className={styles.segmented} aria-label="Verification mode">
        <button type="button" aria-pressed={config.mode === 'repair'} onClick={() => changeMode('repair')}><Code2 size={16} />Code repair</button>
        <button type="button" aria-pressed={config.mode === 'synthesis'} onClick={() => changeMode('synthesis')}><FlaskConical size={16} />Test synthesis</button>
      </div>
      <div className={styles.fileTools} data-file-tools="">
        <div className={styles.actions}>
          <button className={controls.iconButton} onClick={() => importRef.current?.click()} aria-label="Replay JSON report" title="Replay JSON report"><Upload size={18} /><span className={controls.iconLabel}>Replay JSON report</span></button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden aria-label="Import report file" onChange={importReport} />
          <button className={controls.iconButton} onClick={exportReport} disabled={!report} aria-label="Export JSON report" title="Export JSON report"><Download size={18} /><span className={controls.iconLabel}>Export JSON report</span></button>
          <button className={controls.iconButton} onClick={reset} aria-label="Reset verifier" title="Reset verifier: back to where the page opened"><RotateCcw size={18} /><span className={controls.iconLabel}>Reset verifier</span></button>
        </div>
        {refusalAt('file')}
        {/* a live region, not a second status: the verdict is the panel's status */}
        {fileNotice && <p className={controls.hint} aria-live="polite" data-file-notice="">{fileNotice}</p>}
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
              <option value="full">Full · {repairCount} {GROUP_NAMES.repair.toLowerCase()} + {preserveCount} {GROUP_NAMES.preserve.toLowerCase()}</option>
              <option value="smoke">Smoke · 1 {GROUP_NAMES.repair.toLowerCase()} + 1 {GROUP_NAMES.preserve.toLowerCase()}</option>
            </select>
          </label>
        </> : <>
          <p className={styles.muted}>Test synthesis: write the tests yourself. A useful test fails on the buggy function and passes on the fixed one; an already-passing test reproduces nothing, and a wrong expectation is rejected because it fails on the fix too. What you write here is kept for this task when you switch to another.</p>
          <div className={styles.synthesisHeader}><h3>Candidate assertions</h3><button className={controls.iconButton} aria-label="Clear assertions" title="Clear assertions" onClick={() => updateConfig({ assertions: [] })}><Trash2 size={16} /><span className={controls.iconLabel}>Clear assertions</span></button></div>
          <ul className={styles.assertions}>
            {config.assertions.map(assertion => <li key={assertion.id}><span>{assertion.label}</span><button className={controls.iconButton} aria-label={`Remove ${assertion.label}`} title={`Remove ${assertion.label}`} onClick={() => updateConfig({ assertions: config.assertions.filter(item => item.id !== assertion.id) })}><X size={14} /><span className={controls.iconLabel}>{`Remove ${assertion.label}`}</span></button></li>)}
          </ul>
          <p className={styles.muted}>Add a preset: a reproducer that fails before the fix and passes after, a test that already passes, or a broken assertion with a wrong expected value.</p>
          <div className={styles.presets}>
            <button disabled={config.assertions.length >= MAX_ASSERTIONS} onClick={() => addAssertion(task.tests[0].input, task.tests[0].expected, 'run', 'Bug reproducer')}><Plus size={14} />Reproducer</button>
            <button disabled={config.assertions.length >= MAX_ASSERTIONS} onClick={() => addAssertion(task.tests[3].input, task.tests[3].expected, 'run', 'Already passing')}><Plus size={14} />Already passing</button>
            <button disabled={config.assertions.length >= MAX_ASSERTIONS} onClick={() => addAssertion(task.tests[0].input, [], 'run', 'Wrong expectation')}><Plus size={14} />Broken assertion</button>
          </div>
        </>}
        <button className={controls.button} onClick={run}><Play size={16} />{config.mode === 'repair' ? 'Run verification' : 'Run synthesis'}</button>
        {refusalAt('run')}
        <p className={styles.runtime}>Browser evaluation · deterministic, synthetic fixtures.<br />{config.mode === 'synthesis' ? 'Assertions run on baseline and general repair.' : 'Curated functions only; no arbitrary code execution.'}</p>
      </div>
      <div className={styles.results} ref={resultsRef}>
        <div className={styles.verdict} role="status" aria-live="polite">
          <span className={report ? report.resolved ? styles.good : styles.warn : styles.muted}>
            {report ? report.resolved ? <Check size={20} /> : <X size={20} /> : <FlaskConical size={20} />}
            <strong>{verdictLabel}</strong>
          </span>
          <p>{report?.reason ?? 'Awaiting evaluation.'}</p>
        </div>
        <figure className={styles.transitions} aria-label="Baseline-to-after test transitions">
          {TRANSITIONS.map(transition => <div key={transition.key} className={transition.className}>
            <span>{transition.label}</span><strong>{report ? report.counts[transition.field] : '—'}</strong><small>{transition.name}</small>
          </div>)}
        </figure>
        {!report ? <div className={styles.pending}>
          <h3>{config.mode === 'repair' ? 'Selected test suite' : 'Buggy → fixed comparison'}</h3>
          <ol>{(config.mode === 'synthesis' ? config.assertions : config.scope === 'full' ? task.tests : [task.tests[0], task.tests[3]]).map(item => <li key={item.id}>{item.label}</li>)}</ol>
          {config.mode === 'synthesis' && config.assertions.length === 0 && <p>No candidate assertions.</p>}
        </div> : <div className={styles.testList} aria-label="Per-test results">
          <div className={styles.testHeader}><span>Assertion</span><span>Buggy</span><span>{config.mode === 'synthesis' ? 'Fixed' : 'After'}</span></div>
          {report.rows.map((row, index) => <button key={row.id} onClick={() => inspect(index)} aria-label={`Inspect ${row.label}`} aria-pressed={selectedIndex === index}>
            <span><b>{row.label}</b><small>{GROUP_NAMES[row.group]} test</small></span>
            <span className={row.baseline.passed ? styles.good : styles.warn}>{row.baseline.passed ? 'PASS' : 'FAIL'}</span>
            <span className={row.after.passed ? styles.good : styles.bad}>{row.after.passed ? 'PASS' : 'FAIL'}</span>
          </button>)}
        </div>}
        {selectedRow && <section ref={evidenceRef} className={styles.evidence} aria-label="Selected test evidence">
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
      {refusalAt('author')}
    </section>}
    <details className={styles.codePanel} open={inspectorOpen} onToggle={event => setInspectorOpen(event.currentTarget.open)}>
      <summary><Code2 size={17} />Implementation &amp; replacement diff</summary>
      <div className={styles.codeToolbar}><div className={styles.segmented}>
        <button aria-pressed={codeView === 'diff'} onClick={() => setCodeView('diff')}><FileDiff size={16} />Diff</button>
        <button aria-pressed={codeView === 'code'} onClick={() => setCodeView('code')}><Code2 size={16} />Code</button>
      </div><span className={styles.muted}>{config.mode === 'synthesis' ? 'Fixed oracle' : candidate.label}</span></div>
      <p className={styles.codeNote}>Each function as written; the page&apos;s tests run this text against the function it executes, so they cannot differ. The diff compares the whole buggy function with the selected one, not a repository patch, and marks the characters that change.</p>
      {inspectorOpen && (codeView === 'diff'
        ? <SourceDiff taskId={config.taskId} candidateId={activeCandidate} />
        : <pre><code>{implementationSource(config.taskId, activeCandidate)}</code></pre>)}
    </details>
  </div>;
}
