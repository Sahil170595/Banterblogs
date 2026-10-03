'use client';

import { useRef, useState } from 'react';
import { Check, Download, Play, RotateCcw, ShieldCheck, Upload } from 'lucide-react';
import { evaluate, exportRun, replayRun, type Evaluation } from '@/lib/projects/intake-policy/engine';
import { CASES } from '@/lib/projects/intake-policy/cases';
import { DEFAULT_CASE, DEFAULT_POLICY, fieldLabels, programLabels, requestLabels, requestOptions, routeLabels,
  type CaseFeatures, type Policy } from '@/lib/projects/intake-policy/model';
import styles from './intake.module.css';

const MAX_FILE_BYTES = 1_000_000;
const statusLabels = { eligible: 'Eligible (synthetic flag)', excluded: 'Excluded (synthetic flag)', expired: 'Expired (synthetic flag)', unknown: 'Unknown' };
const policyControls: { key: keyof Policy; label: string; min: number; max: number }[] = [
  { key: 'todayWeight', label: 'Today + action weight', min: 0, max: 6 },
  { key: 'complaintWeight', label: 'Complaint + time weight', min: 0, max: 3 },
  { key: 'noticeWeight', label: 'Notice weight', min: -3, max: 0 },
  { key: 'promotionWeight', label: 'Promotion weight', min: -6, max: -1 },
  { key: 'fastThreshold', label: 'P1 threshold', min: 2, max: 6 },
  { key: 'lowThreshold', label: 'P3 threshold', min: -6, max: -1 },
];
const priorityLabels = { P0: 'Categorical safety review', P1: 'Prioritized review', P2: 'Standard review', P3: 'Low operational priority' };

