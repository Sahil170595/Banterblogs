'use client';

import { useMemo, useRef, useState } from 'react';
import { Download, Play, RotateCcw, Upload, GitFork, Table2 } from 'lucide-react';
import { analyze, compareGold, exportTrace, freshSession, MAX_TRACE_BYTES, prune, recordedVotes, replayTrace } from '@/lib/projects/spreadsheet-reasoning/engine';
import { ballotProvenance, fixtures } from '@/lib/projects/spreadsheet-reasoning/fixtures';
import { cellId, type Session, type Vote } from '@/lib/projects/spreadsheet-reasoning/types';
import DependencyGraph from './DependencyGraph';
import styles from './inspector.module.css';

const number = (value: number | null) => value === null ? 'Unavailable' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
const percentage = (value: number | null) => value === null ? 'Undefined' : `${(100 * value).toFixed(1)}%`;
const voteMajority = (votes: Vote[]) => {
  const final = votes.filter(v => v === 'final').length, intermediate = votes.filter(v => v === 'intermediate').length;
  return final > intermediate ? 'final' : intermediate > final ? 'intermediate' : 'review';
};

export default function Inspector() {
  const [draft, setDraft] = useState<Session>(() => freshSession());
  const [run, setRun] = useState<Session>(() => freshSession());
  const [selected, setSelected] = useState('Calc!B4');
  const [view, setView] = useState<'graph' | 'table'>('graph');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const result = useMemo(() => analyze(run), [run]);
  const pending = JSON.stringify(draft) !== JSON.stringify(run);
  const score = pending ? null : compareGold(run, result);
  const ballots = pending ? null : recordedVotes(run);
  const cell = draft.workbook.cells.find(c => cellId(c) === selected)!;
  const computed = result.cells[selected];
  const selectedBallots = ballots?.[selected];

  function edit(next: Session) {
    setDraft({ ...next, adjudications: {} });
    setError(''); setNotice('');
  }
  function reset(fixture = draft.fixture) {
    const next = freshSession(fixture);
    setDraft(next); setRun(next); setSelected('Calc!B4'); setError(''); setNotice('');
  }
  function recalculate() {
    try { analyze(draft); setRun(structuredClone(draft)); setError(''); setNotice('Recalculated locally.'); }
    catch (failure) {
      console.error('Spreadsheet session validation failed', failure);
      setError(`Cannot recalculate: ${failure instanceof Error ? failure.message : 'Invalid session'}`);
    }
  }
  function adjudicate(verdict: string) {
    if (pending) return;
    const next = verdict ? prune(run, selected, verdict as 'keep' | 'drop') : { ...run, adjudications: { ...run.adjudications } };
    if (!verdict) delete next.adjudications[selected];
    setDraft(next); setRun(next); setNotice('Adjudication applied.');
  }
  function download() {
    const blob = new Blob([JSON.stringify(exportTrace(run))], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'spreadsheet-reasoning-v1.json'; link.click();
    URL.revokeObjectURL(url);
    setNotice('JSON trace exported.');
  }
  async function replay(upload: File | undefined) {
    if (!upload) return;
    try {
      if (upload.size > MAX_TRACE_BYTES) throw new Error(`Trace exceeds the ${MAX_TRACE_BYTES / 1000} KB limit.`);
      const next = replayTrace(JSON.parse(await upload.text()));
      setRun(next); setDraft(next); setSelected(cellId(next.workbook.cells[0])); setError(''); setNotice('Session replayed; results recomputed, not trusted from the file.');
    } catch (failure) {
      console.error('Spreadsheet replay rejected', failure);
      setError(`Replay rejected: ${failure instanceof Error ? failure.message : 'Invalid JSON trace'}`);
    } finally { if (file.current) file.current.value = ''; }
  }
  return <section id="demo" className={styles.tool} aria-label="Spreadsheet reasoning inspector">
    <div className={styles.toolbar}>
      <label>Synthetic workbook<select aria-label="Synthetic workbook" value={draft.fixture} onChange={e => reset(e.target.value as Session['fixture'])}>
        {Object.entries(fixtures).map(([key, fixture]) => <option value={key} key={key}>{fixture.title}</option>)}
      </select></label>
      <label>Rule policy<select value={draft.policy} onChange={e => edit({ ...draft, policy: e.target.value as Session['policy'] })}>
        <option value="balanced">Balanced votes</option><option value="precision">Precision gate</option>
      </select></label>
      <div className={styles.commands}>
        <button onClick={recalculate}><Play size={16} aria-hidden="true" />Recalculate</button>
        <button onClick={() => reset()} aria-label="Reset workbook" title="Reset workbook"><RotateCcw size={18} aria-hidden="true" /></button>
        <button onClick={download} disabled={pending} aria-label="Export JSON" title="Export JSON"><Download size={18} aria-hidden="true" /></button>
        <button onClick={() => file.current?.click()} aria-label="Replay JSON" title="Replay JSON"><Upload size={18} aria-hidden="true" /></button>
        <input ref={file} type="file" accept=".json,application/json" aria-label="JSON replay file" hidden onChange={e => void replay(e.target.files?.[0])} />
      </div>
    </div>
    <div className={styles.runStatus} aria-live="polite">
      <span className={pending ? styles.pending : styles.ready}>{pending ? 'Pending edits' : 'Computed locally'}</span>
      <span>{pending ? 'Last-run graph; values and evidence withheld until recalculation.' : `${run.workbook.cells.length} candidates / ${result.edges.length} resolved dependency edges / no model calls`}</span>
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.workspace}>
      <div className={styles.dataPane}>
        <div className={styles.paneHeading}>
          <h2>Workbook</h2>
          <div className={styles.segment} aria-label="Workbook view">
            <button aria-label="Dependency graph view" title="Dependency graph" aria-pressed={view === 'graph'} onClick={() => setView('graph')}><GitFork size={17} /></button>
            <button aria-label="Cell table view" title="Cell table" aria-pressed={view === 'table'} onClick={() => setView('table')}><Table2 size={17} /></button>
          </div>
        </div>
        {view === 'graph' && <DependencyGraph workbook={run.workbook} result={result} selected={selected} onSelect={setSelected} />}
        <div className={styles.tableScroll}>
          <table className={styles.cellTable}>
            <caption className={styles.srOnly}>Candidate cells, calculated values and label decisions</caption>
            <thead><tr><th>Cell</th><th>Row label</th><th>Value</th><th>Decision</th></tr></thead>
            <tbody>{draft.workbook.cells.map(item => {
              const id = cellId(item), output = result.cells[id];
              return <tr key={id} className={selected === id ? styles.selectedRow : ''}>
                <td><button aria-label={`Inspect ${id}`} aria-pressed={selected === id} onClick={() => setSelected(id)}>{id}</button></td>
                <td>{item.label}</td><td className={styles.numeric}>{pending ? '-' : output.error ? 'Error' : number(output.value)}</td>
                <td><span className={`${styles.badge} ${pending ? '' : styles[output.label]}`}>{pending ? 'pending' : output.label}</span></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </div>
      <aside className={styles.inspector} aria-label="Selected cell evidence">
        <h2>{selected}</h2>
        <label>Row label<input maxLength={80} value={cell.label} onChange={e => edit({ ...draft, workbook: { ...draft.workbook, cells: draft.workbook.cells.map(c => cellId(c) === selected ? { ...c, label: e.target.value } : c) } })} /></label>
        <label>Value or formula<input maxLength={256} spellCheck={false} className={styles.formula} value={cell.input} onChange={e => edit({ ...draft, workbook: { ...draft.workbook, cells: draft.workbook.cells.map(c => cellId(c) === selected ? { ...c, input: e.target.value } : c) } })} /></label>
        <div className={styles.properties}>
          <label className={styles.checkbox}><input type="checkbox" checked={cell.emphasis} onChange={e => edit({ ...draft, workbook: { ...draft.workbook, cells: draft.workbook.cells.map(c => cellId(c) === selected ? { ...c, emphasis: e.target.checked } : c) } })} />Emphasized</label>
          <label>Sheet role<select value={draft.workbook.sheets.find(s => s.name === cell.sheet)!.role} onChange={e => edit({ ...draft, workbook: { ...draft.workbook, sheets: draft.workbook.sheets.map(s => s.name === cell.sheet ? { ...s, role: e.target.value as 'support' | 'output' } : s) } })}><option value="output">Output</option><option value="support">Support</option></select></label>
        </div>
        {!pending && computed.error && <p role="alert" className={styles.error}>{computed.error}</p>}
        <div className={styles.evidence}>
          <h3>Deterministic evidence</h3>
          {pending ? <p>Evidence pending recalculation.</p> : <>
            <p className={styles.route}>{computed.route}</p>
            <dl><div><dt>Precedents</dt><dd>{computed.precedents.join(', ') || 'None'}</dd></div><div><dt>Consumers</dt><dd>{computed.dependents.join(', ') || 'None'}</dd></div></dl>
            <ul className={styles.voteList}>{computed.votes.map(v => <li key={v.method}><div><span>{v.method}</span><strong className={v.vote === 'abstain' ? '' : styles[v.vote]}>{v.vote}</strong></div><small>{v.evidence}</small></li>)}</ul>
          </>}
        </div>
        <label>Adjudication<select disabled={pending || computed.proposed !== 'final'} value={draft.adjudications[selected] ?? ''} onChange={e => adjudicate(e.target.value)}>
          <option value="">Not adjudicated</option><option value="keep">Keep proposed final</option><option value="drop">Drop to intermediate</option>
        </select></label>
        <p className={styles.small}>Prune-only review of proposed finals. No new final labels are added.</p>
        <div className={styles.evidence}>
          <h3>Illustrative recorded ballots</h3>
          <p className={styles.small}>{ballotProvenance}</p>
          {selectedBallots ? <><div className={styles.ballots}>{selectedBallots.map((vote, index) => <div key={index}><span>Ballot {index + 1}</span><strong className={styles[vote]}>{vote}</strong></div>)}</div><p>Recorded majority: <strong>{voteMajority(selectedBallots)}</strong> / live rules: <strong>{computed.proposed}</strong></p></> : <p className={styles.small}>{ballots ? 'No ballot record for this cell.' : 'Records unavailable for edited or failure workbooks.'}</p>}
        </div>
      </aside>
    </div>
    <section className={styles.score} aria-label="Synthetic gold comparison">
      <div><h2>Synthetic gold comparison</h2><p className={styles.small}>Authored fixture key only. Review counts as not-final; this is not a benchmark or a generalization estimate.</p></div>
      {score ? <><div className={styles.metrics}><div><span>Precision</span><strong>{percentage(score.precision)}</strong></div><div><span>Recall</span><strong>{percentage(score.recall)}</strong></div><div><span>F1</span><strong>{percentage(score.f1)}</strong></div></div><p className={styles.counts}>{`TP ${score.tp} / FP ${score.fp} / FN ${score.fn} / TN ${score.tn}`}</p><p className={styles.small}>{score.review} unresolved review cells</p></> : <p>Gold comparison unavailable: pending edits, changed workbook, or no authored key.</p>}
    </section>
    <p className={styles.small} aria-live="polite">{notice || 'Synthetic data / bounded arithmetic / browser-only evaluation'}</p>
  </section>;
}