export default function IntakeLab() {
  const [draft, setDraft] = useState<CaseFeatures>({ ...DEFAULT_CASE });
  const [policy, setPolicy] = useState<Policy>({ ...DEFAULT_POLICY });
  const [result, setResult] = useState(() => evaluate());
  const [preset, setPreset] = useState('ready');
  const [error, setError] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(result.features) || JSON.stringify(policy) !== JSON.stringify(result.policy);
  const update = <K extends keyof CaseFeatures>(key: K, value: CaseFeatures[K]) => { revision.current++; setDraft(d => ({ ...d, [key]: value })); setPreset('custom'); setError(''); setExportStatus(''); };

  function run() {
    revision.current++;
    try { setResult(evaluate(draft, policy)); setError(''); setExportStatus(''); }
    catch (err) { console.error('Intake policy evaluation rejected inputs', err); setError(err instanceof Error ? err.message : 'Evaluation failed. Check case and policy fields.'); }
  }
  function reset() {
    revision.current++;
    setDraft({ ...DEFAULT_CASE }); setPolicy({ ...DEFAULT_POLICY }); setResult(evaluate()); setPreset('ready'); setError(''); setExportStatus('');
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportRun(result), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'intake-policy-v1.json'; link.click(); URL.revokeObjectURL(url); setExportStatus('Applied result exported');
  }
  async function upload(file?: File) {
    if (!file) return;
    const requestRevision = ++revision.current;
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('Receipt exceeds the 1 MB import limit.');
      const contents = await file.text();
      if (requestRevision !== revision.current) return;
      const r = replayRun(JSON.parse(contents)); setResult(r); setDraft(r.features); setPolicy(r.policy); setPreset('custom'); setError(''); setExportStatus('Receipt replayed and verified');
    } catch (err) {
      console.error('Intake receipt import rejected', err);
      if (requestRevision === revision.current) setError(err instanceof Error ? err.message : 'Could not replay this receipt.');
    }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  }

  return <section id="demo" className={styles.lab} aria-label="Synthetic intake-policy workbench">
    <div className={styles.toolbar}>
      <label>Synthetic case<select value={preset} onChange={e => {
        const found = CASES.find(c => c.id === e.target.value);
        if (found) { revision.current++; setDraft(found.features); setPreset(found.id); setError(''); setExportStatus(''); }
      }}>{preset === 'custom' && <option value="custom">Custom categorical case</option>}{CASES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <span role="status" className={dirty ? styles.unapplied : styles.applied}>{dirty ? 'Unapplied changes' : 'Applied snapshot / synthetic only'}</span>
      <div className={styles.commands}>
        <button onClick={run} className={styles.run}><Play size={16} aria-hidden />Evaluate</button>
        <button className={styles.iconButton} aria-label="Reset case and policy" title="Reset case and policy" onClick={reset}><RotateCcw size={17} /></button>
        <button className={styles.iconButton} aria-label="Export applied result" title="Export applied result" onClick={download}><Download size={17} /></button>
        <button className={styles.iconButton} aria-label="Import and replay receipt" title="Import and replay receipt" onClick={() => fileInput.current?.click()}><Upload size={17} /></button>
        <input className={styles.fileInput} ref={fileInput} type="file" accept="application/json,.json" aria-label="Receipt file" onChange={e => void upload(e.target.files?.[0])} />
      </div>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <span className={styles.srOnly} role="status">{exportStatus}</span>
    <div className={styles.workspace}>
      <form className={styles.controls} onSubmit={e => { e.preventDefault(); run(); }}>
        <h2>Case signals</h2>
        <label>Request category<select value={draft.request} onChange={e => update('request', e.target.value as CaseFeatures['request'])}>{requestOptions.map(r => <option key={r} value={r}>{requestLabels[r]}</option>)}</select></label>
        <label>Deadline signal<select value={draft.deadline} onChange={e => update('deadline', e.target.value as CaseFeatures['deadline'])}><option value="none">No deadline</option><option value="today">Today</option><option value="soon">Time element, not today</option></select></label>
        <label className={styles.check}><input type="checkbox" checked={draft.actionRequired} onChange={e => update('actionRequired', e.target.checked)} />Required action</label>
        <fieldset><legend>Synthetic safety flags</legend>
          <label>Advisory flag<select value={draft.safety} onChange={e => update('safety', e.target.value as CaseFeatures['safety'])}><option value="none">None</option><option value="possible">Possible</option><option value="clear">Clear</option></select></label>
          <label className={styles.check}><input type="checkbox" checked={draft.careRelated} onChange={e => update('careRelated', e.target.checked)} />Care-related context</label>
          <label className={styles.check}><input type="checkbox" checked={draft.backstop} onChange={e => update('backstop', e.target.checked)} />Independent backstop flag</label>
        </fieldset>
        <details><summary>Intake and account evidence</summary><div className={styles.disclosure}>
          <fieldset><legend>Reference presence</legend>{Object.entries(fieldLabels).map(([key, label]) => <label key={key} className={styles.check}><input type="checkbox" checked={draft.fields[key as keyof CaseFeatures['fields']]} onChange={e => update('fields', { ...draft.fields, [key]: e.target.checked })} />{label}</label>)}</fieldset>
          <label>Record association<select value={draft.knownRecord} onChange={e => update('knownRecord', e.target.value as CaseFeatures['knownRecord'])}><option value="none">No known record</option><option value="matched">Unambiguous synthetic match</option><option value="ambiguous">Ambiguous match</option></select></label>
          <label>Document account flag<select value={draft.documentStatus} onChange={e => update('documentStatus', e.target.value as CaseFeatures['documentStatus'])}>{Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>Record account flag<select value={draft.recordStatus} onChange={e => update('recordStatus', e.target.value as CaseFeatures['recordStatus'])}>{Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>Program<select value={draft.program} onChange={e => update('program', e.target.value as CaseFeatures['program'])}>{Object.entries(programLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>Language request<select value={draft.language} onChange={e => update('language', e.target.value as CaseFeatures['language'])}><option value="primary">Primary</option><option value="alternate">Alternate / translation review</option></select></label>
          <label className={styles.check}><input type="checkbox" checked={draft.shout} onChange={e => update('shout', e.target.checked)} />Urgent wording flag</label>
        </div></details>
        <details><summary>Advanced operational policy</summary><div className={styles.disclosure}>
          {policyControls.map(c => <label key={c.key}>{c.label}<input type="number" min={c.min} max={c.max} step="1" value={Number.isFinite(policy[c.key]) ? policy[c.key] : ''} onChange={e => { revision.current++; setPolicy(p => ({ ...p, [c.key]: e.target.valueAsNumber })); setError(''); setExportStatus(''); }} /></label>)}
          <p className={styles.muted}>Synthetic policy v1. Categorical safety gates are fixed.</p>
        </div></details>
      </form>
      <div className={styles.result}>
        <div className={styles.resultHeading}><span className={styles.eyebrow}>Applied result</span><span><ShieldCheck size={15} aria-hidden />Human review required</span></div>
        <div className={styles.outcome}>
          <output aria-label="Applied priority" className={`${styles.priority} ${result.priority === 'P0' ? styles.critical : ''}`}>{result.priority}</output>
          <div><h2>{priorityLabels[result.priority]}</h2><p>{routeLabels[result.route]}</p><span>{result.classification} / {result.gate}</span></div>
          <span className={styles.effectCount}>0 external effects</span>
        </div>
        <div className={styles.path} aria-label="Decision path">{['validate', 'safety', 'score', 'classify', 'route', 'draft'].map(stage => {
          const entries = result.trace.filter(t => t.stage === stage);
          const skipped = entries.every(t => t.status === 'skipped');
          return <div key={stage} className={skipped ? styles.skippedStage : ''}><span>{stage}</span><strong>{skipped ? 'skipped' : entries.some(t => t.status === 'blocked') ? 'guarded' : 'complete'}</strong></div>;
        })}</div>
        <ScoreEvidence result={result} />
        <div className={styles.evidenceGrid}>
          <section><h3>Routing evidence</h3><dl>
            <div><dt>Missing references</dt><dd>{result.missing.map(m => fieldLabels[m]).join(', ') || 'None on this route'}</dd></div>
            <div><dt>Record association</dt><dd>{result.features.knownRecord}</dd></div>
            <div><dt>Record account flag</dt><dd>{result.features.recordStatus}</dd></div>
            <div><dt>Conflicting flags</dt><dd>{result.conflict ? 'Yes; reconciliation needed' : 'No detected conflict'}</dd></div>
          </dl><h3>Local resource preview</h3>{result.resources.length ? result.resources.map(r => <div key={r.id} className={styles.resource}><strong>{r.id}</strong><span>{r.openings} synthetic openings</span><small>{programLabels[r.program]} / {r.language}</small></div>) : <p className={styles.muted}>No matching preview. No resource reserved.</p>}</section>
          <section><h3>Unsent draft evidence</h3>{result.draft ? <><div className={styles.draftMeta}><span>Template / {result.draft.template}</span><span>{result.draft.translationRequired ? 'Translation review needed' : 'Primary-language template'}</span></div><p className={styles.draftText}>{result.draft.text}</p><span className={styles.muted}>Approval required / not sent</span></> : <p className={styles.muted}>No outbound draft proposed.</p>}</section>
        </div>
        <div className={styles.plan}><h3>Proposed work</h3>{result.plan.map(p => <div key={p.id}><Check size={15} aria-hidden /><span><strong>{p.label}</strong><small>{p.mode} / {p.evidence.join(', ')}</small></span></div>)}</div>
      </div>
    </div>
    <section className={styles.trace}><h2>Decision trace</h2><div className={styles.tableWrap}><table><caption>Applied rule evidence; all effects are local calculations or proposals.</caption><thead><tr><th>Rule</th><th>State</th><th>Evidence</th><th>Result</th></tr></thead><tbody>{result.trace.map(t => <tr key={t.index}><th scope="row">{t.rule}<small>{t.stage}</small></th><td>{t.status}</td><td>{t.evidence}</td><td>{t.effect}</td></tr>)}</tbody></table></div>
      <details><summary>Applied features and policy snapshot</summary><pre>{JSON.stringify({ features: result.features, policy: result.policy }, null, 2)}</pre></details>
    </section>
  </section>;
}

function ScoreEvidence({ result }: { result: Evaluation }) {
  return <section className={styles.scoreEvidence}><div className={styles.scoreHeading}><h3>Operational contributions</h3><output aria-label="Applied operational score">{result.operationalScore === null ? 'Bypassed' : `Score ${result.operationalScore}`}</output></div>
    <div className={styles.contributions}>{result.contributions.map(c => <div key={c.label} className={!c.active || result.operationalScore === null ? styles.inactive : ''}><span>{c.label}</span><div className={styles.weightTrack}><span className={c.value < 0 ? styles.negativeWeight : styles.positiveWeight} style={{ width: `${Math.abs(c.value) / 6 * 100}%` }} /></div><strong>{result.operationalScore === null ? '-' : c.active ? `${c.value >= 0 ? '+' : ''}${c.value}` : '0'}</strong></div>)}</div>
  </section>;
}
